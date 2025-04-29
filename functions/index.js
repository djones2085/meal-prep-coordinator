const admin = require("firebase-admin");
// Use v2 imports for specific function types
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { HttpsError } = require("firebase-functions/v2/https"); // Keep HttpsError if needed elsewhere, maybe in future triggers
const { logger } = require("firebase-functions"); // Use logger module
const { onDocumentWritten } = require("firebase-functions/v2/firestore"); // Keep Firestore trigger import

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// --- Internal Helper Function for Aggregation Logic ---
/**
 * Performs the core aggregation logic for a given meal cycle ID.
 * Fetches recipe, orders, user data, calculates totals, and updates the cycle document.
 * Sets the aggregationTimestamp.
 * @param {string} mealCycleId The ID of the meal cycle to aggregate.
 * @return {Promise<void>} Resolves on successful aggregation, throws on error.
 */
async function _performAggregation(mealCycleId) {
  logger.log(`(_performAggregation) Starting aggregation for cycle ${mealCycleId}`);
  const cycleRef = db.collection("mealCycles").doc(mealCycleId);

  try {
    const cycleSnap = await cycleRef.get();
    if (!cycleSnap.exists) {
      logger.error(`(_performAggregation) Meal Cycle ${mealCycleId} not found.`);
      throw new Error(`Meal Cycle ${mealCycleId} not found.`);
    }
    const cycleData = cycleSnap.data();
    logger.log(`(_performAggregation) Processing cycle: ${cycleData.chosenRecipe?.recipeName || "Unnamed Cycle"}`);

    if (cycleData.aggregationTimestamp) {
      logger.warn(`(_performAggregation) Cycle ${mealCycleId} already has an aggregationTimestamp. Skipping full aggregation.`);
      // Even if timestamp exists, maybe we *should* recalculate here?
      // For now, we keep the original logic: skip if already aggregated.
      return;
    }

    const recipeId = cycleData.chosenRecipe?.recipeId;
    if (!recipeId) {
      logger.error(`(_performAggregation) Meal Cycle ${mealCycleId} has no chosenRecipe.recipeId.`);
      throw new Error(`Meal Cycle ${mealCycleId} has no chosenRecipe.recipeId.`);
    }
    const recipeRef = db.collection("recipes").doc(recipeId);
    const recipeSnap = await recipeRef.get();
    if (!recipeSnap.exists) {
      logger.error(`(_performAggregation) Recipe ${recipeId} for cycle ${mealCycleId} not found.`);
      throw new Error(`Recipe ${recipeId} for cycle ${mealCycleId} not found.`);
    }
    const recipeData = recipeSnap.data();
    const recipeIngredients = recipeData.ingredients || [];

    const ordersRef = db.collection("orders");
    const ordersQuery = ordersRef.where("cycleId", "==", mealCycleId);
    const ordersSnapshot = await ordersQuery.get();

    if (ordersSnapshot.empty) {
      logger.log(`(_performAggregation) No orders found for cycle ${mealCycleId}. Updating cycle with zeros and timestamp.`);
      await cycleRef.update({
        totalMealCounts: 0,
        totalCountsByProtein: {},
        totalIngredients: [],
        dineInContainers: 0,
        carryOutContainers: 0,
        aggregationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    logger.log(`(_performAggregation) Found ${ordersSnapshot.size} orders for cycle ${mealCycleId}.`);

    let totalOverallServings = 0;
    const totalCountsByProtein = {};
    const aggregatedIngredients = {};
    let dineInContainers = 0;
    let carryOutContainers = 0;

    const userFetchPromises = [];
    const validOrderDocs = [];
    ordersSnapshot.docs.forEach((orderDoc) => {
      const orderData = orderDoc.data();
      if (!orderData.userId || !orderData.totalServings || orderData.totalServings <= 0 || !orderData.items) {
        logger.warn(`(_performAggregation) Skipping order ${orderDoc.id}: missing userId, items, or invalid/zero totalServings.`);
      } else {
        validOrderDocs.push(orderDoc);
        userFetchPromises.push(db.collection("users").doc(orderData.userId).get());
      }
    });

    if (validOrderDocs.length === 0) {
      logger.log(`(_performAggregation) No *valid* orders found for cycle ${mealCycleId} after filtering. Updating with zeros and timestamp.`);
      await cycleRef.update({
        totalMealCounts: 0,
        totalCountsByProtein: {},
        totalIngredients: [],
        dineInContainers: 0,
        carryOutContainers: 0,
        aggregationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const userSnaps = await Promise.all(userFetchPromises);
    const userMap = new Map(userSnaps.map((snap) => [snap.id, snap.exists ? snap.data() : null]));

    for (const orderDoc of validOrderDocs) {
      const orderData = orderDoc.data();
      const userId = orderData.userId;
      const orderTotalServings = orderData.totalServings;

      totalOverallServings += orderTotalServings;

      let locationStatus = "carry_out";
      const userData = userMap.get(userId);
      if (userData) {
        locationStatus = userData.locationStatus || "carry_out";
      } else {
        logger.warn(`(_performAggregation) User ${userId} for order ${orderDoc.id} not found. Defaulting locationStatus.`);
      }

      if (locationStatus === "dine_in") {
        dineInContainers += orderTotalServings;
      } else {
        carryOutContainers += orderTotalServings;
      }

      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach((item) => {
          const proteinName = item.protein || "default";
          const quantity = item.quantity || 0;

          if (quantity <= 0) return;

          totalCountsByProtein[proteinName] = (totalCountsByProtein[proteinName] || 0) + quantity;

          recipeIngredients.forEach((ingredient) => {
            if (!ingredient.name || !ingredient.unit || ingredient.quantity == null || ingredient.quantity <= 0) {
              return;
            }
            const quantityNeeded = ingredient.quantity * quantity;
            const key = `${ingredient.name.toLowerCase().trim()}_${ingredient.unit.toLowerCase().trim()}`;

            if (aggregatedIngredients[key]) {
              aggregatedIngredients[key].quantity += quantityNeeded;
            } else {
              aggregatedIngredients[key] = {
                name: ingredient.name,
                quantity: quantityNeeded,
                unit: ingredient.unit,
              };
            }
          });
        });
      }
    }

    const totalIngredientsArray = Object.values(aggregatedIngredients);

    await cycleRef.update({
      totalMealCounts: totalOverallServings,
      totalCountsByProtein: totalCountsByProtein,
      totalIngredients: totalIngredientsArray,
      dineInContainers: dineInContainers,
      carryOutContainers: carryOutContainers,
      aggregationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.log(`(_performAggregation) Successfully aggregated orders for meal cycle ${mealCycleId}.`);
  } catch (error) {
    logger.error(`(_performAggregation) Error during aggregation for cycle ${mealCycleId}:`, error);
    throw error; // Re-throw to be caught by caller
  }
}
// --- End Aggregation Helper ---

// --- Helper Function for Real-time Recalculation (Includes Ingredients) ---
/**
 * Recalculates totals AND ingredients for a given meal cycle based on current orders.
 * Fetches the cycle, associated recipe, all orders, calculates totals/ingredients, and updates the cycle document.
 * Does NOT modify the aggregationTimestamp.
 * @param {string} mealCycleId The ID of the meal cycle to recalculate.
 * @return {Promise<void>} Resolves on successful recalculation, logs errors.
 */
async function _recalculateCycleTotalsAndIngredients(mealCycleId) {
  logger.log(`(_recalculateCycleTotalsAndIngredients) Recalculating totals & ingredients for cycle ${mealCycleId}`);
  const cycleRef = db.collection("mealCycles").doc(mealCycleId);

  try {
    // 1. Get Cycle Data (to find the recipe ID)
    const cycleSnap = await cycleRef.get();
    if (!cycleSnap.exists) {
      logger.error(`(_recalculateCycleTotalsAndIngredients) Meal Cycle ${mealCycleId} not found.`);
      return; // Exit if cycle doesn't exist
    }
    const cycleData = cycleSnap.data();

    // 2. Get Recipe Data
    const recipeId = cycleData.chosenRecipe?.recipeId;
    if (!recipeId) {
      logger.error(`(_recalculateCycleTotalsAndIngredients) Meal Cycle ${mealCycleId} has no chosenRecipe.recipeId. Cannot recalculate ingredients.`);
      // Optional: Recalculate only counts/containers if recipe missing?
      // For now, we'll exit if we can't get the recipe.
      return;
    }
    const recipeRef = db.collection("recipes").doc(recipeId);
    const recipeSnap = await recipeRef.get();
    if (!recipeSnap.exists) {
      logger.error(`(_recalculateCycleTotalsAndIngredients) Recipe ${recipeId} for cycle ${mealCycleId} not found. Cannot recalculate ingredients.`);
      // Optional: Recalculate only counts/containers if recipe missing?
      return;
    }
    const recipeIngredients = recipeSnap.data().ingredients || [];


    // 3. Get All Orders for the Cycle
    const ordersRef = db.collection("orders");
    const ordersQuery = ordersRef.where("cycleId", "==", mealCycleId);
    const ordersSnapshot = await ordersQuery.get();

    // --- Recalculation Logic ---
    let totalOverallServings = 0;
    const totalCountsByProtein = {};
    const aggregatedIngredients = {}; // Reset for recalculation
    let dineInContainers = 0;
    let carryOutContainers = 0;

    // Fetch associated user data for locationStatus
    const userFetchPromises = [];
    const validOrderDocs = [];
    ordersSnapshot.docs.forEach((orderDoc) => {
      const orderData = orderDoc.data();
      if (orderData.userId && orderData.items && Array.isArray(orderData.items) && orderData.totalServings > 0) {
        validOrderDocs.push(orderDoc);
        userFetchPromises.push(db.collection("users").doc(orderData.userId).get());
      } else {
        logger.warn(`(_recalculateCycleTotalsAndIngredients) Skipping order ${orderDoc.id} due to missing/invalid data.`);
      }
    });

    const userSnaps = await Promise.all(userFetchPromises);
    const userMap = new Map(userSnaps.map((snap) => [snap.id, snap.exists ? snap.data() : null]));

    for (const orderDoc of validOrderDocs) {
      const orderData = orderDoc.data();
      const userId = orderData.userId;
      const orderTotalServings = orderData.totalServings;

      totalOverallServings += orderTotalServings;

      // Determine container type
      let locationStatus = "carry_out";
      const userData = userMap.get(userId);
      if (userData) {
        locationStatus = userData.locationStatus || "carry_out";
      }

      if (locationStatus === "dine_in") {
        dineInContainers += orderTotalServings;
      } else {
        carryOutContainers += orderTotalServings;
      }

      // Aggregate protein counts AND ingredients
      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach((item) => {
          const proteinName = item.protein || "default";
          const quantity = item.quantity || 0;

          if (quantity <= 0) return;

          // Aggregate protein counts
          totalCountsByProtein[proteinName] = (totalCountsByProtein[proteinName] || 0) + quantity;

          // Aggregate ingredients based on recipe and order item quantity
          recipeIngredients.forEach((ingredient) => {
            if (!ingredient.name || !ingredient.unit || ingredient.quantity == null || ingredient.quantity <= 0) {
              return; // Skip invalid recipe ingredients
            }
            const quantityNeeded = ingredient.quantity * quantity; // Multiply ingredient qty by order item qty
            const key = `${ingredient.name.toLowerCase().trim()}_${ingredient.unit.toLowerCase().trim()}`;

            if (aggregatedIngredients[key]) {
              aggregatedIngredients[key].quantity += quantityNeeded;
            } else {
              aggregatedIngredients[key] = {
                name: ingredient.name,
                quantity: quantityNeeded,
                unit: ingredient.unit,
              };
            }
          });
        });
      }
    }

    const totalIngredientsArray = Object.values(aggregatedIngredients);

    // --- Update Meal Cycle Document ---
    logger.log(`(_recalculateCycleTotalsAndIngredients) Updating cycle ${mealCycleId} with: Servings=${totalOverallServings}, Proteins=${JSON.stringify(totalCountsByProtein)}, Ingredients Count=${totalIngredientsArray.length}, DineIn=${dineInContainers}, CarryOut=${carryOutContainers}`);
    await cycleRef.update({
      totalMealCounts: totalOverallServings,
      totalCountsByProtein: totalCountsByProtein,
      totalIngredients: totalIngredientsArray, // Update ingredients
      dineInContainers: dineInContainers,
      carryOutContainers: carryOutContainers,
      aggregationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.log(`(_recalculateCycleTotalsAndIngredients) Successfully recalculated totals and ingredients for meal cycle ${mealCycleId}.`);
  } catch (error) {
    logger.error(`(_recalculateCycleTotalsAndIngredients) Error during recalculation for cycle ${mealCycleId}:`, error);
    // Don't re-throw here, just log, as this is a background trigger
  }
}
// --- End Recalculation Helper ---

/**
 * Scheduled function (v2) to run every Thursday at 12:00 PM (America/Chicago timezone).
 * Finds meal cycles ready for aggregation and performs the order aggregation.
 */
exports.scheduledAggregateOrders = onSchedule({
  schedule: "0 12 * * 4", // Standard cron syntax
  timeZone: "America/Chicago",
}, async (_context) => {
  logger.log("(Scheduled) Function running.");

  try {
    const cyclesRef = db.collection("mealCycles");
    // Look for cycles that are 'ordering_closed' and haven't been aggregated yet
    const querySnapshot = await cyclesRef
      .where("status", "==", "ordering_closed")
      .where("aggregationTimestamp", "==", null) // Check if aggregation has run
      .orderBy("orderDeadline", "desc") // Process most recent deadlines first
      .get();

    if (querySnapshot.empty) {
      logger.log("(Scheduled) No meal cycles found ready for aggregation.");
      return null;
    }

    logger.log(`(Scheduled) Found ${querySnapshot.size} cycle(s) to aggregate.`);
    const aggregationPromises = querySnapshot.docs.map((cycleDoc) =>
      _performAggregation(cycleDoc.id).catch((error) => { // Use helper and catch individual errors
        logger.error(`(Scheduled) Failed to aggregate cycle ${cycleDoc.id}:`, error);
        // Decide if you want to handle the error further, e.g., update cycle status to 'aggregation_failed'
        // For now, just log and continue with others
      }),
    );

    await Promise.all(aggregationPromises); // Wait for all aggregations to attempt
    logger.log("(Scheduled) Finished processing cycles for aggregation.");
  } catch (error) {
    logger.error("(Scheduled) Error querying for cycles:", error);
    // Depending on the error, you might want more specific handling
  }

  return null;
});

// --- Firestore Trigger for Real-time Updates ---
exports.updateCycleTotalsOnOrderWrite = onDocumentWritten("orders/{orderId}", async (event) => {
  const dataBefore = event.data?.before.data();
  const dataAfter = event.data?.after.data();
  const cycleId = dataAfter?.cycleId || dataBefore?.cycleId;

  if (!cycleId) {
    logger.log("(updateCycleTotalsOnOrderWrite) No cycleId found. Skipping recalculation.");
    return;
  }

  logger.log(`(updateCycleTotalsOnOrderWrite) Order write detected for cycle ${cycleId}. Triggering recalculation.`);

  try {
    // Call the *new* helper function that includes ingredient recalculation
    await _recalculateCycleTotalsAndIngredients(cycleId);
  } catch (error) {
    logger.error(`(updateCycleTotalsOnOrderWrite) Error calling _recalculateCycleTotalsAndIngredients for cycle ${cycleId}:`, error);
  }
});
// --- End Firestore Trigger ---

