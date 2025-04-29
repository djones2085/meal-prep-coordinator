import React from 'react';
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Container
} from '@mui/material';

function Layout() {
    const { currentUser, logout, isAdmin } = useAuth(); // Assuming isAdmin is available
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out:", error);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <RouterLink to="/dashboard" style={{ textDecoration: 'none', color: 'inherit' }}>
                            Meal Prep Coordinator
                        </RouterLink>
                    </Typography>

                    {/* Conditional Navigation Buttons */}
                    {currentUser ? (
                        <>
                            <Button color="inherit" component={RouterLink} to="/dashboard">Dashboard</Button>
                            <Button color="inherit" component={RouterLink} to="/recipes">Recipes</Button>
                            <Button color="inherit" component={RouterLink} to="/add-recipe">Add Recipe</Button>
                            <Button color="inherit" component={RouterLink} to="/meal-cycle">Meal Cycle</Button>

                            {/* Admin Link - Temporarily removing conditional rendering */}
                            {/* {isAdmin && ( // Removed check */} 
                                <Button
                                    color="inherit"
                                    component={RouterLink}
                                    to="/admin"
                                >
                                    Admin
                                </Button>
                            {/* )} // Removed check */}

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

            {/* Optional Footer could go here */}
        </Box>
    );
}

export default Layout; 