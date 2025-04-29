import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from 'firebase/firestore';
// Import Firebase functions instance for calling callable functions
import { getFunctions, httpsCallable } from "firebase/functions"; 
import { db, functions as functionsInstance } from '../../firebaseConfig'; // Import functionsInstance
import {
    PageContainer,
    Button,
    LoadingSpinner,
    Alert,
    DataTable,
    Select,
    StatusChip
} from '../../components/mui';
import {
    Box,
    Typography,
    IconButton,
    Collapse,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Define possible statuses (Removed voting-related and planning statuses)
const cycleStatuses = [
    'ordering_open', 'ordering_closed',
    'shopping', 'cooking', 'packaging', 'distributing', 'completed', 'cancelled'
];

// Helper function to format protein counts
const formatProteinCounts = (counts) => {
    if (!counts || typeof counts !== 'object' || Object.keys(counts).length === 0) {
        return '-'; // Return hyphen if no counts or invalid format
    }
    return Object.entries(counts)
        .map(([protein, count]) => `${protein}: ${count}`)
        .join(', ');
};

// Helper function to format status for display
const formatStatus = (status) => {
    return status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
};

function MealCycleManagementPage() {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState({});
    const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'success' });

    // --- State for Expanded Orders View ---
    const [expandedCycleId, setExpandedCycleId] = useState(null);
    const [cycleOrders, setCycleOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [ordersError, setOrdersError] = useState('');

    // --- Data Fetching ---
    const fetchCycles = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        setError('');
        try {
            const cyclesRef = collection(db, "mealCycles");
            const q = query(cyclesRef, orderBy("creationDate", "desc"));
            const querySnapshot = await getDocs(q);
            const cyclesList = querySnapshot.docs.map(doc => {
                 const data = doc.data();
                 return {
                     id: doc.id,
                     ...data,
                     creationDate: data.creationDate?.toDate ? data.creationDate.toDate().toLocaleDateString() : 'N/A',
                     orderDeadline: data.orderDeadline?.toDate ? data.orderDeadline.toDate().toLocaleString() : 'N/A',
                     targetCookDate: data.targetCookDate?.toDate ? data.targetCookDate.toDate().toLocaleDateString() : 'N/A',
                     // Keep aggregation fields directly for display
                     totalMealCounts: data.totalMealCounts,
                     totalCountsByProtein: data.totalCountsByProtein,
                     dineInContainers: data.dineInContainers,
                     carryOutContainers: data.carryOutContainers,
                 }
            });
            setCycles(cyclesList);
        } catch (err) {
            console.error("Error fetching meal cycles:", err);
            setError("Failed to load meal cycles.");
            setAlertInfo({ open: true, message: "Failed to load meal cycles.", severity: 'error' });
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []); // Empty dependency array for useCallback

    useEffect(() => {
        fetchCycles();
    }, [fetchCycles]); // Depend on fetchCycles

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
            setAlertInfo({ open: true, message: `Cycle status updated to ${formatStatus(newStatus)}`, severity: 'success' });
        } catch (err) {
            console.error(`Error updating cycle ${cycleId} status:`, err);
            setError(`Failed to update status for cycle ${cycleId}.`);
            setAlertInfo({ open: true, message: `Failed to update status for cycle ${cycleId}.`, severity: 'error' });
             // TODO: Better error display, maybe per row
        } finally {
            setUpdatingStatus(prev => ({ ...prev, [cycleId]: false }));
        }
    };

    const handleCloseAlert = () => {
        setAlertInfo({ ...alertInfo, open: false });
    };

    // --- Fetch Orders for a Specific Cycle ---
    const fetchCycleOrders = async (cycleId, showLoading = true) => {
        if (showLoading) setLoadingOrders(true);
        setOrdersError('');
        setCycleOrders([]); // Clear previous orders
        try {
            const ordersRef = collection(db, "orders");
            const q = query(ordersRef, where("cycleId", "==", cycleId), orderBy("orderTimestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const ordersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convert timestamp if needed for display
                orderTimestamp: doc.data().orderTimestamp?.toDate ? doc.data().orderTimestamp.toDate().toLocaleString() : 'N/A'
            }));
            setCycleOrders(ordersList);
        } catch (err) {
            console.error(`Error fetching orders for cycle ${cycleId}:`, err);
            setOrdersError(`Failed to load orders for cycle ${cycleId}.`);
        } finally {
            if (showLoading) setLoadingOrders(false);
        }
    };

    // --- Handle Expand/Collapse Click ---
    const handleExpandClick = (cycleId) => {
        const isExpanding = expandedCycleId !== cycleId;
        setExpandedCycleId(isExpanding ? cycleId : null);
        if (isExpanding) {
            fetchCycleOrders(cycleId);
        } else {
            setCycleOrders([]); // Clear orders when collapsing
        }
    };

    const statusOptions = cycleStatuses.map(status => ({ value: status, label: formatStatus(status) }));

    const columns = [
        {
            id: 'expand', label: '', minWidth: 50, align: 'center',
            render: (row) => (
                <IconButton
                    aria-label="expand row"
                    size="small"
                    onClick={() => handleExpandClick(row.id)}
                >
                    {expandedCycleId === row.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
            )
        },
        { 
            id: 'status', label: 'Status', minWidth: 140, 
            render: (row) => <StatusChip status={row.status} size="small" />
        },
        { id: 'recipe', label: 'Recipe', minWidth: 170, render: (row) => row.chosenRecipe?.recipeName || '-' },
        { id: 'servings', label: 'Servings', minWidth: 80, align: 'right', render: (row) => row.totalMealCounts ?? '-' },
        { 
            id: 'protein', label: 'Protein Counts', minWidth: 170, 
            render: (row) => (
                <Typography variant="body2" noWrap title={formatProteinCounts(row.totalCountsByProtein)} sx={{ maxWidth: 150 }}>
                    {formatProteinCounts(row.totalCountsByProtein)}
                </Typography>
            )
        },
        { id: 'orderDeadline', label: 'Deadline', minWidth: 170 },
        { id: 'cookDate', label: 'Cook Date', minWidth: 100, render: (row) => row.targetCookDate },
        {
            id: 'actions', label: 'Actions', minWidth: 170, align: 'center',
            render: (row) => (
                updatingStatus[row.id] ? 
                <LoadingSpinner size={24} /> :
                <Select
                    value={row.status || ''}
                    onChange={(e) => handleStatusChange(row.id, e.target.value)}
                    options={statusOptions}
                    size="small"
                    margin="none" // Remove default margins
                    sx={{ minWidth: 150 }} // Ensure dropdown width
                    // Remove label for inline use
                    labelId={`status-select-label-${row.id}`}
                    id={`status-select-${row.id}`}
                />
            )
        },
    ];

    return (
        <PageContainer>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Meal Cycle Management
                </Typography>
                <Button
                    onClick={() => fetchCycles()} // Refresh without full page load if desired
                    disabled={loading}
                    variant="outlined"
                >
                    Refresh Cycles
                </Button>
            </Box>

            {alertInfo.open && (
                <Alert
                    severity={alertInfo.severity}
                    onClose={handleCloseAlert}
                    sx={{ mb: 2 }}
                >
                    {alertInfo.message}
                </Alert>
            )}
            {error && !alertInfo.open && (
                 <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            {loading ? (
                <LoadingSpinner centered size={60} />
            ) : (
                <DataTable
                    columns={columns}
                    data={cycles}
                    maxHeight="75vh"
                />
            )}
            
            {/* Render expanded row content outside the DataTable component */} 
            {cycles.map((cycle) => (
                <Collapse 
                    in={expandedCycleId === cycle.id} 
                    timeout="auto" 
                    unmountOnExit
                    key={`collapse-${cycle.id}`}
                >
                    <Paper sx={{ margin: 1.5, padding: 2, backgroundColor: 'grey.100' }} elevation={2}>
                        <Typography variant="h6" gutterBottom component="div">
                            Orders for: {cycle.chosenRecipe?.recipeName || `Cycle ${cycle.id}`}
                        </Typography>
                        {loadingOrders ? (
                            <LoadingSpinner centered size={30} />
                        ) : ordersError ? (
                            <Alert severity="error">{ordersError}</Alert>
                        ) : cycleOrders.length > 0 ? (
                            <Table size="small" aria-label="cycle orders">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User</TableCell>
                                        <TableCell>Meals (Protein: Qty)</TableCell>
                                        <TableCell>Container</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {cycleOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell component="th" scope="row">
                                                {order.userName || order.userId || 'Unknown User'}
                                            </TableCell>
                                            <TableCell>
                                                {order.items?.map(item => `${item.protein}: ${item.quantity}`).join(', ') || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {formatStatus(order.locationStatus) || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Typography variant="body2" color="text.secondary">No orders found for this cycle.</Typography>
                        )}
                    </Paper>
                </Collapse>
            ))}

        </PageContainer>
    );
}

export default MealCycleManagementPage; 