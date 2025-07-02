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
    Divider,
    useMediaQuery,
    useTheme,
    MenuItem
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Import the new component
import AdminShoppingList from '../../components/admin/AdminShoppingList';
import MealCycleCard from '../../components/admin/MealCycleCard';

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

    // --- Media Query for Responsive Layout ---
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
    // The old handleUpdateIngredientItem is no longer directly compatible with the new shoppingList structure.
    // It might be removed or adapted if generic item property editing is needed later.
    // For now, we focus on the specific 'onHandQuantity' update.

    const handleUpdateShoppingListItemOnHandQuantity = async (cycleId, itemName, itemUnit, newOnHandQuantity) => {
        console.log("Attempting to update onHandQuantity:", { cycleId, itemName, itemUnit, newOnHandQuantity });
        const cycleRef = doc(db, 'mealCycles', cycleId);
        try {
            const cycleSnap = await getDoc(cycleRef);
            if (!cycleSnap.exists()) {
                throw new Error("Cycle not found for updating shopping list item.");
            }
            const cycleData = cycleSnap.data();
            if (!cycleData.shoppingList || !Array.isArray(cycleData.shoppingList.items)) {
                throw new Error("Shopping list or items not found in cycle data.");
            }

            let itemUpdated = false;
            const updatedItems = cycleData.shoppingList.items.map(item => {
                // Assuming name + unit is a unique identifier for now
                if (item.name === itemName && item.unit === itemUnit) {
                    itemUpdated = true;
                    const aggregatedQuantity = item.aggregatedQuantity || 0;
                    const validOnHand = Math.max(0, newOnHandQuantity); // Ensure non-negative
                    return {
                        ...item,
                        onHandQuantity: validOnHand,
                        toBePurchasedQuantity: Math.max(0, aggregatedQuantity - validOnHand),
                    };
                }
                return item;
            });

            if (!itemUpdated) {
                console.warn("Item not found for update in shopping list:", {itemName, itemUnit});
                setAlertInfo({ open: true, message: 'Error: Item not found in shopping list.', severity: 'warning' });
                return;
            }

            await updateDoc(cycleRef, {
                "shoppingList.items": updatedItems,
                "shoppingList.lastUpdatedAt": serverTimestamp(),
            });

            // Update local state
            setCycles(prevCycles => prevCycles.map(c => {
                if (c.id === cycleId) {
                    return {
                        ...c,
                        shoppingList: {
                            ...c.shoppingList,
                            items: updatedItems,
                            lastUpdatedAt: new Date(), // Approximate for local state
                        }
                    };
                }
                return c;
            }));
            setAlertInfo({ open: true, message: `'${itemName}' on-hand quantity updated.`, severity: 'success' });

        } catch (err) { 
            console.error("Error updating shopping list item on-hand quantity:", err);
            setAlertInfo({ open: true, message: `Failed to update on-hand quantity: ${err.message}`, severity: 'error' });
        }
    };

    const handleApproveShoppingList = async (cycleId) => {
        console.log("Attempting to approve shopping list for cycle:", cycleId);
        const cycleRef = doc(db, 'mealCycles', cycleId);
        try {
            const adminUserId = auth.currentUser ? auth.currentUser.uid : 'admin_placeholder'; // Ensure auth.currentUser is available
            if (!auth.currentUser) {
                console.error("Admin user not found for approving shopping list.");
                setAlertInfo({ open: true, message: 'Error: You must be logged in as an admin to approve.', severity: 'error' });
                return;
            }

            const updateData = {
                "shoppingList.status": "approved",
                "shoppingList.approvedBy": adminUserId,
                "shoppingList.approvedAt": serverTimestamp(),
                "shoppingList.lastUpdatedAt": serverTimestamp(),
            };

            await updateDoc(cycleRef, updateData);

            // Update local state to reflect changes immediately
            setCycles(prevCycles => prevCycles.map(c => {
                if (c.id === cycleId) {
                    // Ensure c.shoppingList exists before trying to spread it
                    const existingShoppingList = c.shoppingList || { items: [], status: '' }; 
                    return {
                        ...c,
                        shoppingList: {
                            ...existingShoppingList, // Spread existing items and other shopping list fields
                            status: "approved",
                            approvedBy: adminUserId,
                            // For serverTimestamp fields, local update can be tricky.
                            // We can set to new Date() or refetch, or just rely on next fetch.
                            // For simplicity, we are updating what we know.
                            // The actual timestamp will be from the server.
                            approvedAt: new Date(), // Approximate for local state
                            lastUpdatedAt: new Date(), // Approximate for local state
                        }
                    };
                }
                return c;
            }));
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
            const q = query(ordersRef, where("cycleId", "==", cycleId), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const ordersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Ensure createdAt is formatted for display if it's a Timestamp
                orderTimestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate().toLocaleString() : (doc.data().orderTimestamp?.toDate ? doc.data().orderTimestamp.toDate().toLocaleString() : 'N/A')
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

    // More columns can be added as needed, or some can be conditional based on screen size
    // For simplicity, we keep a fixed set here.
    const columns = [
        {
            id: 'expand',
            label: '',
            render: (cycle) => (
                <IconButton
                    aria-label="expand row"
                    size="small"
                    onClick={() => handleExpandClick(cycle.id)}
                >
                    {expandedCycleId === cycle.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
            ),
            disableSort: true,
            disableFilter: true,
            sx: { width: '5%', padding: '0 8px' } // Minimal width for icon
        },
        {
            id: 'cycleName',
            label: 'Cycle Name / ID',
            render: (cycle) => (
                <Typography variant="subtitle2" component="div" noWrap>
                    {cycle.cycleName || 'N/A'}
                </Typography>
            ),
            valueGetter: (cycle) => cycle.cycleName || cycle.id, // For sorting/filtering
            sx: { minWidth: 180 }
        },
        {
            id: 'status',
            label: 'Status',
            render: (cycle) => (
                <Select
                    value={cycle.status || ''}
                    onChange={(e) => handleStatusChange(cycle.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()} // Prevent row click when changing status
                    size="small"
                    disabled={updatingStatus[cycle.id]}
                    sx={{ minWidth: 150 }}
                >
                    {cycleStatuses.map(s => (
                        <MenuItem key={s} value={s}>{formatStatus(s)}</MenuItem>
                    ))}
                </Select>
            ),
            valueGetter: (cycle) => cycle.status, // For sorting/filtering
            customFilterRender: (value, onChange) => ( // Example custom filter UI
                <Select
                    value={value || ''}
                    onChange={onChange}
                    displayEmpty
                    size="small"
                    fullWidth
                >
                    <MenuItem value=""><em>All Statuses</em></MenuItem>
                    {cycleStatuses.map(s => (
                        <MenuItem key={s} value={s}>{formatStatus(s)}</MenuItem>
                    ))}
                </Select>
            )
        },
        {
            id: 'targetCookDate',
            label: 'Cook Date',
            render: (cycle) => cycle.targetCookDate,
            valueGetter: (cycle) => cycle.targetCookDate, // For sorting/filtering
            sx: { minWidth: 120 }
        },
        {
            id: 'orderDeadline',
            label: 'Order Deadline',
            render: (cycle) => cycle.orderDeadline,
            valueGetter: (cycle) => cycle.orderDeadline, // For sorting/filtering
            sx: { minWidth: 170 }
        },
        {
            id: 'totalMealCounts',
            label: 'Total Meals',
            render: (cycle) => cycle.totalMealCounts !== undefined ? cycle.totalMealCounts : '-',
            valueGetter: (cycle) => cycle.totalMealCounts,
            sx: { minWidth: 100, textAlign: 'center' }
        },
        {
            id: 'totalCountsByProtein',
            label: 'Proteins',
            render: (cycle) => formatProteinCounts(cycle.totalCountsByProtein),
            valueGetter: (cycle) => formatProteinCounts(cycle.totalCountsByProtein), // May need more complex getter for sorting
            sx: { minWidth: 200 }
        },
        // Add other columns like dineInContainers, carryOutContainers if needed
        // {
        //     id: 'actions',
        //     label: 'Actions',
        //     render: (cycle) => (
        //         <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        //             <Button
        //                 variant="outlined"
        //                 size="small"
        //                 onClick={(e) => {
        //                     e.stopPropagation(); // Prevent row click
        //                     handleGenerateShoppingList(cycle.id);
        //                 }}
        //                 disabled={!!generatingShoppingList[cycle.id]}
        //             >
        //                 {cycle.shoppingList && cycle.shoppingList.items && cycle.shoppingList.items.length > 0 ? 'Re-generate List' : 'Generate List'}
        //             </Button>
        //             {/* Other actions can go here */}
        //         </Box>
        //     ),
        //     disableSort: true,
        //     disableFilter: true,
        // }
    ];

    // Render Row Actions and Expanded Row are specific to DataTable,
    // For Card view, similar functionality will be embedded or triggered by the card itself.

    const renderExpandedCycleContent = (cycle) => {
        // This function renders the content for the expanded section
        return (
            <Box sx={{ margin: 1, padding: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom component="div">
                    Cycle Details: {cycle.chosenRecipe?.recipeName || 'N/A'}
                </Typography>
                
                {/* Orders Table */}
                <Typography variant="subtitle1" gutterBottom component="div" sx={{mt: 2}}>
                    Orders ({expandedCycleId === cycle.id ? cycleOrders.length : 0})
                </Typography>
                {loadingOrders && expandedCycleId === cycle.id && <LoadingSpinner />}
                {ordersError && expandedCycleId === cycle.id && <Alert severity="error">{ordersError}</Alert>}
                {!loadingOrders && !ordersError && expandedCycleId === cycle.id && cycleOrders.length > 0 && (
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
                                            {order.userDisplayName || order.userId}
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
                {!loadingOrders && !ordersError && expandedCycleId === cycle.id && cycleOrders.length === 0 && (
                    <Typography variant="body2" sx={{my:1, fontStyle: 'italic'}}>No orders found for this cycle.</Typography>
                )}

                {/* Shopping List Section */}
                <Divider sx={{my:2}} />
                {cycle.shoppingList && cycle.shoppingList.items && (  // Check for new shoppingList structure
                    <AdminShoppingList 
                        cycleId={cycle.id}
                        shoppingList={cycle.shoppingList} // Pass the whole shoppingList object
                        onApproveList={handleApproveShoppingList}
                        onUpdateItemOnHand={handleUpdateShoppingListItemOnHandQuantity} // Pass the new handler
                    />
                )}
                {(!cycle.shoppingList || !cycle.shoppingList.items || cycle.shoppingList.items.length === 0) && (
                     <Typography variant="body2" sx={{my:1, fontStyle: 'italic'}}>
                         Shopping list not generated or is empty for this cycle.
                         {cycle.status === 'ordering_closed' && !cycle.aggregationTimestamp && ' Aggregation may be pending.'}
                     </Typography>
                )}
            </Box>
        );
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <PageContainer title="Manage Meal Cycles">
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {alertInfo.open && (
                <Alert severity={alertInfo.severity} onClose={handleCloseAlert} sx={{ mb: 2 }}>
                    {alertInfo.message}
                </Alert>
            )}

            {isMobile ? (
                <Box>
                    {cycles.map(cycle => (
                        <MealCycleCard
                            key={cycle.id}
                            cycle={cycle}
                            onStatusChange={handleStatusChange}
                            updatingStatus={updatingStatus}
                            onViewOrders={() => handleExpandClick(cycle.id)} // Triggers expansion and order loading
                            expandedCycleId={expandedCycleId}
                            onExpandClick={() => handleExpandClick(cycle.id)} // For the card's own expand icon
                            renderExpandedCycleContent={renderExpandedCycleContent}
                        />
                    ))}
                </Box>
            ) : (
                <Paper sx={{ mt: 2 }}>
                    <DataTable
                        columns={columns}
                    >
                        {cycles.map((cycle) => (
                            <React.Fragment key={cycle.id}>
                                <TableRow hover onClick={() => handleExpandClick(cycle.id)} sx={{ cursor: 'pointer' }}>
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            align={column.sx?.textAlign || 'left'}
                                            sx={column.sx}
                                        >
                                            {column.render ? column.render(cycle) : cycle[column.id]}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                {expandedCycleId === cycle.id && (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} sx={{ padding: 0, borderBottom: 'unset' }}>
                                            <Collapse in={expandedCycleId === cycle.id} timeout="auto" unmountOnExit>
                                                {renderExpandedCycleContent(cycle)}
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        ))}
                    </DataTable>
                </Paper>
            )}
        </PageContainer>
    );
}

export default MealCycleManagementPage;