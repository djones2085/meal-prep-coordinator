import React from 'react';
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Container,
    Link
} from '@mui/material';

function Layout() {
    const { currentUser, userProfile, logout } = useAuth(); // Get userProfile for roles
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout(); // Ensure logout is correctly implemented in AuthContext if not already
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out:", error);
            // TODO: Show error to user, e.g., via a Snackbar
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    {/* App Title/Brand */}
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <Link component={RouterLink} to={currentUser ? "/dashboard" : "/"} sx={{ textDecoration: 'none', color: 'inherit' }}>
                            Meal Prep Coordinator
                        </Link>
                    </Typography>

                    {/* Navigation Links (conditionally rendered based on auth state) */}
                    {currentUser && (
                        <>
                            <Button color="inherit" component={RouterLink} to="/dashboard">Dashboard</Button>
                            <Button color="inherit" component={RouterLink} to="/recipes">Recipes</Button>
                            {/* Add other common links here as needed, e.g., Add Recipe, Meal Cycle */}
                            {/* <Button color="inherit" component={RouterLink} to="/add-recipe">Add Recipe</Button> */}
                            {/* <Button color="inherit" component={RouterLink} to="/meal-cycle">Meal Cycle</Button> */}
                            
                            {/* Admin Link: Conditionally rendered based on user's role */}
                            {userProfile?.roles?.includes('admin') && (
                                <Button
                                    color="inherit"
                                    component={RouterLink}
                                    to="/admin"
                                >
                                    Admin
                                </Button>
                            )}
                        </>
                    )}

                    {/* Auth actions (Login/Signup or Welcome/Logout) */}
                    <Box sx={{ marginLeft: 'auto' }}>
                        {currentUser ? (
                            <>
                                <Typography component="span" sx={{ mr: 2, color: 'inherit' }}>
                                    {userProfile?.displayName || currentUser.email}
                                </Typography>
                                <Button color="inherit" onClick={handleLogout}>
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button color="inherit" component={RouterLink} to="/login" sx={{ mr: 1 }}>
                                    Login
                                </Button>
                                <Button color="inherit" component={RouterLink} to="/signup">
                                    Sign Up
                                </Button>
                            </>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main content area */}
            <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
                {/* Outlet renders the matched child route component */}
                <Outlet />
            </Container>

            {/* Optional Footer could go here */}
        </Box>
    );
}

export default Layout; 