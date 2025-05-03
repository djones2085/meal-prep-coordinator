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
- [ ] Role-based access control (Admin vs Regular users)
- [ ] User invites system
- [ ] Household management

### Recipe Management ✅
- [x] Data model defined
- [x] Firestore rules for read/create
- [x] Bulk upload script
- [x] Manual Add Recipe form
- [x] Recipe List (RecipesPage)
- [x] Recipe Detail (RecipeDetailPage)
- [ ] Recipe photo uploads/display
- [ ] Recipe scaling functionality
- [ ] Recipe formatting AI integration
- [ ] Ingredient unit normalization/conversion (e.g., tsp to tbsp, cups to ml)

### Meal Cycle Workflow 🟨
- [x] Basic cycle creation (Admin)
- [x] Order submission (Users)
- [x] Order aggregation
- [x] Status management
- [x] Shopping list generation
- [ ] Robust ingredient unit conversion/aggregation for shopping lists (handle metric, imperial, informal units like 'pinch')
- [ ] Voting system
- [ ] Cook assignment
- [ ] Shopper assignment
- [ ] Distribution tracking
- [ ] Feedback collection

### User Interface 🟨
- [x] Basic responsive layout
- [x] Material-UI components
- [x] Loading states
- [x] Error handling
- [ ] Advanced state management (Zustand/Redux)
- [ ] PWA capabilities
- [ ] Notifications (FCM)
- [ ] UI/UX polish

### Backend Services 🟨
- [x] Basic Cloud Functions
- [x] Order aggregation
- [x] Real-time updates
- [ ] AI Services integration
- [ ] Advanced security rules
- [ ] Robust unit conversion logic (potentially as a shared utility or microservice)
- [ ] Automated testing

## Current Focus

The project is currently in Phase 1 of development, focusing on the core meal cycle workflow:

1. **Meal Cycle Management**
   - [x] Create new cycles
   - [x] Set deadlines
   - [x] Choose recipes
   - [x] Track status
   - [ ] Assign roles (cook, shopper)

2. **Order Management**
   - [x] Submit orders
   - [x] Modify orders
   - [x] View order history
   - [x] Aggregate orders
   - [ ] Track distribution

3. **Shopping & Cooking**
   - [x] Generate shopping lists
   - [ ] Track shopping progress
   - [ ] Record cooking notes
   - [ ] Manage packaging

## Next Steps

1. **Phase 2: Role Enablement & Data Association**
   - Implement user role management
   - Create household management
   - Update security rules
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
