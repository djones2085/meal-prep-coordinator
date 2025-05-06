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
    Box
} from '@mui/material';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications'; // Example icon
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'; // Example icon
import LoopIcon from '@mui/icons-material/Loop'; // Example icon
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'; // Changed from SettingsApplicationsIcon for user management
import TuneIcon from '@mui/icons-material/Tune'; // Icon for settings
import EmailIcon from '@mui/icons-material/Email'; // Icon for Invites

function AdminHomePage() {
    return (
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ my: { xs: 3, md: 4 } }}>
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
        </Container>
    );
}

export default AdminHomePage; 