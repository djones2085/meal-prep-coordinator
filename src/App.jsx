import { Routes, Route } from 'react-router-dom'
// import MainLayout from './components/layout/MainLayout.jsx'; // Remove MainLayout import
import Layout from './components/Layout.jsx'; // Import restored Layout
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

// --- Pages ---
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import EmailVerificationPage from './pages/EmailVerificationPage'
import AcceptInvitePage from './pages/AcceptInvitePage'

// --- Placeholder Pages ---
// We'll update these soon
import DashboardPage from './pages/DashboardPage'
import RecipesPage from './pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import MealCyclePage from './pages/MealCyclePage'
import AddRecipePage from './pages/AddRecipePage'
import ShopperShoppingListPage from './pages/ShopperShoppingListPage'
import MealPlanningPage from './pages/admin/MealPlanningPage'
import MealCycleManagementPage from './pages/admin/MealCycleManagementPage'
import AdminHomePage from './pages/admin/AdminHomePage'
import UserManagementPage from './pages/admin/UserManagementPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminInvitesPage from './pages/admin/AdminInvitesPage'

function NotFoundPage() {
    // Maybe use MUI Typography here later
    return <h2 className="text-center text-xl mt-8">404 - Page Not Found</h2>
}
// --- End Placeholders ---

function App() {
  // Remove useState for count and handleLogout - they moved to Layout
  // Remove useAuth import here if only used for handleLogout/currentUser display

  return (
    <>
      {/* Remove the old nav and default Vite content */}

      {/* --- Route Definitions --- */}
      <Routes>
        {/* Public routes rendered directly */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route path="/accept-invite/:inviteId" element={<AcceptInvitePage />} />

        {/* Protected routes for regular users, rendered within Layout */}
        <Route element={<ProtectedRoute />}>
             <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/recipes" element={<RecipesPage />} />
                <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
                <Route path="/add-recipe" element={<AddRecipePage />} />
                <Route path="/meal-cycle" element={<MealCyclePage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route index element={<DashboardPage />} />
            </Route>
        </Route>

        {/* Protected routes for shopper users, rendered within Layout */}
        <Route element={<ProtectedRoute requiredRoles={['shopper', 'admin']} />}>
            <Route element={<Layout />}>
                <Route path="/shopping-list" element={<ShopperShoppingListPage />} />
            </Route>
        </Route>

        {/* Protected routes for admin users, rendered within Layout */}
        <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route element={<Layout />}>
                <Route path="/admin" element={<AdminHomePage />} />
                <Route path="/admin/planning" element={<MealPlanningPage />} />
                <Route path="/admin/cycles" element={<MealCycleManagementPage />} />
                <Route path="/admin/users" element={<UserManagementPage />} />
                <Route path="/admin/invites" element={<AdminInvitesPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
        </Route>

        {/* Catch-all route for 404 Not Found */}
         <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {/* --- End Route Definitions --- */}
    </>
  )
}

export default App
