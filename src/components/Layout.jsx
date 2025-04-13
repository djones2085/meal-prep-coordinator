import React from 'react';
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  CircularProgress, // For loading state
} from '@mui/material';

function Layout() {
  const { currentUser, loading } = useAuth(); // Get loading state from context
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Optionally show an error message to the user
    }
  };

  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <RouterLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              Meal Prep Coordinator
            </RouterLink>
          </Typography>

          {/* Conditional Navigation Buttons */}
          {currentUser ? (
            <>
              <Button color="inherit" component={RouterLink} to="/">Dashboard</Button>
              <Button color="inherit" component={RouterLink} to="/recipes">Recipes</Button>
              <Button color="inherit" component={RouterLink} to="/add-recipe">Add Recipe</Button>
              <Button color="inherit" component={RouterLink} to="/meal-cycle">Meal Cycle</Button>

              {/* Add other authenticated links here */}
              <Button color="inherit" onClick={handleLogout}>Logout ({currentUser.email})</Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">Login</Button>
              <Button color="inherit" component={RouterLink} to="/signup">Sign Up</Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Main content area */}
      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {/* Outlet renders the matched child route component */}
        <Outlet />
      </Container>

      {/* Optional Footer */}
      <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: (theme) => theme.palette.grey[200] }}>
        <Container maxWidth="sm">
          <Typography variant="body2" color="text.secondary" align="center">
            {'© '}
            {new Date().getFullYear()}
            {' Meal Prep Co.'}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

export default Layout; 