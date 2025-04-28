// Import Firebase Admin SDK and Node.js File System module
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path'); // To handle file paths correctly

// --- Service Account and Firebase Initialization ---
// Look for service account key in the same directory as the script first
let serviceAccount;
try {
    // Try loading from the same directory first (like seedFirestore.cjs)
    serviceAccount = require('./serviceAccountKey.json');
    console.log("Found service account key in the script directory.");
} catch (errorSameDir) {
    console.log("Did not find service account key in script directory, trying project root...");
    try {
        // Fallback to looking in the parent (project root)
        serviceAccount = require('../serviceAccountKey.json');
        console.log("Found service account key in the project root directory.");
    } catch (errorRootDir) {
        console.error("Error: Could not find 'serviceAccountKey.json' in the script directory OR the project root directory.");
        console.error("Ensure the service account key file exists in one of these locations.");
        process.exit(1); // Exit if key is missing
    }
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
} catch (error) {
    // Check if it's already initialized (useful if running multiple scripts)
    if (admin.apps.length === 0) {
        console.error("Error initializing Firebase Admin SDK:", error);
        process.exit(1);
    }
}

const db = admin.firestore();

// --- Script Logic ---

// Get the JSON file path from command line arguments
// process.argv[0] is node executable, process.argv[1] is the script file path
const jsonFilePathArg = process.argv[2];

if (!jsonFilePathArg) {
    console.error("Error: Please provide the path to the recipe JSON file as a command line argument.");
    console.error("Usage: node scripts/uploadRecipe.cjs <path/to/your/recipe.json>");
    process.exit(1);
}

// Resolve the absolute path to handle relative paths correctly
const absoluteJsonPath = path.resolve(jsonFilePathArg);

// Function to upload a single recipe from JSON
async function uploadRecipeFromJson(filePath) {
    console.log(`Attempting to read recipe data from: ${filePath}`);

    let recipeData;
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        recipeData = JSON.parse(fileContent);
        console.log("Successfully read and parsed JSON file.");
    } catch (error) {
        console.error(`Error reading or parsing JSON file at ${filePath}:`, error.message);
        process.exit(1);
    }

    // --- Basic Validation (Optional but Recommended) ---
    if (!recipeData || typeof recipeData !== 'object') {
         console.error("Error: Invalid JSON data. Expected an object.");
         process.exit(1);
    }
    if (!recipeData.name || typeof recipeData.name !== 'string' || !recipeData.name.trim()) {
        console.error("Error: Recipe data must include a non-empty 'name' field (string).");
        process.exit(1);
    }
    // Add more validation as needed (e.g., check for ingredients array, instructions array)

    // --- Prepare Data for Firestore ---
    // Ensure required fields for the collection are present or defaulted
    const dataToUpload = {
        ...recipeData, // Spread the data from the JSON file
        // Add/override specific fields if necessary
        status: recipeData.status || 'new', // Default status if not in JSON
        timesPrepared: recipeData.timesPrepared !== undefined ? recipeData.timesPrepared : 0, // Default if not in JSON
        cookNotes: recipeData.cookNotes || [],
        tags: recipeData.tags || [],
        proteinOptions: recipeData.proteinOptions || [],
        // Ensure creationDate is set (allow overriding if present in JSON, otherwise set now)
        creationDate: recipeData.creationDate
            ? admin.firestore.Timestamp.fromDate(new Date(recipeData.creationDate)) // Convert if ISO string in JSON
            : admin.firestore.FieldValue.serverTimestamp(),
        // Ensure ingredients/instructions are arrays if not present
        ingredients: recipeData.ingredients || [],
        instructions: recipeData.instructions || [],
    };

    // Remove any potential internal ID field if it exists in the JSON
    // (e.g., if you used _id previously) as Firestore generates its own.
    delete dataToUpload._id;
    delete dataToUpload.id;


    console.log(`Uploading recipe "${dataToUpload.name}" to Firestore...`);

    try {
        const recipesCollectionRef = db.collection('recipes');
        // Use addDoc to let Firestore generate the document ID
        const docRef = await recipesCollectionRef.add(dataToUpload);
        console.log(`Successfully added recipe "${dataToUpload.name}" with Firestore ID: ${docRef.id}`);
    } catch (error) {
        console.error(`Error uploading recipe "${dataToUpload.name}" to Firestore:`, error);
        process.exit(1);
    }
}

// Run the upload function
uploadRecipeFromJson(absoluteJsonPath); 