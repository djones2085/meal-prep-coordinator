const admin = require("firebase-admin");
// Use v2 imports for specific function types
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { HttpsError, onCall } = require("firebase-functions/v2/https"); // Correctly import onCall from here
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
        shoppingList: {
          status: "pending_approval",
          items: [],
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: null,
          approvedAt: null,
        },
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
        shoppingList: {
          status: "pending_approval",
          items: [],
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          approvedBy: null,
          approvedAt: null,
        },
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

      // Determine locationStatus: Prioritize orderData, then user profile, then default
      let locationStatus = "carry_out"; // Default
      if (orderData.locationStatus) {
        locationStatus = orderData.locationStatus;
      } else {
        const userData = userMap.get(userId);
        if (userData && userData.locationStatus) {
          locationStatus = userData.locationStatus;
        } else {
          logger.warn(`(_performAggregation) User ${userId} for order ${orderDoc.id} not found or has no locationStatus. Order has no locationStatus. Defaulting to carry_out.`);
        }
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

    const shoppingListItems = Object.values(aggregatedIngredients).map((ing) => ({
      name: ing.name,
      unit: ing.unit,
      aggregatedQuantity: ing.quantity,
      onHandQuantity: 0, // Initialize to 0
      toBePurchasedQuantity: ing.quantity, // Initially same as aggregated
      // notes: "", // Optional: initialize if needed
    }));

    const shoppingListData = {
      status: "pending_approval",
      items: shoppingListItems,
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: null,
      approvedAt: null,
    };

    await cycleRef.update({
      totalMealCounts: totalOverallServings,
      totalCountsByProtein: totalCountsByProtein,
      shoppingList: shoppingListData,
      dineInContainers: dineInContainers,
      carryOutContainers: carryOutContainers,
      aggregationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.log(`(_performAggregation) Successfully aggregated orders and created shopping list for meal cycle ${mealCycleId}.`);
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
  logger.log(`(_recalculateCycleTotalsAndIngredients) Recalculating cycle counts for cycle ${mealCycleId}. Shopping list will NOT be affected by this recalculation.`);
  const cycleRef = db.collection("mealCycles").doc(mealCycleId);

  try {
    // 1. Get Cycle Data
    const cycleSnap = await cycleRef.get();
    if (!cycleSnap.exists) {
      logger.error(`(_recalculateCycleTotalsAndIngredients) Meal Cycle ${mealCycleId} not found.`);
      return; // Exit if cycle doesn't exist
    }
    // const cycleData = cycleSnap.data(); // Not strictly needed if not touching shopping list

    // 2. Get All Orders for the Cycle (Recipe data is not needed if only recalculating counts)
    const ordersRef = db.collection("orders");
    const ordersQuery = ordersRef.where("cycleId", "==", mealCycleId);
    const ordersSnapshot = await ordersQuery.get();

    // --- Recalculation Logic for Counts & Containers ---
    let totalOverallServings = 0;
    const totalCountsByProtein = {};
    // No ingredient aggregation here
    let dineInContainers = 0;
    let carryOutContainers = 0;

    const userFetchPromises = [];
    const validOrderDocs = [];
    ordersSnapshot.docs.forEach((orderDoc) => {
      const orderData = orderDoc.data();
      if (orderData.userId && orderData.items && Array.isArray(orderData.items) && orderData.totalServings > 0) {
        validOrderDocs.push(orderDoc);
        userFetchPromises.push(db.collection("users").doc(orderData.userId).get());
      } else {
        logger.warn(`(_recalculateCycleTotalsAndIngredients) Skipping order ${orderDoc.id} due to missing/invalid data for counts.`);
      }
    });

    const userSnaps = await Promise.all(userFetchPromises);
    const userMap = new Map(userSnaps.map((snap) => [snap.id, snap.exists ? snap.data() : null]));

    // No existingOnHandMap needed as we are not touching shopping list items

    for (const orderDoc of validOrderDocs) {
      const orderData = orderDoc.data();
      const userId = orderData.userId;
      const orderTotalServings = orderData.totalServings;

      totalOverallServings += orderTotalServings;

      let locationStatus = "carry_out";
      if (orderData.locationStatus) {
        locationStatus = orderData.locationStatus;
      } else {
        const userData = userMap.get(userId);
        if (userData && userData.locationStatus) {
          locationStatus = userData.locationStatus;
        } else {
          logger.warn(`(_recalculateCycleTotalsAndIngredients) User ${userId} for order ${orderDoc.id} not found or has no locationStatus (for counts). Order has no locationStatus. Defaulting to carry_out.`);
        }
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
          // No ingredient processing here
        });
      }
    }

    // No newShoppingListItems to create

    const updatePayload = {
      totalMealCounts: totalOverallServings,
      totalCountsByProtein: totalCountsByProtein,
      dineInContainers: dineInContainers,
      carryOutContainers: carryOutContainers,
      // shoppingList and aggregationTimestamp are NOT updated here.
      // lastUpdatedAt for shoppingList is also not touched here.
    };

    // Only update if there are actual orders, or to reset to zero if all orders removed.
    if (validOrderDocs.length > 0 || (ordersSnapshot.empty && cycleSnap.data().totalMealCounts > 0)) {
        await cycleRef.update(updatePayload);
        logger.log(`(_recalculateCycleTotalsAndIngredients) Successfully recalculated counts for meal cycle ${mealCycleId}.`);
    } else if (ordersSnapshot.empty && cycleSnap.data().totalMealCounts === 0) {
        logger.log(`(_recalculateCycleTotalsAndIngredients) No orders and counts already zero for cycle ${mealCycleId}. No update needed.`);
    } else {
        logger.log(`(_recalculateCycleTotalsAndIngredients) No valid orders found for cycle ${mealCycleId}, but not forcing an update to zero unless previously had orders.`);
    }

  } catch (error) {
    logger.error(`(_recalculateCycleTotalsAndIngredients) Error during counts recalculation for meal cycle ${mealCycleId}:`, error);
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

// --- Callable Function to Create User Invite ---
exports.createInvite = onCall(async (request) => {
  const { data, auth } = request;

  // 1. Authentication and Authorization Check
  if (!auth) {
    logger.error("createInvite: Authentication required.");
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const adminUid = auth.uid;
  try {
    const adminUserDoc = await db.collection("users").doc(adminUid).get();
    if (!adminUserDoc.exists || !adminUserDoc.data().roles || !adminUserDoc.data().roles.includes("admin")) {
      logger.warn(`createInvite: User ${adminUid} is not authorized to create invites.`);
      throw new HttpsError("permission-denied", "You do not have permission to create invites.");
    }
  } catch (error) {
    logger.error(`createInvite: Error checking admin role for ${adminUid}:`, error);
    throw new HttpsError("internal", "Error verifying admin permissions.");
  }

  // 2. Input Validation
  const emailToInvite = data.email;
  if (!emailToInvite || typeof emailToInvite !== "string" || !/^[\S]+@[\S]+\.[\S]+$/.test(emailToInvite)) {
    logger.warn("createInvite: Invalid email format provided.", { email: emailToInvite });
    throw new HttpsError("invalid-argument", "Please provide a valid email address to invite.");
  }

  // 3. Check for Existing Pending Invite
  try {
    const invitesRef = db.collection("invites");
    const existingInviteQuery = invitesRef
      .where("email", "==", emailToInvite)
      .where("status", "==", "pending");
    const existingInviteSnapshot = await existingInviteQuery.get();

    if (!existingInviteSnapshot.empty) {
      logger.info(`createInvite: Active pending invite already exists for ${emailToInvite}.`);
      throw new HttpsError("already-exists", "An active invitation for this email address already exists.");
    }
  } catch (error) {
    // Re-throw HttpsError directly, otherwise wrap other errors
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error(`createInvite: Error checking for existing invites for ${emailToInvite}:`, error);
    throw new HttpsError("internal", "Error checking for existing invites.");
  }

  // 4. Create Invite Document
  try {
    const newInviteRef = await db.collection("invites").add({
      email: emailToInvite,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: adminUid,
      // householdId: null, // For future use
      // expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) // Optional: 7-day expiry
    });
    logger.info(`createInvite: Invite created successfully for ${emailToInvite} by ${adminUid}. Invite ID: ${newInviteRef.id}`);
    return { inviteId: newInviteRef.id };
  } catch (error) {
    logger.error(`createInvite: Error creating new invite document for ${emailToInvite}:`, error);
    throw new HttpsError("internal", "Failed to create the invitation.");
  }
});
// --- End User Invite Function ---

