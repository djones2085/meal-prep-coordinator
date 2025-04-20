import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
    Container, Typography, Box, Paper, CircularProgress, Alert,
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
    Select, MenuItem, Button, FormControl
} from '@mui/material';

// Define possible statuses
const cycleStatuses = [
    'planning', 'voting_open', 'voting_closed', 'ordering_open', 'ordering_closed',
    'shopping', 'cooking', 'packaging', 'distributing', 'completed', 'cancelled'
];

function MealCycleManagementPage() {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState({}); // Track loading state per cycle { cycleId: boolean }

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
                         votingDeadline: data.votingDeadline?.toDate ? data.votingDeadline.toDate().toLocaleString() : 'N/A',
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
                                <TableCell>Proposed Recipes</TableCell>
                                <TableCell>Chosen Recipe</TableCell>
                                <TableCell>Voting Deadline</TableCell>
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
                                     <TableCell>
                                         {cycle.proposedRecipes?.map(r => r.recipeName).join(', ') || 'N/A'}
                                    </TableCell>
                                     <TableCell>{cycle.chosenRecipeId || 'N/A'}</TableCell> {/* TODO: Fetch name? */}
                                     <TableCell>{cycle.votingDeadline}</TableCell>
                                    <TableCell>{cycle.orderDeadline}</TableCell>
                                     <TableCell>{cycle.targetCookDate}</TableCell>
                                    <TableCell>{cycle.creationDate}</TableCell>
                                    <TableCell>
                                         <FormControl size="small" sx={{minWidth: 150}}>
                                             <Select
                                                value={cycle.status}
                                                onChange={(e) => handleStatusChange(cycle.id, e.target.value)}
                                                disabled={updatingStatus[cycle.id]}
                                             >
                                                {cycleStatuses.map(status => (
                                                     <MenuItem key={status} value={status}>{status}</MenuItem>
                                                ))}
                                            </Select>
                                            {updatingStatus[cycle.id] && <CircularProgress size={16} sx={{ position: 'absolute', top: '50%', left: '50%', marginTop: '-8px', marginLeft: '-8px' }} />}
                                        </FormControl>
                                     </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
}

export default MealCycleManagementPage; 