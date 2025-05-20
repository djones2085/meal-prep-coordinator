import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
// Import Firestore functions and db instance
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; // Import db along with auth
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material'; // Assuming MUI is used
import { getPasswordStrengthErrors, passwordRequirementsMessage } from '../utils/passwordUtils'; // Import password utils

function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Add confirm password state
  const [displayName, setDisplayName] = useState(''); // Add state for display name
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // State for success message
  const [loading, setLoading] = useState(false); // Add loading state
  const navigate = useNavigate();

  const handleSignUp = async (event) => {
    event.preventDefault();
    setError(''); // Clear previous errors
    setSuccessMessage(''); // Clear previous success message
    setLoading(true); // Set loading state

    // Basic validation (can be enhanced)
    if (!displayName.trim()) {
        setError('Please enter a display name.');
        setLoading(false);
        return;
    }

    if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
    }

    const passwordErrors = getPasswordStrengthErrors(password);
    if (passwordErrors.length > 0) {
        setError(passwordErrors.join(' ')); // Display all strength errors
        setLoading(false);
        return;
    }

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created in Auth:', user);

      // Send verification email
      await sendEmailVerification(user);
      console.log('Verification email sent to:', user.email);
      setSuccessMessage('Account created! Please check your email to verify your account before logging in.');

      // 2. Create user document in Firestore
      const userDocRef = doc(db, 'users', user.uid); // Reference to the new document
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(), // Use the name from the form
        roles: ['eater'], // Default role
        locationStatus: 'carry_out', // Default location preference
        householdId: null, // Not assigned initially
        creationDate: serverTimestamp(), // Use server timestamp
        notificationPrefs: {}, // Default empty preferences
        // Add other fields from your data model with defaults if needed
      });

      console.log('User document created in Firestore for UID:', user.uid);

      // 3. Redirect after successful sign-up and document creation
      setLoading(false);
      // navigate('/'); // Redirect to dashboard - Let's hold off on redirecting immediately
      // Instead, we show the success message and the user can then navigate to login.

    } catch (err) {
      console.error('Sign up error:', err);
      // Provide more user-friendly error messages
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use.');
      } else if (err.code === 'auth/weak-password') {
        // This might still be triggered by Firebase for its own rules, 
        // but our custom check should catch most issues first.
        setError('Password is too weak. ' + passwordRequirementsMessage());
      } else {
        setError('Failed to create account. Please try again.');
      }
      console.error("Firestore error details (if applicable):", err); // Log details if it's a Firestore error
      setLoading(false); // Reset loading state on error
    }
  };

  return (
    // Using MUI components for layout
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign Up
        </Typography>
        <Box component="form" onSubmit={handleSignUp} noValidate sx={{ mt: 1 }}>
           <TextField
             margin="normal"
             required
             fullWidth
             id="displayName"
             label="Display Name"
             name="displayName"
             autoComplete="name"
             autoFocus
             value={displayName}
             onChange={(e) => setDisplayName(e.target.value)}
             disabled={loading}
           />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password (min. 6 characters)"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            helperText={passwordRequirementsMessage()} // Show requirements as helper text
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 1 }}>
              {error}
            </Alert>
          )}
          {successMessage && ( // Display success message
            <Alert severity="success" sx={{ width: '100%', mt: 1 }}>
              {successMessage}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading} // Disable button while loading
          >
            {loading ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default SignUpPage; 