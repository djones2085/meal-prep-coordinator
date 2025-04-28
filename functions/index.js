const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK only once
let app;
if (admin.apps.length === 0) {
  app = admin.initializeApp();
} else {
  app = admin.app();
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
  functions.logger.log(`(_performAggregation) Starting aggregation for cycle ${mealCycleId}`);
  const cycleRef = db.collection("mealCycles").doc(mealCycleId);

  try {
    const cycleSnap = await cycleRef.get();
    if (!cycleSnap.exists) {
      functions.logger.error(`(_performAggregation) Meal Cycle ${mealCycleId} not found.`);
      throw new Error(`Meal Cycle ${mealCycleId} not found.`); // Throw error to be caught by caller
    }
    const cycleData = cycleSnap.data();
    functions.logger.log(`(_performAggregation) Processing cycle: ${cycleData.chosenRecipe?.recipeName || "Unnamed Cycle"}`);

    // Check if already aggregated (to prevent redundant work)
    if (cycleData.aggregationTimestamp) {
      functions.logger.warn(`(_performAggregation) Cycle ${mealCycleId} already has an aggregationTimestamp. Skipping.`);
      // Consider this a success from the caller's perspective if just preventing re-run
      // Or throw a specific error if re-aggregation is explicitly disallowed
      return; // Exit gracefully
    }

    const recipeId = cycleData.chosenRecipe?.recipeId;
    if (!recipeId) {
      functions.logger.error(`(_performAggregation) Meal Cycle ${mealCycleId} has no chosenRecipe.recipeId.`);
      throw new Error(`Meal Cycle ${mealCycleId} has no chosenRecipe.recipeId.`);
    }
    const recipeRef = db.collection("recipes").doc(recipeId);
    const recipeSnap = await recipeRef.get();
    if (!recipeSnap.exists) {
      functions.logger.error(`(_performAggregation) Recipe ${recipeId} for cycle ${mealCycleId} not found.`);
      throw new Error(`Recipe ${recipeId} for cycle ${mealCycleId} not found.`);
    }
    const recipeData = recipeSnap.data();
    const recipeIngredients = recipeData.ingredients || [];

    const ordersRef = db.collection("orders");
    const ordersQuery = ordersRef.where("cycleId", "==", mealCycleId);
    const ordersSnapshot = await ordersQuery.get();

    if (ordersSnapshot.empty) {
      functions.logger.log(`(_performAggregation) No orders found for cycle ${mealCycleId}. Updating cycle with zeros.`);
      await cycleRef.update({
        totalMealCounts: 0,
        totalIngredients: [],
        dineInContainers: 0,
        carryOutContainers: 0,
        aggregationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        // Optionally update status here as well
      });
      return; // Successful aggregation (of zero orders)
    }

    functions.logger.log(`(_performAggregation) Found ${ordersSnapshot.size} orders for cycle ${mealCycleId}.`);

    let totalServings = 0;
    const aggregatedIngredients = {};
    let dineInContainers = 0;
    let carryOutContainers = 0;

    const userFetchPromises = [];
    const validOrderDocs = []; // Keep track of orders needing user data
    ordersSnapshot.docs.forEach((orderDoc) => {
      const orderData = orderDoc.data();
      if (!orderData.userId || !orderData.servings || orderData.servings <= 0) {
        functions.logger.warn(`(_performAggregation) Skipping order ${orderDoc.id}: missing userId or invalid servings.`);
      } else {
        validOrderDocs.push(orderDoc);
        userFetchPromises.push(db.collection("users").doc(orderData.userId).get());
      }
    });

    const userSnaps = await Promise.all(userFetchPromises);
    const userMap = new Map(userSnaps.map((snap) => [snap.id, snap.exists ? snap.data() : null])); // Handle case where user doc might not exist

    for (const orderDoc of validOrderDocs) {
      const orderData = orderDoc.data();
      const userId = orderData.userId;
      const servingsOrdered = orderData.servings;

      totalServings += servingsOrdered;

      let locationStatus = "carry_out"; // Default
      const userData = userMap.get(userId);
      if (userData) {
        locationStatus = userData.locationStatus || "carry_out";
      } else {
        functions.logger.warn(`(_performAggregation) User ${userId} for order ${orderDoc.id} not found. Defaulting locationStatus.`);
      }

      if (locationStatus === "dine_in") {
        dineInContainers += servingsOrdered;
      } else {
        carryOutContainers += servingsOrdered;
      }

      recipeIngredients.forEach((ingredient) => {
        if (!ingredient.name || !ingredient.unit || ingredient.quantity == null || ingredient.quantity <= 0) {
          return;
        }
        const quantityNeeded = ingredient.quantity * servingsOrdered;
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
    } // End order processing loop

    const totalIngredientsArray = Object.values(aggregatedIngredients);

    await cycleRef.update({
      totalMealCounts: totalServings,
      totalIngredients: totalIngredientsArray,
      dineInContainers: dineInContainers,
      carryOutContainers: carryOutContainers,
      aggregationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      // Optionally update status here as well, e.g., 'shopping_list_ready'
    });
    functions.logger.log(`(_performAggregation) Successfully aggregated orders for meal cycle ${mealCycleId}.`);
  } catch (error) {
    functions.logger.error(`(_performAggregation) Error during aggregation for cycle ${mealCycleId}:`, error);
    // Re-throw the error to be handled by the calling function (scheduled or manual)
    throw error;
  }
}
// --- End Helper Function ---


/* Commented out Pub/Sub triggered function
exports.aggregateMealCycleOrders = functions.pubsub.topic('aggregate-orders')...
*/

/**
 * Scheduled function to run every Thursday at 12:00 PM (America/Chicago timezone).
 * Finds meal cycles ready for aggregation (status 'ordering_closed', not yet aggregated)
 * and performs the order aggregation by calling the helper function.
 */
exports.scheduledAggregateOrders = functions.pubsub.schedule("0 12 * * 4")
  .timeZone("America/Chicago") // Central Time
  .onRun(async (context) => {
    functions.logger.log("(Scheduled) Function running.");

    try {
      // 1. Find cycles ready for aggregation
      const cyclesRef = db.collection("mealCycles");
      const querySnapshot = await cyclesRef
        .where("status", "==", "ordering_closed")
        .where("aggregationTimestamp", "==", null) // Find cycles not yet aggregated
        .orderBy("orderDeadline", "desc")
        .get();

      if (querySnapshot.empty) {
        functions.logger.log("(Scheduled) No meal cycles found ready for aggregation.");
        return null;
      }

      functions.logger.log(`(Scheduled) Found ${querySnapshot.size} cycle(s) to aggregate.`);

      // 2. Process each cycle found using the helper function
      for (const cycleDoc of querySnapshot.docs) {
        const mealCycleId = cycleDoc.id;
        try {
          await _performAggregation(mealCycleId);
        } catch (error) {
          // Log the error for this specific cycle but continue with others
          functions.logger.error(`(Scheduled) Failed to aggregate cycle ${mealCycleId}:`, error);
        }
      } // End loop through cycles
    } catch (error) {
      // Catch errors related to the initial query itself
      functions.logger.error("(Scheduled) Error querying for cycles:", error);
    }

    return null; // Indicate successful completion of the schedule run
  });


/**
 * HTTPS Callable function for admins to manually trigger the aggregation process
 * for a specific meal cycle by calling the internal helper function.
 */
exports.requestManualAggregation = functions.https.onCall(async (data, context) => {
  // 1. Authentication Check
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const userId = context.auth.uid;
  const mealCycleId = data.mealCycleId;

  if (!mealCycleId) {
    throw new functions.https.HttpsError("invalid-argument", "The function must be called with a \"mealCycleId\" argument.");
  }

  functions.logger.log(`(Manual) Aggregation request received for cycle ${mealCycleId} from user ${userId}`);

  // 2. Authorization Check
  try {
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new functions.https.HttpsError("not-found", "User document not found.");
    }
    const userData = userSnap.data();
    if (!userData.roles || !Array.isArray(userData.roles) || !userData.roles.includes("admin")) {
      throw new functions.https.HttpsError("permission-denied", "User does not have admin privileges.");
    }
  } catch (error) {
    functions.logger.error(`(Manual) Authorization check failed for user ${userId}:`, error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    } else {
      throw new functions.https.HttpsError("internal", "Could not verify user permissions.");
    }
  }

  // 3. Perform Aggregation using Helper Function
  try {
    await _performAggregation(mealCycleId);
    functions.logger.log(`(Manual) Successfully triggered and completed aggregation for cycle ${mealCycleId}.`);
    return { success: true, message: `Aggregation successful for cycle ${mealCycleId}.` };
  } catch (error) {
    functions.logger.error(`(Manual) Aggregation failed for cycle ${mealCycleId}:`, error);
    throw new functions.https.HttpsError(
      "internal",
      `Aggregation failed: ${error.message || "Unknown error"}`,
    );
  }
});

// Original PubSub function remains commented out

