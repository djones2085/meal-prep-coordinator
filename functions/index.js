const admin = require("firebase-admin");
// Use v2 imports for specific function types
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions"); // Use logger module

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp(); // Removed assignment to unused 'app'
}
const db = admin.firestore();

// --- Internal Helper Function for Aggregation Logic ---
/**
 * Performs the core aggregation logic for a given meal cycle ID.
 * Fetches recipe, orders, user data, calculates totals, and updates the cycle document.
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
      logger.warn(`(_performAggregation) Cycle ${mealCycleId} already has an aggregationTimestamp. Skipping.`);
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
      logger.log(`(_performAggregation) No orders found for cycle ${mealCycleId}. Updating cycle with zeros.`);
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
      logger.log(`(_performAggregation) No *valid* orders found for cycle ${mealCycleId} after filtering. Updating with zeros.`);
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
    throw error;
  }
}
// --- End Helper Function ---


/* Commented out Pub/Sub triggered function
exports.aggregateMealCycleOrders = functions.pubsub.topic('aggregate-orders')...
*/

/**
 * Scheduled function (v2) to run every Thursday at 12:00 PM (America/Chicago timezone).
 * Finds meal cycles ready for aggregation and performs the order aggregation.
 */
exports.scheduledAggregateOrders = onSchedule({
  schedule: "0 12 * * 4", // Standard cron syntax
  timeZone: "America/Chicago",
}, async (_context) => { // Use _context as context is unused
  logger.log("(Scheduled) Function running.");

  try {
    const cyclesRef = db.collection("mealCycles");
    const querySnapshot = await cyclesRef
      .where("status", "==", "ordering_closed")
      .where("aggregationTimestamp", "==", null)
      .orderBy("orderDeadline", "desc")
      .get();

    if (querySnapshot.empty) {
      logger.log("(Scheduled) No meal cycles found ready for aggregation.");
      return null;
    }

    logger.log(`(Scheduled) Found ${querySnapshot.size} cycle(s) to aggregate.`);

    for (const cycleDoc of querySnapshot.docs) {
      const mealCycleId = cycleDoc.id;
      try {
        await _performAggregation(mealCycleId);
      } catch (error) {
        logger.error(`(Scheduled) Failed to aggregate cycle ${mealCycleId}:`, error);
      }
    }
  } catch (error) {
    logger.error("(Scheduled) Error querying for cycles:", error);
  }

  return null;
});


/**
 * HTTPS Callable function (v2) for admins to manually trigger aggregation.
 */
exports.requestManualAggregation = onCall(async (request) => {
  // 1. Authentication Check (v2 automatically checks context.auth)
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const userId = request.auth.uid;
  const mealCycleId = request.data.mealCycleId; // Data is in request.data

  if (!mealCycleId) {
    throw new HttpsError("invalid-argument", "The function must be called with a 'mealCycleId' argument.");
  }

  logger.log(`(Manual) Aggregation request received for cycle ${mealCycleId} from user ${userId}`);

  // 2. Authorization Check
  try {
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError("not-found", "User document not found.");
    }
    const userData = userSnap.data();
    if (!userData.roles || !Array.isArray(userData.roles) || !userData.roles.includes("admin")) {
      throw new HttpsError("permission-denied", "User does not have admin privileges.");
    }
  } catch (error) {
    logger.error(`(Manual) Authorization check failed for user ${userId}:`, error);
    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError("internal", "Could not verify user permissions.");
    }
  }

  // 3. Perform Aggregation using Helper Function
  try {
    await _performAggregation(mealCycleId);
    logger.log(`(Manual) Successfully triggered and completed aggregation for cycle ${mealCycleId}.`);
    return { success: true, message: `Aggregation successful for cycle ${mealCycleId}.` };
  } catch (error) {
    logger.error(`(Manual) Aggregation failed for cycle ${mealCycleId}:`, error);
    // Use HttpsError for client-facing errors
    throw new HttpsError(
      "internal",
      `Aggregation failed: ${error.message || "Unknown error"}`,
    );
  }
});

// Original PubSub function remains commented out

