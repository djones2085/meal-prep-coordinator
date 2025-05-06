import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import the useAuth hook

function ProtectedRoute({ requiredRole }) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation(); // Get current location

  if (loading) {
    // Optional: Render a loading spinner or null while auth/profile is being checked
    return null; // Or <LoadingSpinner />
  }

  // If there's no logged-in user, redirect to the login page
  if (!currentUser) {
    // You can pass the current location to redirect back after login
    // return <Navigate to="/login" state={{ from: location }} replace />;
    return <Navigate to="/login" replace />;
  }

  // If user is logged in but email is not verified, redirect to verification page
  // unless they are already on it.
  if (!currentUser.emailVerified && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }

  // If a requiredRole is specified and the user doesn't have it, redirect
  if (requiredRole && (!userProfile || !userProfile.roles || !userProfile.roles.includes(requiredRole))) {
    console.log(`User ${currentUser.email} does not have required role: ${requiredRole}. Roles: ${userProfile?.roles}`);
    // Redirect to home page or a specific unauthorized page
    return <Navigate to="/" replace state={{ message: "You do not have permission to access this page. Admin role required.", severity: "error" }} />;
  }

  // If the user is logged in and has the required role (if specified), render the child route element
  // The <Outlet /> component renders the matched child route component
  return <Outlet />;
}

export default ProtectedRoute; 