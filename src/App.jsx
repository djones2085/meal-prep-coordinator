import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

// --- Pages ---
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'

// --- Placeholder Pages ---
// We'll update these soon
import DashboardPage from './pages/DashboardPage'
import RecipesPage from './pages/RecipesPage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import MealCyclePage from './pages/MealCyclePage'
import AddRecipePage from './pages/AddRecipePage'

function NotFoundPage() {
    // Maybe use MUI Typography here later
    return <h2>404 - Page Not Found</h2>
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

        {/* Protected routes rendered within the Layout */}
        {/* Routes nested under ProtectedRoute require authentication */}
        {/* The ProtectedRoute now renders the Layout, which contains the Outlet */}
        <Route element={<ProtectedRoute />}>
             <Route element={<Layout />}> {/* Wrap protected pages in Layout */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/recipes" element={<RecipesPage />} />
                <Route path="/recipes/:recipeId" element={<RecipeDetailPage />} />
                <Route path="/add-recipe" element={<AddRecipePage />} />
                <Route path="/meal-cycle" element={<MealCyclePage />} />
                {/* Add other protected routes inside Layout here */}
            </Route>
        </Route>

        {/* Catch-all route for 404 Not Found */}
        {/* This should ideally be outside the Layout/ProtectedRoute or handled within */}
         <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {/* --- End Route Definitions --- */}
    </>
  )
}

export default App
