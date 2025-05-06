import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db, functions } from '../firebaseConfig'; // Assuming functions is exported from firebaseConfig for httpsCallable
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable
import { Container, Typography, TextField, Button, Box, Alert, CircularProgress, Paper } from '@mui/material';

function AcceptInvitePage() {
  const { inviteId } = useParams();
  const navigate = useNavigate();

  const [inviteData, setInviteData] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');

  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signUpError, setSignUpError] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!inviteId) {
        setInviteError('No invite ID provided.');
        setLoadingInvite(false);
        return;
      }
      try {
        const inviteRef = doc(db, 'invites', inviteId);
        const inviteSnap = await getDoc(inviteRef);
        if (inviteSnap.exists()) {
          const data = inviteSnap.data();
          if (data.status !== 'pending') {
            setInviteError('This invitation is no longer valid (it may have already been accepted or expired).');
          } else {
            setInviteData({ id: inviteSnap.id, ...data });
          }
        } else {
          setInviteError('Invalid invitation link. Please check the link and try again.');
        }
      } catch (err) {
        console.error('Error fetching invite:', err);
        setInviteError('Could not load invitation details. Please try again later.');
      }
      setLoadingInvite(false);
    };
    fetchInvite();
  }, [inviteId]);

  const handleSignUp = async (event) => {
    event.preventDefault();
    setSignUpError('');
    setSignUpLoading(true);

    if (!displayName.trim()) {
      setSignUpError('Please enter a display name.');
      setSignUpLoading(false);
      return;
    }
    if (!password) { // Basic password check
        setSignUpError('Please enter a password.');
        setSignUpLoading(false);
        return;
    }

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, inviteData.email, password);
      const user = userCredential.user;
      console.log('User created via invite in Auth:', user);

      // 2. Send verification email (as per standard signup)
      await sendEmailVerification(user);
      console.log('Verification email sent to invited user:', user.email);

      // 3. Create user document in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        roles: ['eater'], // Default role for invited users, can be customized
        locationStatus: 'carry_out', // Default
        householdId: inviteData.householdId || null, // Assign household if part of invite
        creationDate: serverTimestamp(),
        notificationPrefs: {},
        acceptedInviteId: inviteId, // Link to the invite
        invitedBy: inviteData.createdBy, // Store who invited them
      });
      console.log('User document created in Firestore for UID:', user.uid, 'from invite', inviteId);

      // 4. Update the invite document status
      const inviteRef = doc(db, 'invites', inviteId);
      await updateDoc(inviteRef, {
        status: 'accepted',
        acceptedByUid: user.uid,
        acceptedAt: serverTimestamp(),
      });
      console.log('Invite document updated to accepted:', inviteId);

      setSignUpLoading(false);
      setSignUpSuccess(true);
      // Don't navigate immediately, show success message.
      // User will be redirected by ProtectedRoute to /verify-email after they try to login or refresh.

    } catch (err) {
      console.error('Sign up from invite error:', err);
      if (err.code === 'auth/email-already-in-use') {
        // This case might mean they signed up independently before accepting.
        // Or it's a race condition if invite wasn't checked properly before navigating here.
        setSignUpError('This email address is already associated with an account. If this is you, please log in.');
         // Optionally, you could try to link the invite to the existing account if that's desired UX.
      } else if (err.code === 'auth/weak-password') {
        setSignUpError('Password should be at least 6 characters.');
      } else {
        setSignUpError('Failed to create account. Please try again.');
      }
      setSignUpLoading(false);
    }
  };

  if (loadingInvite) {
    return <Container sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Container>;
  }

  if (inviteError) {
    return (
      <Container maxWidth="sm" sx={{ mt: 5 }}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>Invitation Error</Typography>
          <Alert severity="error">{inviteError}</Alert>
          <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>Go to Login</Button>
        </Paper>
      </Container>
    );
  }

  if (!inviteData) { // Should be caught by inviteError, but as a fallback
    return <Container sx={{ textAlign: 'center', mt: 5 }}><Typography>Could not load invitation.</Typography></Container>;
  }

  if (signUpSuccess) {
    return (
        <Container maxWidth="sm" sx={{ mt: 5 }}>
            <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h5" color="primary" gutterBottom>Account Created!</Typography>
                <Alert severity="success">
                    Your account has been successfully created using the invitation for {inviteData.email}.<br />
                    A verification email has been sent to your address. Please verify your email and then log in.
                </Alert>
                <Button variant="contained" onClick={() => navigate('/login')} sx={{ mt: 2 }}>Proceed to Login</Button>
            </Paper>
        </Container>
    );
  }

  return (
    <Container maxWidth="xs" sx={{ mt: 5 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          Accept Invitation & Sign Up
        </Typography>
        <Typography align="center" sx={{ mb: 2 }}>
          You have been invited to join as <strong>{inviteData.email}</strong>.
          Please set your display name and password to create your account.
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
             disabled={signUpLoading}
           />
          <TextField // Email is from inviteData, not user input
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            value={inviteData.email}
            disabled // Email is pre-filled and disabled
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
            disabled={signUpLoading}
          />
          {signUpError && (
            <Alert severity="error" sx={{ width: '100%', mt: 2, mb:1 }}>
              {signUpError}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={signUpLoading}
          >
            {signUpLoading ? <CircularProgress size={24}/> : 'Create Account & Accept Invite'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default AcceptInvitePage; 