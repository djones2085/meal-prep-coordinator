import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Container, Typography, Button, Box, Alert, CircularProgress } from '@mui/material';

function EmailVerificationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleResendVerification = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        setSuccessMessage('A new verification email has been sent. Please check your inbox (and spam folder).');
      } catch (err) {
        console.error('Error resending verification email:', err);
        setError('Failed to resend verification email. Please try again shortly.');
      }
    } else {
      setError('No user is currently signed in.'); // Should ideally not happen if routed correctly
      navigate('/login');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out. Please try again.');
    }
  };

  // Check if user is already verified and redirect if so
  // This handles the case where user verifies in another tab and comes back
  React.useEffect(() => {
    if (auth.currentUser && auth.currentUser.emailVerified) {
      navigate('/'); // Navigate to dashboard or home
    }
    // Set up a listener for auth state changes to catch immediate verification
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user && user.emailVerified) {
        navigate('/');
      } else if (!user) {
        navigate('/login'); // If user logs out somehow
      }
    });
    return () => unsubscribe(); // Cleanup listener
  }, [navigate]);


  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography component="h1" variant="h5" gutterBottom>
          Verify Your Email
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          An email has been sent to{' '}
          <strong>{auth.currentUser ? auth.currentUser.email : 'your email address'}</strong> with a
          link to verify your account. Please check your inbox (and spam folder).
        </Typography>
        <Typography variant="body2" sx={{ mb: 3 }}>
          You need to verify your email to access all features of the application.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Button
          variant="contained"
          onClick={handleResendVerification}
          disabled={loading}
          sx={{ mb: 2, width: '100%' }}
        >
          {loading ? <CircularProgress size={24} /> : 'Resend Verification Email'}
        </Button>

        <Button
          variant="outlined"
          onClick={handleLogout}
          sx={{ width: '100%' }}
        >
          Log Out
        </Button>
      </Box>
    </Container>
  );
}

export default EmailVerificationPage; 