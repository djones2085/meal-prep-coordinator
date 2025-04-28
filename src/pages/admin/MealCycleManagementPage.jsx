import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
// Import Firebase functions instance for calling callable functions
import { getFunctions, httpsCallable } from "firebase/functions"; 
import { db, functions as functionsInstance } from '../../firebaseConfig'; // Import functionsInstance
import {
    Container, Typography, Box, Paper, CircularProgress, Alert,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Select, MenuItem, Button, FormControl,
    Snackbar // For feedback on manual trigger
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'; // Icon for trigger button

// Define possible statuses (Removed voting-related and planning statuses)
const cycleStatuses = [
    'ordering_open', 'ordering_closed',
    'shopping', 'cooking', 'packaging', 'distributing', 'completed', 'cancelled'
];

function MealCycleManagementPage() {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState({}); // Track loading state per cycle { cycleId: boolean }
    const [triggeringAggregation, setTriggeringAggregation] = useState({}); // Track loading state for manual trigger { cycleId: boolean }
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success' or 'error'

    useEffect(() => {
        const fetchCycles = async () => {
            setLoading(true);
            setError('');
            try {
                const cyclesRef = collection(db, "mealCycles");
                // Order by creation date descending to show newest first
                const q = query(cyclesRef, orderBy("creationDate", "desc"));
                const querySnapshot = await getDocs(q);
                const cyclesList = querySnapshot.docs.map(doc => {
                     const data = doc.data();
                     return {
                         id: doc.id,
                         ...data,
                         // Convert timestamps for display if needed
                         creationDate: data.creationDate?.toDate ? data.creationDate.toDate().toLocaleDateString() : 'N/A',
                         orderDeadline: data.orderDeadline?.toDate ? data.orderDeadline.toDate().toLocaleString() : 'N/A',
                         targetCookDate: data.targetCookDate?.toDate ? data.targetCookDate.toDate().toLocaleDateString() : 'N/A',
                     }
                });
                setCycles(cyclesList);
            } catch (err) {
                console.error("Error fetching meal cycles:", err);
                setError("Failed to load meal cycles.");
            } finally {
                setLoading(false);
            }
        };
        fetchCycles();
    }, []); // Fetch on mount

    const handleStatusChange = async (cycleId, newStatus) => {
        if (!cycleId || !newStatus) return;

        setUpdatingStatus(prev => ({ ...prev, [cycleId]: true })); // Set loading for this specific cycle
        setError(''); // Clear previous errors

        try {
            const cycleDocRef = doc(db, 'mealCycles', cycleId);
            await updateDoc(cycleDocRef, {
                status: newStatus
            });
            console.log(`Updated cycle ${cycleId} to status ${newStatus}`);
            // Update local state to reflect the change immediately
            setCycles(prevCycles =>
                prevCycles.map(cycle =>
                    cycle.id === cycleId ? { ...cycle, status: newStatus } : cycle
                )
            );
        } catch (err) {
            console.error(`Error updating cycle ${cycleId} status:`, err);
            setError(`Failed to update status for cycle ${cycleId}.`);
             // TODO: Better error display, maybe per row
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [cycleId]: false }));
        }
    };

    // Function to call the HTTPS callable function
    const handleManualTrigger = async (cycleId) => {
        if (!cycleId) return;

        setTriggeringAggregation(prev => ({ ...prev, [cycleId]: true }));
        setError(''); // Clear general errors

        try {
            const requestManualAggregation = httpsCallable(functionsInstance, 'requestManualAggregation');
            const result = await requestManualAggregation({ mealCycleId: cycleId });

            console.log("Manual aggregation trigger result:", result.data);
            setSnackbarMessage(result.data.message || 'Aggregation successfully requested.');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);

        } catch (err) {
            console.error(`Error triggering manual aggregation for cycle ${cycleId}:`, err);
            let userMessage = `Failed to trigger aggregation for cycle ${cycleId}.`;
            if (err instanceof Error && 'code' in err && 'message' in err) {
                // Handle specific HttpsError codes if needed
                if (err.code === 'permission-denied') {
                    userMessage = 'Permission denied. You must be an admin.';
                } else {
                    userMessage = `${userMessage} (${err.message})`;
                }
            } else if (err instanceof Error) {
                 userMessage = `${userMessage} (${err.message})`;
            }
            
            setSnackbarMessage(userMessage);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            // Keep the main error display for persistent errors if needed
            // setError(userMessage);
        } finally {
            setTriggeringAggregation(prev => ({ ...prev, [cycleId]: false }));
        }
    };

     const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
        return;
        }
        setSnackbarOpen(false);
    };

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" component="h1" gutterBottom>
                Meal Cycle Management (Admin)
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <CircularProgress />
            ) : (
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="meal cycles table">
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Chosen Recipe</TableCell>
                                <TableCell>Total Servings</TableCell>
                                <TableCell>Dine-In #</TableCell>
                                <TableCell>Carry-Out #</TableCell>
                                <TableCell>Order Deadline</TableCell>
                                <TableCell>Cook Date</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cycles.map((cycle) => (
                                <TableRow key={cycle.id}>
                                    <TableCell component="th" scope="row" sx={{fontSize: '0.75rem'}}>
                                        {cycle.id}
                                    </TableCell>
                                    <TableCell>{cycle.status}</TableCell>
                                    <TableCell>{cycle.chosenRecipe?.recipeName || 'N/A'}</TableCell>
                                    <TableCell>{cycle.totalMealCounts ?? '-'}</TableCell>
                                    <TableCell>{cycle.dineInContainers ?? '-'}</TableCell>
                                    <TableCell>{cycle.carryOutContainers ?? '-'}</TableCell>
                                    <TableCell>{cycle.orderDeadline}</TableCell>
                                    <TableCell>{cycle.targetCookDate}</TableCell>
                                    <TableCell>{cycle.creationDate}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {/* Status Dropdown */}
                                            <FormControl size="small" sx={{minWidth: 150}}>
                                                <Select
                                                   value={cycle.status}
                                                   onChange={(e) => handleStatusChange(cycle.id, e.target.value)}
                                                   disabled={updatingStatus[cycle.id]}
                                                >
                                                   {cycleStatuses.map(status => (
                                                        <MenuItem key={status} value={status}>{status.replace('_', ' ')}</MenuItem>
                                                   ))}
                                               </Select>
                                               {updatingStatus[cycle.id] && <CircularProgress size={16} sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-8px', marginLeft: '-8px' }} />}
                                           </FormControl>
                                            {/* Manual Trigger Button - Show if aggregation fields are missing? Or specific statuses? */}
                                            {/* Let's show if status is 'ordering_open' or 'ordering_closed' AND aggregation data missing */}
                                            {(cycle.status === 'ordering_open' || cycle.status === 'ordering_closed') && cycle.totalMealCounts === undefined && (
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    startIcon={triggeringAggregation[cycle.id] ? <CircularProgress size={16} /> : <PlayCircleOutlineIcon />}
                                                    onClick={() => handleManualTrigger(cycle.id)}
                                                    disabled={triggeringAggregation[cycle.id] || updatingStatus[cycle.id]}
                                                    sx={{ whiteSpace: 'nowrap' }} // Prevent wrapping
                                                >
                                                    {triggeringAggregation[cycle.id] ? 'Triggering...' : 'Aggregate'}
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
             {/* Snackbar for feedback */}
            <Snackbar 
                open={snackbarOpen} 
                autoHideDuration={6000} 
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default MealCycleManagementPage; 