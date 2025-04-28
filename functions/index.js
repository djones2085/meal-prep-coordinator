const functions = require("firebase-functions/v1"); // Use v1 for scheduled functions for now
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK only once
admin.initializeApp();

const db = admin.firestore();

