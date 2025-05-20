# Meal Prep Coordinator

A web application for coordinating meal preparation among a group of people, managing recipes, orders, and meal cycles.
## Next Focus

- **Shopping List Enhancements:**
    - Display historical shopping lists for "completed" meal cycles (presentation similar to Order History on the dashboard).
    - Provide a clear message if no shopping list is available for the current/next planned cycle.
- **Measurement Conversion for Shopping Lists:**
    - Implement robust measurement conversion for ingredients, especially to handle large quantities (e.g., for 20-30 servings), scaling units appropriately (e.g., grams to kilograms, ml to liters, small units to larger common units).

### Core Setup ✅
- ✅ React (Vite) frontend
- ✅ Firebase integration (Auth, Firestore, Functions, Storage, Hosting)
- ✅ Git repository
- ✅ Basic routing (React Router)
- ✅ Page components structure
- ✅ MUI integration
- ✅ Layout component

### Authentication 🟡
- ✅ Email/Password sign-up/login
- ✅ Global auth state (React Context)
- ✅ Protected routes
- ✅ Logout functionality
- ✅ Firestore user profile creation on signup
- ✅ Role-based access control (Admin vs Regular users) - *Frontend routes protected using roles from Firestore. Admin links in UI are conditional. Unauthorized access attempts are handled with notifications. Includes an admin page for user management where roles (`user`, `admin`, `cook`, `shopper`) can be assigned.*
- ✅ Email confirmation - *Users must verify email after signup. Redirects to verification page with resend option.*
- ✅ User invites system - *Admins can generate invite links via an admin page. Invitees use a special link to sign up. Firestore `invites` collection tracks status. Cloud Function `createInvite` handles invite generation. Security rules in place.*
    - ✅ Admin can generate a unique invite link for an email.
    - ✅ Invitee uses the link to access a special sign-up page.
    - ✅ On sign-up, invite status is updated.
    - ✅ Firestore collection: `invites` (stores `invitedEmail`, `status` \\["pending", "accepted", "expired"\\], `createdAt`, `createdBy` (admin UID), `acceptedByUid`, `acceptedAt`).
    - 🔘 [Future]: Automated email sending for invites.
    - 🔘 [Future]: Non-admins can invite to households.
- ✅ Password Reset/Change:
    - ✅ User can request a password reset email (`ForgotPasswordPage.jsx`).
    - ✅ Logged-in user can change their password (`ChangePasswordPage.jsx`).
- ✅ Password Strength Enforcement:
    - ✅ Secure passwords required for new user sign-up (`SignUpPage.jsx`).
    - ✅ Secure passwords required for password changes (`ChangePasswordPage.jsx`).
- 🔘 Household management

### Recipe Management ✅
- ✅ Data model defined
- ✅ Firestore rules for read/create
- ✅ Bulk upload script
- ✅ Manual Add Recipe form
- ✅ Recipe List (RecipesPage)
- ✅ Recipe Detail (RecipeDetailPage)
- 🔘 [Future]Recipe photo uploads/display
- 🔘 Agent: Recipe Processing (Parse unstructured text, standardize units/format, apply standards like protein goals, create structured recipe object)
- ✅ Recipe Notes: Field for general cooking tips, source, variations, chef-to-chef advice on the recipe itself
    - 🔘 [Future]: Enhance security rules to restrict read access to notes by role (e.g., 'cook') by moving notes to a subcollection and applying role-based server-side validation for all CRUD operations on notes.
- ✅ Status management
- ✅ Shopping list generation (Basic) - *Enhanced to generate a structured `shoppingList` object in `mealCycle` doc via Cloud Function (`_performAggregation`). Includes item details for aggregated quantity, on-hand tracking, and to-be-purchased calculation. Status: `pending_approval` initially.*
- 🔘 Ensure intelligent unit conversions (e.g., 30 tsp to 1.25 cups) for practicality.


### Meal Cycle Workflow 🟡
- ✅ Basic cycle creation (Admin)
- ✅ Admin configurable cycle defaults (deadline, cook date)
- ✅ Order submission (Users)
- ✅ User order modifications (e.g., "no cheese", "extra sauce"; pre-defined & free-text 'Other' option) - *Implemented by allowing recipes to define a list of `predefinedCustomizations` (checkboxes) and a flag `allowFreeTextCustomization` for a general text note on orders. These are saved with the order.*
- ✅ Track order type: Dine-in (glass container) vs. Carry-out (to-go container) based on user document - *User's `locationStatus` preference (e.g., 'dine_in', 'carry_out') is saved with each order. Cloud Functions aggregate counts for `dineInContainers` and `carryOutContainers` per meal cycle.*
- ✅ Users can modify their submitted orders before the deadline (from dashboard/order history) - *Implemented in `DashboardPage.jsx` with deadline checks and Firestore rule support.*
- ✅ View order history (Users)
- ✅ Order aggregation
- 🔘 Store scaled recipe (ingredients, instructions) in mealCycle document after aggregation/scaling
- ✅ Status management
- 🔘 [Future]fAssign roles (cook, shopper) for specific meal cycles
- 🔘 [Future]Voting system
- 🔘 [Future]Distribution tracking
- 🔘 Feedback collection (app specific feedback)
- 🔘 Feedback: Specific feedback channel/form for shoppers
- 🔘 Feedback: Eater ratings/comments for cooks (e.g., 5-star system)
- 🔘 Agent: Cook Sequencing (Optimize cooking task order based on prep/cook times and target completion)

