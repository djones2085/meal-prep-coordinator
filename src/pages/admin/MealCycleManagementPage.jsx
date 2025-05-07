import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, where, getDoc, serverTimestamp } from 'firebase/firestore';
// Import Firebase functions instance for calling callable functions
import { getFunctions, httpsCallable } from "firebase/functions"; 
import { db, functions as functionsInstance, auth } from '../../firebaseConfig'; // Import functionsInstance and auth
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
    Paper,
    Divider
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Import the new component
import AdminShoppingList from '../../components/admin/AdminShoppingList';

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

    // --- Shopping List Update Handlers ---
    const handleUpdateIngredientItem = async (cycleId, ingredientId, updates) => {
        console.log("Attempting to update ingredient:", { cycleId, ingredientId, updates });
        const cycleRef = doc(db, 'mealCycles', cycleId);
        try {
            const cycleSnap = await getDoc(cycleRef); // Fetch current cycle data
            if (!cycleSnap.exists()) {
                throw new Error("Cycle not found");
            }
            const cycleData = cycleSnap.data();
            const ingredients = cycleData.totalIngredients || [];
            
            // Create a fallback ID if real IDs aren't present yet
            // This matches the AdminShoppingList component's fallback for consistency
            const findIngredientIndexById = (idToFind) => {
                return ingredients.findIndex(ing => 
                    (ing.id === idToFind) || 
                    (!ing.id && `${ing.name.replace(/\s+/g, '-').toLowerCase()}-${ingredients.indexOf(ing)}` === idToFind)
                );
            };

            const ingredientIndex = findIngredientIndexById(ingredientId);

            if (ingredientIndex === -1) {
                console.error("Ingredient not found for update:", ingredientId);
                setAlertInfo({ open: true, message: 'Error: Ingredient not found for update.', severity: 'error' });
                return;
            }

            const updatedIngredients = [...ingredients];
            updatedIngredients[ingredientIndex] = {
                ...updatedIngredients[ingredientIndex],
                ...updates,
                 // Ensure ID is preserved if it was a fallback
                id: updatedIngredients[ingredientIndex].id || ingredientId 
            };

            await updateDoc(cycleRef, { totalIngredients: updatedIngredients });
            
            // Update local state to reflect changes immediately
            setCycles(prevCycles => prevCycles.map(c => 
                c.id === cycleId ? { ...c, totalIngredients: updatedIngredients } : c
            ));
            setAlertInfo({ open: true, message: 'Shopping list item updated.', severity: 'success' });
        } catch (err) {
            console.error("Error updating ingredient item:", err);
            setAlertInfo({ open: true, message: `Failed to update shopping list: ${err.message}`, severity: 'error' });
        }
    };

    const handleApproveShoppingList = async (cycleId) => {
        console.log("Attempting to approve shopping list for cycle:", cycleId);
        const cycleRef = doc(db, 'mealCycles', cycleId);
        try {
            // TODO: Get current user UID for 'shoppingListApprovedBy'
            // For now, using a placeholder. This needs access to auth context.
            const adminUserId = auth.currentUser ? auth.currentUser.uid : 'admin_placeholder'; 

            const updateData = {
                shoppingListStatus: 'approved',
                shoppingListApprovedBy: adminUserId,
                shoppingListApprovedAt: serverTimestamp(),
            };
            await updateDoc(cycleRef, updateData);

            setCycles(prevCycles => prevCycles.map(c => 
                c.id === cycleId ? { ...c, ...updateData } : c
            ));
            setAlertInfo({ open: true, message: 'Shopping list approved!', severity: 'success' });
        } catch (err) {
            console.error("Error approving shopping list:", err);
            setAlertInfo({ open: true, message: `Failed to approve shopping list: ${err.message}`, severity: 'error' });
        }
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
        {
            id: 'details', label: 'Details', minWidth: 170, align: 'center',
            render: (row) => (
                <>
                    <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                        <TableCell colSpan={columns.length}> {/* Adjust colSpan as needed */}
                            <Collapse in={expandedCycleId === row.id} timeout="auto" unmountOnExit>
                                <Box sx={{ margin: 1, padding: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
                                    <Typography variant="h6" gutterBottom component="div">
                                        Cycle Details: {row.chosenRecipe?.recipeName || 'N/A'}
                                    </Typography>
                                    
                                    {/* Orders Table */}
                                    <Typography variant="subtitle1" gutterBottom component="div" sx={{mt: 2}}>
                                        Orders ({cycleOrders.length})
                                    </Typography>
                                    {loadingOrders && <LoadingSpinner />}
                                    {ordersError && <Alert severity="error">{ordersError}</Alert>}
                                    {!loadingOrders && !ordersError && cycleOrders.length > 0 && (
                                        <Paper elevation={1} sx={{mb:2}}>
                                            <Table size="small" aria-label="orders">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>User</TableCell>
                                                        <TableCell>Servings</TableCell>
                                                        <TableCell>Protein Choices</TableCell>
                                                        <TableCell>Container</TableCell>
                                                        <TableCell>Ordered At</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {cycleOrders.map((order) => (
                                                        <TableRow key={order.id}>
                                                            <TableCell component="th" scope="row">
                                                                {order.userName || order.userId}
                                                            </TableCell>
                                                            <TableCell>{order.totalServings}</TableCell>
                                                            <TableCell>
                                                                {order.items?.map(item => `${item.protein}: ${item.quantity}`).join(', ') || 'N/A'}
                                                            </TableCell>
                                                            <TableCell>{formatStatus(order.locationStatus || 'carry_out')}</TableCell>
                                                            <TableCell>{order.orderTimestamp}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </Paper>
                                    )}
                                    {!loadingOrders && !ordersError && cycleOrders.length === 0 && (
                                        <Typography variant="body2" sx={{my:1, fontStyle: 'italic'}}>No orders found for this cycle.</Typography>
                                    )}

                                    {/* Shopping List Section */}
                                    <Divider sx={{my:2}} />
                                    {row.totalIngredients && (
                                        <AdminShoppingList 
                                            ingredients={row.totalIngredients}
                                            cycleId={row.id}
                                            onUpdateIngredient={handleUpdateIngredientItem}
                                            onApproveList={handleApproveShoppingList}
                                            shoppingListStatus={row.shoppingListStatus || 'pending_approval'} // Default if not set
                                        />
                                    )}
                                    {(!row.totalIngredients || row.totalIngredients.length === 0) && (
                                         <Typography variant="body2" sx={{my:1, fontStyle: 'italic'}}>No shopping list generated for this cycle yet (aggregation might be pending).</Typography>
                                    )}

                                </Box>
                            </Collapse>
                        </TableCell>
                    </TableRow>
                </>
            )
        }
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
            
        </PageContainer>
    );
}

export default MealCycleManagementPage; 