const functions = require("firebase-functions/v1"); // Use v1 for scheduled functions for now
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK only once
admin.initializeApp();

const db = admin.firestore();

/**
 * Scheduled function to close voting for meal cycles.
 * Runs every hour.
 * Finds cycles where status is 'voting_open' and votingDeadline has passed.
 * Updates the status of found cycles to 'voting_closed'.
 */
exports.closeVotingForExpiredCycles = functions.pubsub.schedule("every 60 minutes")
  .timeZone("America/New_York") // Optional: Specify timezone, adjust as needed
  .onRun(async (_context) => {
    const now = admin.firestore.Timestamp.now(); // Get current Firestore timestamp
    console.log(`Running closeVotingForExpiredCycles check at: ${now.toDate().toISOString()}`);

    const cyclesRef = db.collection("mealCycles");
    // Query for cycles that are open for voting and whose deadline has passed
    const query = cyclesRef
      .where("status", "==", "voting_open")
      .where("votingDeadline", "<", now); // Use '<' to catch those exactly at/before now

    try {
      const snapshot = await query.get();

      if (snapshot.empty) {
        console.log("No meal cycles found with expired voting deadlines.");
        return null;
      }

      const updates = [];
      snapshot.forEach((doc) => {
        console.log(`Found expired cycle, closing voting: ${doc.id}`);
        // Prepare an update operation
        const updatePromise = doc.ref.update({ status: "voting_closed" });
        updates.push(updatePromise);
      });

      // Execute all updates in parallel
      await Promise.all(updates);
      console.log(`Successfully closed voting for ${updates.length} cycle(s).`);
      return null;
    } catch (error) {
      console.error("Error closing voting for expired cycles:", error);
      // Consider adding more specific error handling or reporting
      return null;
    }
  });

// You can add other functions below, like order closing, etc.
