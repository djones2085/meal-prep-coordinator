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
- Resolved Node.js/Firebase SDK compatibility issues by installing Homebrew and Node v20 via nvm.
- Successfully ran `scripts/uploadRecipe.cjs` for all three recipes, generating new Firestore documents.

## Blockers / Next Steps
- Session 1.1 complete. No blockers.
- Proceed to Phase 1.2: User Role Recipe Access.
