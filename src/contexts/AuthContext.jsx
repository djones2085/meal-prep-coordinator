import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig'; // Import your Firebase auth instance and db
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore functions

// Create the context
const AuthContext = createContext();

// Create a provider component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Add userProfile state
  const [loading, setLoading] = useState(true); // Add loading state

  // Define logout function
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // User is logged in, fetch their profile
        console.log('Auth State Changed: Logged in as', user.email, 'UID:', user.uid);
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile({ uid: user.uid, ...userDocSnap.data() });
            console.log('User profile loaded:', { uid: user.uid, ...userDocSnap.data() });
          } else {
            setUserProfile(null); // Or some default profile / error state
            console.warn('User profile document does not exist for UID:', user.uid);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
        }
      } else {
        // User is logged out
        setUserProfile(null);
        console.log('Auth State Changed: Logged out');
      }
      setLoading(false); // Set loading to false once auth state and profile are determined
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Value provided to consuming components
  const value = {
    currentUser,
    userProfile, // Add userProfile to context value
    logout, // Add logout function to context value
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