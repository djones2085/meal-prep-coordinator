import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Import your Firebase auth instance

// Create the context
const AuthContext = createContext();

// Create a provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false); // Set loading to false once auth state is determined
      console.log('Auth State Changed:', user ? `Logged in as ${user.email}` : 'Logged out');
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Value provided to consuming components
  const value = {
    currentUser,
    // We can add more auth-related functions here later (e.g., logout)
  };

  // Render children only when not loading to prevent rendering protected routes prematurely
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Create a custom hook to use the auth context easily
export function useAuth() {
  return useContext(AuthContext);
} 