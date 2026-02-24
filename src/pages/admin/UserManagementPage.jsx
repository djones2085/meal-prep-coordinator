import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    Button,
    CircularProgress,
    Alert,
    Snackbar,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Adjusted path to firebaseConfig
import UserCard from '../../components/admin/UserCard'; // Added

function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // can be 'error', 'warning', 'info', 'success'

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingRoleChange, setPendingRoleChange] = useState({ userId: null, newRoles: [] });

    // Placeholder for available roles. This might come from a config or be hardcoded.
    const availableRoles = ['user', 'admin', 'cook', 'shopper'];

    const theme = useTheme(); // Added
    const isMobile = useMediaQuery(theme.breakpoints.down('md')); // Added, using 'md' breakpoint

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError('');
            try {
                const usersCollectionRef = collection(db, 'users');
                const querySnapshot = await getDocs(usersCollectionRef);
                const usersList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsers(usersList);
            } catch (err) {
                console.error("Error fetching users:", err);
                setError("Failed to load users. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []); // Empty dependency array ensures this runs once on mount

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const initiateRoleChange = (userId, newRoles) => {
        setPendingRoleChange({ userId, newRoles });
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
    };

    const confirmAndApplyRoleChange = async () => {
        if (pendingRoleChange.userId && pendingRoleChange.newRoles) {
            await handleRoleChange(pendingRoleChange.userId, pendingRoleChange.newRoles);
        }
        setDialogOpen(false);
    };

    const handleRoleChange = async (userId, newRoles) => {
        console.log(`Attempting to change role for user ${userId} to ${newRoles}`);
        // Implementation to update Firestore will go here
        // For now, let's optimistically update the local state or re-fetch
        const userDocRef = doc(db, 'users', userId);
        try {
            await updateDoc(userDocRef, {
                roles: newRoles
            });
            // Optimistically update local state
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, roles: newRoles } : user
                )
            );
            setSnackbarMessage('User roles updated successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            console.error("Error updating user roles:", err);
            setSnackbarMessage(`Failed to update roles for user ${userId}.`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            // setError(`Failed to update roles for user ${userId}. Please try again.`); // Keep page-level error for fetch, not for individual updates
        }
    };

    return (
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ my: { xs: 3, md: 4 } }}>
                User Management
            </Typography>
            <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                    User List
                </Typography>

                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
                )}

                {!loading && !error && (
                    isMobile ? (
                        <Box sx={{ mt: 2 }}>
                            {users.map((user) => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    availableRoles={availableRoles}
                                    onInitiateRoleChange={initiateRoleChange}
                                    isUpdating={loading} // Or a more specific per-user updating state if available
                                />
                            ))}
                        </Box>
                    ) : (
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                            <Table sx={{ minWidth: 650 }} aria-label="user management table">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User ID</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Display Name</TableCell>
                                        <TableCell>Roles</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell component="th" scope="row">
                                                {user.id}
                                            </TableCell>
                                            <TableCell>{user.email || 'N/A'}</TableCell>
                                            <TableCell>{user.displayName || 'N/A'}</TableCell>
                                            <TableCell>{user.roles ? user.roles.join(', ') : 'N/A'}</TableCell>
                                            <TableCell align="right">
                                                <Select
                                                    size="small"
                                                    multiple
                                                    value={user.roles || []}
                                                    onChange={(e) => initiateRoleChange(user.id, e.target.value)}
                                                    renderValue={(selected) => selected.join(', ')}
                                                    sx={{ minWidth: 150, mr: 1 }}
                                                >
                                                    {availableRoles.map((role) => (
                                                        <MenuItem key={role} value={role}>
                                                            {role}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )
                )}
            </Paper>
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
            <Dialog
                open={dialogOpen}
                onClose={handleDialogClose}
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
            >
                <DialogTitle id="confirm-dialog-title">Confirm Role Change</DialogTitle>
                <DialogContent>
                    <DialogContentText id="confirm-dialog-description">
                        Are you sure you want to change the roles for this user?
                        {/* Optionally display which user and what roles are changing */}
                        {/* User: {users.find(u => u.id === pendingRoleChange.userId)?.email} */}
                        {/* New Roles: {pendingRoleChange.newRoles.join(', ')} */}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose}>Cancel</Button>
                    <Button onClick={confirmAndApplyRoleChange} color="primary" autoFocus>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default UserManagementPage; 