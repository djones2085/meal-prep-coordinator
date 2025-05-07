// Import Firebase Admin SDK
const admin = require('firebase-admin');

// Import your service account key JSON file
// If the key file is in the SAME directory as this script:
const serviceAccount = require('./serviceAccountKey.json');

// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Optional: Add your databaseURL if needed, often inferred
  // databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com"
});

// Get a reference to the Firestore database
const db = admin.firestore();

// --- Define Your Sample Recipe Data (Corrected JavaScript Object Syntax) ---
const recipesData = [
  {
    // Recipe 1: Chicken Fried Rice
    _id: "chickenFriedRice", // Optional custom ID
    name: "Chicken Fried Rice",
    description: "Classic take-out style fried rice.",
    status: "approved",
    baseYield: 4,
    baseYieldUnit: "servings", // Corrected: Removed quotes around key
    prepTime: "15 minutes",     // Corrected: Removed quotes around key
    cookTime: "10 minutes",     // Corrected: Removed quotes around key
    // Add new customization fields
    predefinedCustomizations: ["No Peas", "Extra Egg", "Spicy Option"],
    allowFreeTextCustomization: true,
    ingredients: [
      { name: "Cooked Rice", quantity: 600, unit: "g", notes: "Day-old Jasmine preferred" },
      { name: "Eggs", quantity: 2, unit: "unit" },
      { name: "Soy Sauce", quantity: 30, unit: "ml" },
      { name: "Sesame Oil", quantity: 5, unit: "ml" },
      { name: "Garlic", quantity: 10, unit: "g", notes: "Minced" },
      { name: "Onion", quantity: 50, unit: "g", notes: "Diced" },
      { name: "Frozen Peas and Carrots", quantity: 100, unit: "g" },
      { name: "Vegetable Oil", quantity: 15, unit: "ml" }
    ],
    proteinOptions: [
      {
        optionName: "Chicken",
        isDefault: true,
        ingredients: [ { name: "Chicken Breast", quantity: 200, unit: "g", notes: "Cut into small pieces" } ],
        instructions: [ "Season chicken pieces with a pinch of salt and pepper.", "Stir-fry chicken in hot oil until cooked through. Remove and set aside." ]
      },
       {
        optionName: "Shrimp",
        ingredients: [ { name: "Shrimp", quantity: 200, unit: "g", notes: "Peeled and deveined" } ],
        instructions: [ "Stir-fry shrimp in hot oil until pink. Remove and set aside." ]
      },
      {
        optionName: "Tofu",
         ingredients: [ { name: "Firm Tofu", quantity: 200, unit: "g", notes: "Pressed and cubed" } ],
        instructions: [ "Pan-fry tofu cubes until golden brown. Remove and set aside." ]
      }
    ],
    instructions: [
      "Ensure rice is cold and broken up.",
      "Heat vegetable oil in a large wok or skillet over medium-high heat.",
      "Add diced onion and minced garlic, stir-fry until fragrant (about 30 seconds).",
      "Push aromatics to one side. Crack eggs into the other side and scramble until just cooked.",
      "Add cooked rice to the wok. Stir-fry, breaking up clumps, for 2-3 minutes.",
      "Add soy sauce and sesame oil, toss to combine well.",
      "Stir in the frozen peas and carrots.",
      "Add the cooked protein (e.g., chicken) back to the wok.",
      "Toss everything together until heated through and well combined.",
      "Serve immediately.",
    ],
    cookNotes: [],
    tags: ["asian", "chicken", "rice", "quick"],
    creationDate: admin.firestore.FieldValue.serverTimestamp(),
    timesPrepared: 0
  },
  {
    // Recipe 2: Simple Pasta Bake
    _id: "pastaBake", // Optional custom ID
    name: "Simple Pasta Bake",
    description: "Easy weeknight pasta bake with ground beef.", // Corrected: Removed quotes around key
    status: "testing",
    baseYield: 6,
    baseYieldUnit: "servings", // Corrected: Removed quotes around key
    prepTime: "20 minutes",     // Corrected: Removed quotes around key
    cookTime: "30 minutes",     // Corrected: Removed quotes around key
    // Add new customization fields
    predefinedCustomizations: ["Vegetarian (No Beef)", "Extra Cheese", "Add Mushrooms"],
    allowFreeTextCustomization: true,
    ingredients: [
      { name: "Pasta (Penne or Rigatoni)", quantity: 500, unit: "g" },
      { name: "Ground Beef", quantity: 500, unit: "g" },
      { name: "Onion", quantity: 100, unit: "g", notes: "Diced" },
      { name: "Garlic", quantity: 10, unit: "g", notes: "Minced" },
      { name: "Canned Crushed Tomatoes", quantity: 800, unit: "g" },
      { name: "Dried Oregano", quantity: 5, unit: "g" }, // Approx 1 tsp
      { name: "Salt", quantity: 5, unit: "g" },
      { name: "Black Pepper", quantity: 2, unit: "g" },
      { name: "Mozzarella Cheese", quantity: 200, unit: "g", notes: "Shredded" },
      { name: "Parmesan Cheese", quantity: 50, unit: "g", notes: "Grated" } // Corrected: Removed quotes around key
    ],
    proteinOptions: [],
    instructions: [
      "Preheat oven to 190°C (375°F).",
      "Cook pasta according to package directions until al dente. Drain.",
      "While pasta cooks, brown ground beef with onion and garlic in a large skillet. Drain excess fat.",
      "Stir in crushed tomatoes, oregano, salt, and pepper. Simmer for 10 minutes.",
      "Combine cooked pasta and meat sauce in a large baking dish.",
      "Top generously with mozzarella and parmesan cheese.",
      "Bake for 20-25 minutes, or until bubbly and golden brown.",
    ],
    cookNotes: [],
    tags: ["pasta", "beef", "easy", "comfort food"],
    creationDate: admin.firestore.FieldValue.serverTimestamp(),
    timesPrepared: 0
  }
  // Add more recipe objects here if needed
];

// --- Function to Add Recipes ---
async function addRecipes() {
  const recipesCollection = db.collection('recipes');

  console.log(`Attempting to add ${recipesData.length} recipes...`);

  for (const recipe of recipesData) {
    try {
      let docRef;
      if (recipe._id) {
        // Use the custom _id if provided
        docRef = recipesCollection.doc(recipe._id);
        // Create a copy without the _id field for Firestore data
        const dataToSave = { ...recipe };
        delete dataToSave._id;
        await docRef.set(dataToSave);
        console.log(`Recipe "${recipe.name}" added with custom ID: ${recipe._id}`);
      } else {
        // Let Firestore generate an ID
        // Create a copy without the _id field just in case it was accidentally present
        const dataToSave = { ...recipe };
        delete dataToSave._id;
        docRef = await recipesCollection.add(dataToSave);
        console.log(`Recipe "${recipe.name}" added with auto-generated ID: ${docRef.id}`);
      }
    } catch (error) {
      console.error(`Error adding recipe "${recipe.name}":`, error);
    }
  }

  console.log("Finished adding recipes.");
}

// Run the function
addRecipes(); 