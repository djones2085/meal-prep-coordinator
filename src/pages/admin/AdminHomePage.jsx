import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Container,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Box,
    Grid,
    Link as MuiLink,
    Button
} from '@mui/material';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications'; // Example icon
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'; // Example icon
import LoopIcon from '@mui/icons-material/Loop'; // Example icon
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'; // Changed from SettingsApplicationsIcon for user management
import TuneIcon from '@mui/icons-material/Tune'; // Icon for settings
import EmailIcon from '@mui/icons-material/Email'; // Icon for Invites
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; // For Add Recipe button
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'; // Using an appropriate icon for recipes

const StatCard = ({ title, value, icon, linkTo }) => (
    <Paper elevation={2} sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
        <ListItemIcon>
            {icon}
        </ListItemIcon>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            {value}
        </Typography>
        <Button 
            variant="contained" 
            component={RouterLink} 
            to={linkTo}
            fullWidth
        >
            View Details
        </Button>
    </Paper>
);

function AdminHomePage() {
    // Dummy data for now - replace with actual data fetching
    const stats = {
        // ... existing code ...
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom component="h1">
                Admin Dashboard
            </Typography>
            
            <Typography paragraph color="text.secondary">
                Manage meal cycles, users, recipes, and application settings.
                 {/* TODO: Add role check reminder */}
                <Box component="span" sx={{ fontStyle: 'italic', display: 'block', mt: 1 }}>
                    (Note: Access to this section should be restricted to Admin users.)
                </Box>
            </Typography>

            <Paper elevation={3} sx={{ mt: 3 }}>
                <List>
                    <ListItem disablePadding>
                        <ListItemButton component={RouterLink} to="/admin/planning">
                            <ListItemIcon>
                                <PlaylistAddIcon />
                            </ListItemIcon>
                            <ListItemText primary="Plan New Meal Cycle" secondary="Create a new cycle, propose recipes, set deadlines." />
                        </ListItemButton>
                    </ListItem>
                     <ListItem disablePadding>
                        <ListItemButton component={RouterLink} to="/admin/cycles">
                             <ListItemIcon>
                                <LoopIcon />
                            </ListItemIcon>
                            <ListItemText primary="Manage Meal Cycles" secondary="View existing cycles and manually override statuses." />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton component={RouterLink} to="/admin/users">
                             <ListItemIcon>
                                <PeopleAltIcon />
                            </ListItemIcon>
                            <ListItemText primary="Manage Users" secondary="Assign roles, households, etc." />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton component={RouterLink} to="/admin/invites">
                            <ListItemIcon>
                                <EmailIcon />
                            </ListItemIcon>
                            <ListItemText primary="Manage Invites" secondary="Create and send new user invitations." />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding>
                        <ListItemButton component={RouterLink} to="/admin/settings">
                            <ListItemIcon>
                                <TuneIcon />
                            </ListItemIcon>
                            <ListItemText primary="Application Settings" secondary="Configure default meal cycle parameters, etc." />
                        </ListItemButton>
                    </ListItem>
                    {/* Add links to other future admin pages here */}
                    {/*
                     <ListItem disablePadding>
                        <ListItemButton component={RouterLink} to="/admin/users">
                             <ListItemIcon>
                                <SettingsApplicationsIcon />
                            </ListItemIcon>
                            <ListItemText primary="Manage Users" secondary="Assign roles, households, etc." />
                        </ListItemButton>
                    </ListItem>
                     */}
                </List>
            </Paper>

            <Typography variant="h5" sx={{ mt: 5, mb: 2 }}>Quick Actions</Typography>
            <Grid container spacing={3}>
                {/* Card for Add New Recipe */}
                <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                        <RestaurantMenuIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                        <Typography variant="h6" component="h3" gutterBottom sx={{ textAlign: 'center' }}>
                            Manage Recipes
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3, flexGrow: 1 }}>
                            Create new recipes or view and edit existing ones.
                        </Typography>
                        <Button 
                            variant="contained" 
                            component={RouterLink} 
                            to="/add-recipe" // Route to AddRecipePage
                            fullWidth
                            sx={{ mb: 1 }} // Margin bottom for spacing if multiple buttons
                        >
                            Add New Recipe
                        </Button>
                        <Button 
                            variant="outlined" 
                            component={RouterLink} 
                            to="/recipes" // Assuming /recipes is the route to the recipe list page
                            fullWidth
                        >
                            View All Recipes
                        </Button>
                    </Paper>
                </Grid>

                {/* Placeholder for other Quick Action Cards */}
                {/* Example for User Management (if you have a UserManagementPage) */}
                {/* 
                <Grid item xs={12} sm={6} md={4}>
                    <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                        <PeopleIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
                        <Typography variant="h6" component="h3" gutterBottom sx={{ textAlign: 'center' }}>
                            User Management
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3, flexGrow: 1 }}>
                            View, edit roles, and manage user accounts.
                        </Typography>
                        <Button 
                            variant="contained" 
                            component={RouterLink} 
                            to="/admin/users" // Update to your user management route
                            fullWidth
                        >
                            Manage Users
                        </Button>
                    </Paper>
                </Grid>
                */}

            </Grid>
        </Container>
    );
}

export default AdminHomePage; 