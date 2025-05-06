import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig'; // Adjust path as needed
import { 
    Container, 
    Typography, 
    TextField, 
    Button, 
    Box, 
    Alert, 
    CircularProgress,
    Paper,
    Link as MuiLink 
} from '@mui/material';

const createInviteFunction = httpsCallable(functions, 'createInvite');

function AdminInvitesPage() {
  const [emailToInvite, setEmailToInvite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const handleCreateInvite = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setGeneratedLink('');
    setLoading(true);

    if (!emailToInvite.trim()) {
      setError('Please enter an email address.');
      setLoading(false);
      return;
    }

    try {
      const result = await createInviteFunction({ email: emailToInvite });
      const inviteId = result.data.inviteId;
      if (inviteId) {
        const newLink = `${window.location.origin}/accept-invite/${inviteId}`;
        setGeneratedLink(newLink);
        setSuccessMessage(`Successfully created an invite for ${emailToInvite}. Share the link below.`);
        setEmailToInvite(''); // Clear the input field
      } else {
        throw new Error('Invite ID not returned from function.');
      }
    } catch (err) {
      console.error('Error calling createInvite function:', err);
      setError(err.message || 'Failed to create invite. Check console for details.');
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ mt: 3, p: 3 }}>
        <Typography component="h1" variant="h4" gutterBottom>
          Manage User Invitations
        </Typography>
        
        <Box component="form" onSubmit={handleCreateInvite} noValidate sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>Create New Invite</Typography>
          <TextField
            margin="normal"
            required
            fullWidth
            id="emailToInvite"
            label="Email Address to Invite"
            name="emailToInvite"
            autoComplete="email"
            autoFocus
            value={emailToInvite}
            onChange={(e) => setEmailToInvite(e.target.value)}
            disabled={loading}
          />
          {error && (
            <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
              {error}
            </Alert>
          )}
          {successMessage && !generatedLink && (
            <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
              {successMessage}
            </Alert>
          )}
          {generatedLink && (
            <Alert severity="success" sx={{ width: '100%', mt: 2, mb: 2 }}>
              {successMessage}<br/>
              <strong>Invite Link:</strong> <MuiLink href={generatedLink} target="_blank" rel="noopener">{generatedLink}</MuiLink>
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create Invite Link'}
          </Button>
        </Box>

        {/* Future: Display list of pending/accepted invites */}
      </Paper>
    </Container>
  );
}

export default AdminInvitesPage; 