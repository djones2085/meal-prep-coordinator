import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Box, Typography, Link } from '@mui/material';
import { TextField, Button, Alert, PageContainer } from '../components/mui';

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        if (!email) {
            setError('Please enter your email address.');
            setIsLoading(false);
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMessage('Password reset email sent! Please check your inbox (and spam folder).');
        } catch (err) {
            console.error('Password reset error:', err);
            if (err.code === 'auth/user-not-found') {
                setError('No user found with this email address.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else {
                setError('An unexpected error occurred. Please try again later.');
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
                    Reset Password
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3, width: '100%' }}>
                    <TextField
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!error} // Show error state on text field if error exists
                        disabled={isLoading}
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
                        Send Reset Email
                    </Button>
                    <Typography variant="body2" align="center">
                        Remember your password?{' '}
                        <Link component={RouterLink} to="/login" variant="body2">
                            Login
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </PageContainer>
    );
}

export default ForgotPasswordPage; 