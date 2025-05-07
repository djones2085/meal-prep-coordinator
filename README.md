# Meal Prep Coordinator

A web application for coordinating meal preparation among a group of people, managing recipes, orders, and meal cycles.

## Project Status

### Core Setup ✅
- [x] React (Vite) frontend
- [x] Firebase integration (Auth, Firestore, Functions, Storage, Hosting)
- [x] Git repository
- [x] Basic routing (React Router)
- [x] Page components structure
- [x] MUI integration
- [x] Layout component

### Authentication 🟨
- [x] Email/Password sign-up/login
- [x] Global auth state (React Context)
- [x] Protected routes
- [x] Logout functionality
- [x] Firestore user profile creation on signup
- [x] Role-based access control (Admin vs Regular users) - *Frontend routes protected using roles from Firestore. Admin links in UI are conditional. Unauthorized access attempts are handled with notifications. Includes an admin page for user management where roles (`user`, `admin`, `cook`, `shopper`) can be assigned.*
- [x] Email confirmation - *Users must verify email after signup. Redirects to verification page with resend option.*
- [x] User invites system - *Admins can generate invite links via an admin page. Invitees use a special link to sign up. Firestore `invites` collection tracks status. Cloud Function `createInvite` handles invite generation. Security rules in place.*
    - [x] Admin can generate a unique invite link for an email.
    - [x] Invitee uses the link to access a special sign-up page.
    - [x] On sign-up, invite status is updated.
    - [x] Firestore collection: `invites` (stores `invitedEmail`, `status` \["pending", "accepted", "expired"\], `createdAt`, `createdBy` (admin UID), `acceptedByUid`, `acceptedAt`).
    - [ ] [Future]: Automated email sending for invites.
    - [ ] [Future]: Non-admins can invite to households.
- [ ] Household management

### Recipe Management 🟨
- [x] Data model defined
- [x] Firestore rules for read/create
- [x] Bulk upload script
- [x] Manual Add Recipe form
- [x] Recipe List (RecipesPage)
- [x] Recipe Detail (RecipeDetailPage)
- [ ] Recipe photo uploads/display
- [ ] Agent: Recipe Processing (Parse unstructured text, standardize units/format, apply standards like protein goals, create structured recipe object)
- [x] Recipe Notes: Field for general cooking tips, source, variations, chef-to-chef advice on the recipe itself
    - [ ] [Future]: Enhance security rules to restrict read access to notes by role (e.g., 'cook') by moving notes to a subcollection and applying role-based server-side validation for all CRUD operations on notes.
- [x] Status management
- [ ] Shopping list generation (Basic)
- [ ] Agent: Shopping List Generation (Aggregate ingredients intelligently across orders, handle complex unit conversions/standardization, potentially optimize quantities)
    - [ ] Ensure intelligent unit conversions (e.g., 30 tsp to 1.25 cups) for practicality.


### Meal Cycle Workflow 🟨
- [x] Basic cycle creation (Admin)
- [x] Admin configurable cycle defaults (deadline, cook date)
- [x] Order submission (Users)
- [x] User order modifications (e.g., "no cheese", "extra sauce"; pre-defined & free-text 'Other' option) - *Implemented by allowing recipes to define a list of `predefinedCustomizations` (checkboxes) and a flag `allowFreeTextCustomization` for a general text note on orders. These are saved with the order.*
- [x] Track order type: Dine-in (glass container) vs. Carry-out (to-go container) based on user document - *User's `locationStatus` preference (e.g., 'dine_in', 'carry_out') is saved with each order. Cloud Functions aggregate counts for `dineInContainers` and `carryOutContainers` per meal cycle.*
- [ ] Users can modify their submitted orders before the deadline (from dashboard/order history)
- [x] View order history (Users)
- [x] Order aggregation
- [ ] Store scaled recipe (ingredients, instructions) in mealCycle document after aggregation/scaling
- [x] Status management
- [ ] Assign roles (cook, shopper) for specific meal cycles (Future)
- [ ] [Future]Voting system
- [ ] [Future]Distribution tracking
- [ ] Feedback collection (General)
- [ ] Feedback: Specific feedback channel/form for shoppers
- [ ] Feedback: Eater ratings/comments for cooks (e.g., 5-star system)
- [ ] Agent: Cook Sequencing (Optimize cooking task order based on prep/cook times and target completion)

### Shopping & Cooking Workflow 🟨
- [x] Basic shopping list data generation (ingredients and quantities in mealCycle doc)
- [ ] Shopping list: Admin approval step
- [ ] Shopping list: Editable by admin/shopper
- [ ] Shopping list: Shopper can mark items as 'available on hand'
- [ ] Agent: Shopping List Generation (Aggregate ingredients intelligently, handle complex unit conversions/standardization, potentially optimize quantities)
    - [ ] Ensure intelligent unit conversions (e.g., 30 tsp to 1.25 cups) for practicality.
- [ ] Chef/Cook: Ingredient checklist before starting to cook
- [x] Chef/Cook: Access to historical cook notes for the current recipe
- [ ] Manage packaging (e.g., container types, labels)

### User Interface 🟨
- [x] Basic responsive layout
- [x] Material-UI components
- [x] Loading states
- [x] Error handling
- [ ] Enhanced meal cycle page: Display user names, order counts, and dine-in/carry-out status per user
- [x] User dashboard: Order history display
- [ ] [Future]Advanced state management (Zustand/Redux)
- [ ] [Future]PWA capabilities
- [ ] [Future]Notifications (FCM)
- [ ] [Future]UI/UX polish
    - [ ] Address top bar layout issues on small screens
- [ ] UI Technology Consideration: Abstract UI and explore Tailwind CSS as an alternative/addition to MUI
- [ ] [Future]Pagination for user list in admin user management. To handle a lot of users. 
- [ ] Automated testing

### Backend Services 🟨
- [x] Basic Cloud Functions
- [x] Order aggregation
- [x] Real-time updates
- [ ] Cloud Function: Update recipe stats (lastPreparedDate, timesPrepared) on meal cycle completion
- [ ] [Future]AI Services integration
- [ ] Suggested Frameworks: CrewAI, Google ADK for multi-agent workflows (Recipe Processing, Shopping List, Cook Sequencing)
- [ ] Data modeling consideration: Evolve 'cook' representation to 'cook_session' for better tracking
- [ ] Advanced security rules - *Initial role-based rules implemented (users, recipes, mealCycles, orders); admins have broader permissions, users restricted. MealCycles not deletable. Further review and refinement pending.*
- [ ] Robust unit conversion logic (potentially as a shared utility or microservice)

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
- 🟨 In Progress
- ⬜ Not Started
