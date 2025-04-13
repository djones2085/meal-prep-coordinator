import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Import the useAuth hook

function ProtectedRoute() {
  const { currentUser } = useAuth();

  // If there's no logged-in user, redirect to the login page
  if (!currentUser) {
    // You can pass the current location to redirect back after login
    // return <Navigate to="/login" state={{ from: location }} replace />;
    return <Navigate to="/login" replace />;
  }

  // If the user is logged in, render the child route element
  // The <Outlet /> component renders the matched child route component
  return <Outlet />;
}

export default ProtectedRoute; 