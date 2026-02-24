# Session Notes 1.1

## Goal
Add the "Chopped Cheese" recipe to the Firestore `recipes` collection.

## Actions Taken
- Reviewed `README.md` and `PLAN.md` to understand context and session goals.
- Located `AddedRecipes/` directory which contains existing recipe JSONs.
- Exploring schema in `AddedRecipes/sample-recipe.json` and checking `scripts/` directory for any database upload utility.
- Created `AddedRecipes/chopped-cheese.json` based on the user-provided recipe and `sample-recipe.json` schema.
- Created `AddedRecipes/roasted-tomato-basil-soup.json` based on user-provided recipe and `sample-recipe.json` schema.
- Created `AddedRecipes/high-protein-chili.json` based on user-provided recipe and `sample-recipe.json` schema.

## To Do
- Upload/insert new recipes (Chopped Cheese, Tomato Soup, Chili) into Firestore (blocked on missing `serviceAccountKey.json`).
- Commit and Push changes.
