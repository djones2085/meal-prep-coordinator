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

### Authentication ✅
- [x] Email/Password sign-up/login
- [x] Global auth state (React Context)
- [x] Protected routes
- [x] Logout functionality
- [x] Firestore user profile creation on signup
- [x] Role-based access control (Admin vs Regular users) - *Frontend routes protected using roles from Firestore. Admin links in UI are conditional. Unauthorized access attempts are handled with notifications.*
- [x] Email confirmation - *Users must verify email after signup. Redirects to verification page with resend option.*
- [x] User invites system - *Admins can generate invite links via an admin page. Invitees use a special link to sign up. Firestore `invites` collection tracks status. Cloud Function `createInvite` handles invite generation. Security rules in place.*
    - [x] Admin can generate a unique invite link for an email.
    - [x] Invitee uses the link to access a special sign-up page.
    - [x] On sign-up, invite status is updated.
    - [x] Firestore collection: `invites` (stores `invitedEmail`, `status` \["pending", "accepted", "expired"\], `createdAt`, `createdBy` (admin UID), `acceptedByUid`, `acceptedAt`).
    - [ ] Future: Automated email sending for invites.
    - [ ] Future: Non-admins can invite to households.
    - [ ] Currently broken(issue with creating user from acceptance pageDownload the React DevTools for a better development experience: https://react.dev/link/react-devtools
AuthContext.jsx:26 Auth State Changed: Logged in as markdonaho@gmail.com UID: atqkp6pIqYeEeFbU0K175crcbA62
AuthContext.jsx:32 User profile loaded: Object
AuthContext.jsx:26 Auth State Changed: Logged in as donaho03@yahoo.com UID: 6uAq6jUEdPZ74llk04MgrJAZd483
AcceptInvitePage.jsx:72 User created via invite in Auth: _UserImpl
AuthContext.jsx:35 User profile document does not exist for UID: 6uAq6jUEdPZ74llk04MgrJAZd483
(anonymous) @ AuthContext.jsx:35Understand this warning
AcceptInvitePage.jsx:76 Verification email sent to invited user: donaho03@yahoo.com
AcceptInvitePage.jsx:109 Sign up from invite error: ReferenceError: setDoc is not defined
    at handleSignUp (AcceptInvitePage.jsx:80:7)
handleSignUp @ AcceptInvitePage.jsx:109Understand this error

                
          
          
          
         Chrome is moving towards a new experience that allows users to choose to browse without third-party cookies.)
- [ ] Household management (Future)

### Recipe Management ✅
- [x] Data model defined
- [x] Firestore rules for read/create
- [x] Bulk upload script
- [x] Manual Add Recipe form
- [x] Recipe List (RecipesPage)
- [x] Recipe Detail (RecipeDetailPage)
- [ ] Recipe photo uploads/display
- [ ] Agent: Recipe Processing (Parse unstructured text, standardize units/format, apply standards like protein goals, create structured recipe object)
- [ ] Recipe Notes: Field for general cooking tips, source, variations, chef-to-chef advice on the recipe itself

### Meal Cycle Workflow 🟨
- [x] Basic cycle creation (Admin)
- [x] Order submission (Users)
- [ ] User order modifications (e.g., "no cheese", "extra sauce"; pre-defined & free-text 'Other' option)
- [ ] Track order type: Dine-in (glass container) vs. Carry-out (to-go container)
- [ ] Users can modify their submitted orders before the deadline (from dashboard/order history)
- [x] Order aggregation
- [ ] Store scaled recipe (ingredients, instructions) in mealCycle document after aggregation/scaling
- [x] Status management
- [ ] Shopping list generation (Basic)
- [ ] Assign roles (cook, shopper) for specific meal cycles (Future)
- [ ] Agent: Shopping List Generation (Aggregate ingredients intelligently across orders, handle complex unit conversions/standardization, potentially optimize quantities)
- [ ] Shopping list: Admin approval step
- [ ] Shopping list: Editable by admin/shopper
- [ ] Shopping list: Shopper can mark items as 'available on hand'
- [ ] Chef/Cook: Ingredient checklist before starting to cook
- [ ] Chef/Cook: Access to historical cook notes for the current recipe
- [ ] Voting system
- [ ] Cook assignment
- [ ] Shopper assignment
- [ ] Distribution tracking
- [ ] Feedback collection (General)
- [ ] Feedback: Specific feedback channel/form for shoppers
- [ ] Feedback: Eater ratings/comments for cooks (e.g., 5-star system)
- [ ] Agent: Cook Sequencing (Optimize cooking task order based on prep/cook times and target completion)

### User Interface 🟨
- [x] Basic responsive layout
- [x] Material-UI components
- [x] Loading states
- [x] Error handling
- [ ] Enhanced meal cycle page: Display user names, order counts, and dine-in/carry-out status per user
- [ ] Advanced state management (Zustand/Redux)
- [ ] PWA capabilities
- [ ] Notifications (FCM)
- [ ] UI/UX polish
    - [ ] Address top bar layout issues on small screens
- [ ] UI Technology Consideration: Abstract UI and explore Tailwind CSS as an alternative/addition to MUI
- [ ] Pagination for user list in admin user management. To handle a lot of users. (Future)

### Backend Services 🟨
- [x] Basic Cloud Functions
- [x] Order aggregation
- [x] Real-time updates
- [ ] Cloud Function: Update recipe stats (lastPreparedDate, timesPrepared) on meal cycle completion
- [ ] AI Services integration
- [ ] Suggested Frameworks: CrewAI, Google ADK for multi-agent workflows (Recipe Processing, Shopping List, Cook Sequencing)
- [ ] Data modeling consideration: Evolve 'cook' representation to 'cook_session' for better tracking
- [ ] Advanced security rules - *Initial role-based rules implemented (users, recipes, mealCycles, orders); admins have broader permissions, users restricted. MealCycles not deletable. Further review and refinement pending.*
- [ ] Robust unit conversion logic (potentially as a shared utility or microservice)
- [ ] Automated testing

## Current Focus

1. **Meal Cycle Management**
   - [x] Create new cycles
   - [x] Set deadlines
   - [x] Admin configurable defaults (e.g., order deadline day/time, target cook date)
   - [x] Choose recipes
   - [x] Track status
   - [x] Assign roles (cook, shopper)

2. **Order Management**
   - [x] Submit orders
   - [x] Modify orders
   - [x] View order history
   - [x] Aggregate orders
   - [ ] Track distribution

3. **Shopping & Cooking**
   - [x] Generate shopping lists
   - [ ] Shopping list: Admin approval, editable, shopper can mark items 'on hand'
   - [ ] Chef: Ingredient checklist, access to historical cook notes
   - [ ] Track shopping progress
   - [ ] Record cooking notes
   - [ ] Manage packaging

## Next Steps

1. **Phase 2: Role Enablement & Data Association**
   - [x] Implement user role management - *Basic admin role check in place. TODO: Admin UI for assigning/managing user roles. Ensure users cannot modify their own roles (partially covered by Firestore rules, client-side checks also relevant).*
   - Create household management
   - [ ] Update security rules - *Initial admin/user role distinctions made. Ongoing refinement needed as features are added.*
   - Add user invites

2. **Phase 3: Automation & Integration**
   - Integrate AI services
   - Implement recipe scaling
   - Enhance shopping list generation (including robust unit conversion)
   - Add automated notifications

3. **Phase 4: Feedback & Polish**
   - Add feedback collection
   - Implement rating system
   - Enhance UI/UX
   - Add PWA features

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
