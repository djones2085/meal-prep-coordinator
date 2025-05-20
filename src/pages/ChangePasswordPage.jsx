import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Box, Typography, TextField, Button, Alert } from '@mui/material';
import { PageContainer } from '../components/mui';
import { getPasswordStrengthErrors, passwordRequirementsMessage } from '../utils/passwordUtils';

function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChangePassword = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setError('All fields are required.');
            setIsLoading(false);
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setError('New passwords do not match.');
            setIsLoading(false);
            return;
        }

        const passwordErrors = getPasswordStrengthErrors(newPassword);
        if (passwordErrors.length > 0) {
            setError('New password is not strong enough: ' + passwordErrors.join(' '));
            setIsLoading(false);
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            setError('No user is currently signed in. Please log in again.');
            setIsLoading(false);
            navigate('/login');
            return;
        }

        try {
            // Re-authenticate the user
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Update the password
            await updatePassword(user, newPassword);
            setSuccessMessage('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            console.error('Change password error:', err);
            if (err.code === 'auth/wrong-password') {
                setError('Incorrect current password.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please try again later.');
            } else {
                setError('Failed to change password. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageContainer maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Change Password
                </Typography>
                <Box component="form" onSubmit={handleChangePassword} noValidate sx={{ mt: 3, width: '100%' }}>
                    <TextField
                        required
                        fullWidth
                        name="currentPassword"
                        label="Current Password"
                        type="password"
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={isLoading}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        required
                        fullWidth
                        name="newPassword"
                        label="New Password"
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                        helperText={passwordRequirementsMessage()} 
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        required
                        fullWidth
                        name="confirmNewPassword"
                        label="Confirm New Password"
                        type="password"
                        id="confirmNewPassword"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        disabled={isLoading}
                        sx={{ mb: 2 }}
                    />
                    {error && (
                        <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                            {error}
                        </Alert>
                    )}
                    {successMessage && (
                        <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
                            {successMessage}
                        </Alert>
                    )}
                    <Button
                        type="submit"
                        fullWidth
                        isLoading={isLoading}
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Update Password
                    </Button>
                </Box>
            </Box>
        </PageContainer>
    );
}

export default ChangePasswordPage; 