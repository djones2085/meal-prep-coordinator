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
    Link,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

function Layout() {
    const { currentUser, userProfile, logout } = useAuth(); // Get userProfile for roles
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = async () => {
        try {
            await logout(); // Ensure logout is correctly implemented in AuthContext if not already
            navigate('/login');
        } catch (error) {
            console.error("Failed to log out:", error);
            // TODO: Show error to user, e.g., via a Snackbar
        }
    };

    const drawerWidth = 240;

    const navItems = [
        // Basic links available when logged in
        ...(currentUser ? [
            { text: 'Dashboard', to: '/dashboard', adminOnly: false },
            { text: 'Recipes', to: '/recipes', adminOnly: false },
        ] : []),
        // Admin-specific links
        ...(currentUser && userProfile?.roles?.includes('admin') ? [
            { text: 'Admin Home', to: '/admin', adminOnly: true },
        ] : []),
    ];

    const drawerContent = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>
                Menu
            </Typography>
            <Divider />
            <List>
                {/* Conditional Welcome Message */} 
                {currentUser && userProfile && (
                    <ListItem>
                        <ListItemText primary={`Hi, ${userProfile.displayName || currentUser.email}`} />
                    </ListItem>
                )}
                {currentUser && userProfile && <Divider />} 

                {navItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton component={RouterLink} to={item.to}>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}

                {/* Auth links in Drawer */} 
                {currentUser ? (
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleLogout}>
                            <ListItemText primary="Logout" />
                        </ListItemButton>
                    </ListItem>
                ) : (
                    <>
                        <ListItem disablePadding>
                            <ListItemButton component={RouterLink} to="/login">
                                <ListItemText primary="Login" />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton component={RouterLink} to="/signup">
                                <ListItemText primary="Sign Up" />
                            </ListItemButton>
                        </ListItem>
                    </>
                )}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2 }} // Display on all screens
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* App Title/Brand - Centered or to one side if hamburger is edge=start */}
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'center' }}>
                        <Link component={RouterLink} to={currentUser ? "/dashboard" : "/"} sx={{ textDecoration: 'none', color: 'inherit' }}>
                            Meal Prep Coordinator
                        </Link>
                    </Typography>

                    {/* Navigation Links for larger screens - REMOVED */}
                    {/* <Box sx={{ display: { xs: 'none', sm: 'block' } }}> ... </Box> */}

                    {/* Auth actions for larger screens - REMOVED */}
                    {/* <Box sx={{ display: { xs: 'none', sm: 'block' }, marginLeft: navItems.length > 0 ? 2 : 'auto' }}> ... </Box> */}
                </Toolbar>
            </AppBar>

            <Box component="nav">
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        // display: { xs: 'block', sm: 'none' }, // Drawer is controlled by IconButton now, available on all screens
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawerContent} 
                </Drawer>
            </Box>

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