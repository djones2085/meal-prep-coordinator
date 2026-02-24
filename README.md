# Project Definition: Meal Prep Coordinator

## Objective
A cross-platform mobile and web application (transitioning to Flutter) designed to streamline the coordination of meal preparation among a group of people. It provides a centralized platform for managing recipes, submitting custom food orders, organizing meal cycles, and orchestrating the shopping and cooking workflows.

## Core Tech Stack
- **Frontend**: Flutter (Transitioning away from React/Vite)
- **Backend**: Firebase (Auth, Firestore, Cloud Functions, Storage, Hosting)

## Key Features & Requirements

### 1. Authentication & Role-Based Access Control (RBAC)
- Secure Email/Password authentication with password strength enforcement and email confirmation.
- Invite-only registration system managed by Admins.
- Distinct user roles: `admin`, `user`, determining UI access and data permissions. *(Note: The standard `user` role requires full UI access to the recipes library).*

### 2. Recipe Management
- Comprehensive recipe data model with support for variations, chef notes, and bulk uploads.
- *Current Focus*: Expanding the database with new staples (e.g., Chopped Cheese).
- *Current Focus*: Ground-up rewrite of the measurement scaling algorithms to ensure robust, accurate aggregation.

### 3. Meal Cycle Workflow
- Admin-configurable meal cycles with set deadlines and cook dates.
- User order submissions with predefined or free-text customizations.
- *Current Focus*: Elevating order comments and container preferences (dine-in vs carry-out) to be fully visible on the cycle summary.

### 4. Shopping & Cooking Workflows
- *Current Focus*: Complete rewrite of the automated shopping list generation algorithm.
- Dedicated shopper interfaces for marking items "on-hand" vs. "acquired".
- Chef access to historical cook notes and aggregated checklist items.

---
Refer to `PLAN.md` for historical completion status, remaining technical debt, and detailed execution milestones.

## Project History
- **[2026-02-24] Session 1.1 Completed**: Added "Chopped Cheese", "Roasted Tomato Basil Soup", and "High Protein Chili" recipes to the Firestore `recipes` database. Resolved Node.js/Firebase SDK compatibility issues and successfully uploaded the data using `scripts/uploadRecipe.cjs`.
- **[2026-02-24] Session 1.2 Completed**: Ensured users with the "user" role can access the recipes library. Identified that new users were being assigned an deprecated `eater` role and updated `src/pages/SignUpPage.jsx` and `src/pages/AcceptInvitePage.jsx` to correctly assign the `user` role instead. Removed the `eater` role from the Admin `src/pages/admin/UserManagementPage.jsx` UI.
- **[2026-02-24] Session 1.3 Completed**: Enhanced the meal cycle summary UI in `MealCycleManagementPage.jsx` to explicitly display order comments and container preferences (`Dine-In` and `Carry-Out`). Optimized performance by leveraging pre-aggregated container fields and combined custom recipe options with free-text notes into a single `Comments` column for better kitchen staff readability. This concludes Milestone 1.
