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
