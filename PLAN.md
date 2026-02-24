# Project Plan: Meal Prep Coordinator

## Audit & Debt Register
- **Architecture Debt (Priority 0)**: Complete frontend rewrite from React to Flutter.
- **Algorithm Debt (Priority 1)**: The current scaling algorithms and shopping list generation are flawed. They need to be rebuilt from scratch.

## High-Level Roadmap
- **Milestone 1: Critical Core Fixes & Data Entry**
  Ensure the underlying Firebase data, functions, and current critical UI flows are solid before fully swapping the frontend. This includes uploading(user will provide) the Chopped Cheese recipe, updating current React UI permissions for the recipes menu, and patching the cycle summary displays.
- **Milestone 2: Backend Algorithm Rewrite**
  Scrap the existing scaling and shopping list Cloud Functions. Write a robust, from-scratch solution for accurate ingredient aggregation.
- **Milestone 3: Complete Flutter Transition**
  Rebuild the React/Vite frontend matching the revised functionality inside a new Flutter application framework.

---

## Detailed Session Mapping (The Base Backlog)

### Milestone 1: Critical Core Fixes & Data Entry [In Progress]

#### Session 1.1: Database Entry - Chopped Cheese [Completed]
- **Session Goal**: Add the "Chopped Cheese" recipe to the Firestore `recipes` collection.
- **Key Tasks**:
  1. User will provide the Chopped Cheese recipe in plain text, convert to JSON/object conforming to the schema.
  2. Upload/insert it into Firestore.
- **Required Context**: Firestore `recipes` schema.
- **Definition of Done**: Chopped Cheese is visible in the database.
- **Artifacts / Technical Notes**:
  - Created: `AddedRecipes/chopped-cheese.json`, `AddedRecipes/roasted-tomato-basil-soup.json`, `AddedRecipes/high-protein-chili.json`.
  - Resolved Firebase SDK/Node.js compatibility issues by using Node v20 via nvm.
  - Executed: `scripts/uploadRecipe.cjs` to upload all three recipes to Firestore.

#### Session 1.2: User Role Recipe Access [Completed]
- **Session Goal**: Give users with the "user" role access to the recipes library in the hamburger menu.
- **Key Tasks**:
  1. Update layout/routing in the current web app to expose the Recipes link to the `user` role.
  2. Verify Firestore rules permit `user` read access to recipes.
- **Required Context**: `src/components/Layout/Sidebar.jsx` (or similar layout component), Firestore rules.
- **Definition of Done**: A "user" account can navigate to and view the recipes library.
- **Artifacts / Technical Notes**:
  - Verified `firestore.rules` already allow authenticated users read access to recipes.
  - Verified `Layout.jsx` properly exposes the Recipes link to the `user` role.
  - *Fix:* Changed default signup/invite role from `eater` to `user` in `SignUpPage.jsx` and `AcceptInvitePage.jsx` to resolve missing role access. Removed `eater` from admin `UserManagementPage.jsx`.
  - Created `session_notes/session_notes_1.2.md`.

#### Session 1.3: Cycle Summary Polish (Comments & Containers)
- **Session Goal**: Surface order comments and container preferences on the meal cycle summary view.
- **Key Tasks**:
  1. Update the cycle summary UI so free-text comments attached to orders are fully visible.
  2. Ensure dine-in vs carry-out container preferences are explicitly presented alongside each order (or accurately aggregated).
- **Required Context**: `src/pages/MealCycleManagementPage.jsx` (or equivalent summary component).
- **Definition of Done**: Admins/Cooks can easily see all order comments and container types on the summary page.

#### Session 1.4: Establish Recipe Parameters
- **Session Goal**: half pound of the primary protein per serving. 

### Milestone 2: Backend Algorithm Rewrite

#### Session 2.1: Rewrite Scaling & Shopping List Generation
- **Session Goal**: Rebuild the ingredient scaling and shopping list generation logic from scratch.
- **Key Tasks**:
  1. Remove or deprecate the existing `_performAggregation` logic that relies on `convert-units`.
  2. Write a new, clean algorithmic approach to aggregate ingredients across all orders in a cycle.
  3. Implement straightforward scaling multiplier logic to ensure accuracy.
- **Required Context**: `functions/index.js`, existing order data structure.
- **Definition of Done**: A meal cycle automatically generates a highly accurate, scalable shopping list based on the new custom logic.

### Milestone 3: Complete Flutter Transition

#### Session 3.1: Flutter Project Initialization & Auth
- **Session Goal**: Set up the base Flutter project and connect Firebase Auth.
- **Key Tasks**:
  1. Initialize a new Flutter project in a suitable directory structure.
  2. Integrate `firebase_core` and `firebase_auth`.
  3. Replicate the login, signup, and role-based routing foundations.
- **Required Context**: Firebase config, current React auth flow.
- **Definition of Done**: A user can log into the Flutter app and see a role-protected home screen.

#### Session 3.2: Rebuild Core Screens (Recipes & Cycles)
- **Session Goal**: Port the Recipe Management and Meal Cycle workflows to Flutter.
- **Key Tasks**:
  1. Build the Recipe List and Detail screens using Flutter widgets.
  2. Build the Meal Cycle Dashboard and Order Submission screens.
- **Required Context**: React UI as reference, Firestore schemas.
- **Definition of Done**: Core workflows are natively functional in the Flutter app.

#### Session 3.3: Rebuild Shopper/Admin Interfaces
- **Session Goal**: Complete the frontend transition by porting all remaining operational screens.
- **Key Tasks**:
  1. Build the Shopper checked-list UI.
  2. Build Admin cycle management and user role assignment screens.
- **Required Context**: React UI as reference.
- **Definition of Done**: Absolute feature parity with the legacy web app is achieved in Flutter.