### Shopping & Cooking Workflow 🟡
- ✅ Basic shopping list data generation (ingredients and quantities in mealCycle doc) - *Superseded by enhanced generation in Recipe Management. This item refers to the new structured list.*
- ✅ Shopping list: Admin approval step - *Backend function `handleApproveShoppingList` in `MealCycleManagementPage.jsx` used by `AdminShoppingList.jsx` component.*
- ✅ Shopping list: Editable by admin/shopper - *'On hand' quantities can be edited after list approval.*
- ✅ Shopping list: Shopper can mark items as 'available on hand' - *Implemented via direct 'on hand' quantity editing and a 'Mark as Acquired' button for ease of use.*
- ✅ Shopping list: Dedicated page for Shoppers to view and update item status (on hand, acquired).
- 🔘 Chef/Cook: Ingredient checklist before starting to cook
- ✅ Chef/Cook: Access to historical cook notes for the current recipe
- ✅ Manage packaging (e.g., container types, labels)

### User Interface 🟡
- ✅ Basic responsive layout
- ✅ Material-UI components
- ✅ Loading states
- ✅ Error handling
- ✅ User input validation/UX improvements (e.g., order quantity field behavior).
- 🔘 Enhanced meal cycle page: Display user names, order counts, and dine-in/carry-out status per user
- ✅ User dashboard: Order history display - *Updated to show Recipe Name as primary, removed Order/Cycle ID and status.*
- ✅ Navbar: Transparent style with updated icon/title colors.
- ✅ Branding: Set application title and browser tab favicon.
- 🔘 [Future]Advanced state management (Zustand/Redux)
- 🔘 [Future]PWA capabilities
- 🔘 [Future]Notifications (FCM)
- 🟡 [In Progress]UI/UX polish
    - ✅ Address top bar layout issues on small screens
- 🔘 UI Technology Consideration: Abstract UI and explore Tailwind CSS as an alternative/addition to MUI
- 🔘 [Future]Pagination for user list in admin user management. To handle a lot of users. 
- 🔘 Automated testing

### Backend Services 🟡
- ✅ Basic Cloud Functions
- ✅ Order aggregation - *Cloud Functions `_performAggregation` and `_recalculateCycleTotalsAndIngredients` handle aggregation. `_performAggregation` is triggered automatically when a cycle's status changes to `ordering_closed` (if not already aggregated) and also by a scheduled job. `_recalculateCycleTotalsAndIngredients` updates counts when orders are written.*
- ✅ Real-time updates
- 🔘 Cloud Function: Update recipe stats (lastPreparedDate, timesPrepared) on meal cycle completion
- 🔘 [Future]AI Services integration
- 🔘 Suggested Frameworks: CrewAI, Google ADK for multi-agent workflows (Recipe Processing, Shopping List, Cook Sequencing)
- 🔘 Data modeling consideration: Evolve 'cook' representation to 'cook_session' for better tracking
- ✅ Advanced security rules - *Initial role-based rules implemented (users, recipes, mealCycles, orders); admins have broader permissions, users restricted. MealCycles not deletable. Updated mealCycle rules to allow shoppers to update shoppingList.items with lastUpdatedAt timestamp. Further review and refinement pending.*
- 🔘 Robust unit conversion logic (potentially as a shared utility or microservice)

## Future AI / Agent-Based Features 🔘
- 🔘 Agent: Recipe Processing (Parse unstructured text, standardize units/format, apply standards like protein goals, create structured recipe object)
- 🔘 Agent: Shopping List Generation (Aggregate ingredients intelligently across orders, handle complex unit conversions/standardization, potentially optimize quantities for purchasing, e.g. if items come in standard sizes. Ensure intelligent unit conversions like 30 tsp to 1.25 cups for practicality.)
   - 🔘 Ensure intelligent unit conversions (e.g., 30 tsp to 1.25 cups) for practicality.

- 🔘 Agent: Cook Sequencing (Optimize cooking task order based on prep/cook times and target completion, potentially considering resource availability like oven space or number of burners.)

## Security Recommendations

- **Recipe Notes Permissions**: [Future]The current Firestore security rule for updating recipes (`recipes/{recipeId}`) allows any authenticated user to modify the `notes` array if it's the only field being changed. The client-side UI in `RecipeDetailPage.jsx` handles author-only edit/delete logic. This is a "soft" rule for write operations. Read access to notes is not currently restricted by role at the server level. *Future enhancement: Consider moving notes to a subcollection to enable server-enforced role-based read restrictions (e.g., only 'cooks' can read notes) and more granular server-side validation for write operations (add, edit, delete by author or admin).*
- **Review Admin-Only Actions**: [Future]Several TODOs exist in `firestore.rules` (e.g., recipe creation, meal cycle creation/update) that are currently open to any authenticated user but intended for admins. These should be reviewed and restricted to admin users as soon as the admin role is fully implemented and testable in rules.
- **Comprehensive Rule Review**: [Future]The note under "Backend Services > Advanced security rules" in the Project Status section highlights that a further review and refinement of all Firestore rules is pending. This should be prioritized to ensure all data access is appropriately restricted based on user roles and context.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication, Firestore, Functions, Storage
   - Add your Firebase config to `src/firebaseConfig.js`
4. Start the development server:
   ```bash
   npm run dev
   ```
5. **TODO:** Create a robust set of `.cursorrules` to guide AI assistance.

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request
4. Ensure all tests pass
5. Update documentation as needed

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (Auth, etc.)
├── pages/         # Page components
│   └── admin/     # Admin-specific pages
├── assets/        # Static assets
└── firebaseConfig.js  # Firebase configuration

functions/         # Firebase Cloud Functions
└── index.js       # Main functions file
```

## Status Legend
- ✅ Complete
- 🟡 In Progress (Started but not complete)
- 🔘 Not Started
