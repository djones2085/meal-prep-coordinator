import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from 'firebase/firestore';
// Import Firebase functions instance for calling callable functions
import { getFunctions, httpsCallable } from "firebase/functions"; 
import { db, functions as functionsInstance } from '../../firebaseConfig'; // Import functionsInstance
import Button from '../../components/ui/Button'; // Use custom Button
import Spinner from '../../components/ui/Spinner'; // Use custom Spinner
import Alert from '../../components/ui/Alert';   // Use custom Alert
import {
    TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'; // Keep icons for now
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import RefreshIcon from '@mui/icons-material/Refresh';

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

function MealCycleManagementPage() {
    const [cycles, setCycles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState({}); // Track loading state per cycle { cycleId: boolean }
    const [triggeringAggregation, setTriggeringAggregation] = useState({}); // Track loading state for manual trigger { cycleId: boolean }
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success'); // 'success' or 'error'

    // --- State for Expanded Orders View ---
    const [expandedCycleId, setExpandedCycleId] = useState(null); // ID of the cycle whose orders are shown
    const [cycleOrders, setCycleOrders] = useState([]); // Orders for the expanded cycle
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
        setError('');
        try {
            const requestManualAggregation = httpsCallable(functionsInstance, 'requestManualAggregation');
            const result = await requestManualAggregation({ mealCycleId: cycleId });
            console.log("Manual aggregation trigger result:", result.data);
            setAlertMessage(result.data.message || 'Aggregation successfully requested. Refreshing data...');
            setAlertSeverity('success');
            setAlertOpen(true);
            await fetchCycles(false);
            if (expandedCycleId === cycleId) {
                await fetchCycleOrders(cycleId, false);
            }
        } catch (err) {
            console.error(`Error triggering manual aggregation for cycle ${cycleId}:`, err);
            let userMessage = `Failed to trigger aggregation for cycle ${cycleId}.`;
            if (err instanceof Error && 'code' in err && 'message' in err) {
                if (err.code === 'permission-denied') {
                    userMessage = 'Permission denied. You must be an admin.';
                } else {
                    userMessage = `${userMessage} (${err.message})`;
                }
            } else if (err instanceof Error) {
                 userMessage = `${userMessage} (${err.message})`;
            }
            setAlertMessage(userMessage);
            setAlertSeverity('error');
            setAlertOpen(true);
        } finally {
            setTriggeringAggregation(prev => ({ ...prev, [cycleId]: false }));
        }
    };

    const handleCloseAlert = () => {
        setAlertOpen(false);
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
        if (expandedCycleId === cycleId) {
            // Collapse if already expanded
            setExpandedCycleId(null);
            setCycleOrders([]); // Clear orders when collapsing
        } else {
            // Expand and fetch orders
            setExpandedCycleId(cycleId);
            fetchCycleOrders(cycleId);
        }
    };

    // Define table columns with responsiveness
    const columns = [
        { id: 'expand', label: '', minWidth: 50 },
        { id: 'status', label: 'Status', minWidth: 140 },
        { id: 'recipe', label: 'Recipe', minWidth: 170 },
        { id: 'servings', label: 'Servings', minWidth: 80, align: 'right', hideOnSmall: true }, // Hide on sm
        { id: 'protein', label: 'Protein Counts', minWidth: 170, hideOnMedium: true }, // Hide on md
        { id: 'orderDeadline', label: 'Deadline', minWidth: 170, hideOnSmall: true }, // Hide on sm
        { id: 'cookDate', label: 'Cook Date', minWidth: 100, hideOnSmall: true }, // Hide on sm
        { id: 'actions', label: 'Actions', minWidth: 200, sticky: true }, // Make sticky
    ];

    const numberOfColumns = columns.length; // Update based on actual displayed columns?

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> {/* Replaces Container */}
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4"> {/* Replaces Box */}
                 <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 my-2"> {/* Replaces Typography */}
                    Meal Cycle Management
                </h1>
                 <Button // Use custom Button
                    onClick={() => fetchCycles()}
                    disabled={loading}
                    variant="outline" // Assuming 'outline' is a valid variant in your Button component
                    // Add icon handling if your Button component supports it, otherwise just text
                >
                    <RefreshIcon className="mr-2 h-5 w-5" /> {/* Example icon usage - adjust if needed */}
                    Refresh Cycles
                </Button>
            </div>

            {/* Use custom Alert component */}
            {alertOpen && (
                <Alert
                    message={alertMessage}
                    type={alertSeverity}
                    onClose={handleCloseAlert} // Pass the close handler
                    className="mb-4" // Add margin if needed
                />
            )}

            {/* Use custom Alert for general error */}
            {error && !alertOpen && <Alert type="error" message={error} className="mb-4" />}

            {loading ? (
                // Use custom Spinner
                <div className="flex justify-center items-center p-10">
                     <Spinner size="large" /> {/* Assuming size prop */}
                </div>
            ) : (
                // Replace Paper with Tailwind div
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    {/* Replace sx with className */}
                    <TableContainer className="max-h-[75vh]"> {/* Limit height with Tailwind */}
                        <Table stickyHeader aria-label="sticky meal cycles table">
                            <TableHead>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            align={column.align}
                                            // Replace style with className if possible, or keep simple styles
                                            style={{ minWidth: column.minWidth }}
                                            // Add Tailwind classes for header styling
                                            className="bg-gray-100 font-semibold text-gray-600 uppercase tracking-wider"
                                        >
                                            {column.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {cycles.map((cycle) => {
                                    const isExpanded = expandedCycleId === cycle.id;
                                    const isLoadingStatus = updatingStatus[cycle.id];
                                    const isTriggering = triggeringAggregation[cycle.id];

                                    return (
                                        <React.Fragment key={cycle.id}>
                                            <TableRow hover role="checkbox" tabIndex={-1}>
                                                {/* Ensure NO whitespace between TableCells */}
                                                <TableCell>
                                                    <Button onClick={() => handleExpandClick(cycle.id)} variant="icon" aria-label="expand row" size="small">
                                                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                    </Button>
                                                </TableCell><TableCell>
                                                    {/* Display status text only */}
                                                    {cycle.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </TableCell><TableCell>{cycle.chosenRecipe?.recipeName || '-'}</TableCell><TableCell align="right" className="hidden sm:table-cell">{cycle.totalMealCounts ?? '-'}</TableCell><TableCell className="hidden md:table-cell" title={formatProteinCounts(cycle.totalCountsByProtein)}>
                                                     <span className="truncate">
                                                         {formatProteinCounts(cycle.totalCountsByProtein)}
                                                     </span>
                                                </TableCell><TableCell className="hidden sm:table-cell">{cycle.orderDeadline}</TableCell><TableCell className="hidden sm:table-cell">{cycle.targetCookDate}</TableCell><TableCell className="sticky right-0 bg-white border-l border-gray-200 z-10"> {/* Added z-index */}
                                                    {/* Actions Column Content: Select + Buttons */}
                                                    <div className="flex items-center gap-2 whitespace-nowrap p-1"> {/* Added padding */}
                                                        {/* Status Select Dropdown */}
                                                        {isLoadingStatus ? (
                                                            <Spinner size="small" />
                                                        ) : (
                                                            <select
                                                                value={cycle.status || ''}
                                                                onChange={(e) => handleStatusChange(cycle.id, e.target.value)}
                                                                disabled={isLoadingStatus}
                                                                className="block w-36 pl-2 pr-8 py-1 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm disabled:opacity-50 disabled:bg-gray-100" // Adjusted width/padding
                                                                title={`Current status: ${cycle.status}`}
                                                            >
                                                                {cycleStatuses.map((status) => (
                                                                    <option key={status} value={status}>
                                                                        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {/* Aggregate Button */}
                                                        <Button
                                                            onClick={() => handleManualTrigger(cycle.id)}
                                                            disabled={isTriggering || isLoadingStatus}
                                                            variant="secondary"
                                                            size="small"
                                                            title="Manually trigger order aggregation"
                                                            className="p-1" // Adjust padding if needed
                                                        >
                                                            {isTriggering ? <Spinner size="small" /> : <PlayCircleOutlineIcon className="h-5 w-5" />}
                                                            <span className="sr-only lg:not-sr-only lg:ml-1">Aggregate</span> {/* Screen reader only on small */}
                                                        </Button>
                                                        {/* View Orders Button */}
                                                         <Button
                                                            onClick={() => handleExpandClick(cycle.id)}
                                                            variant="secondary"
                                                            size="small"
                                                            title="View/Hide Orders"
                                                            className="p-1" // Adjust padding if needed
                                                        >
                                                             <PeopleAltIcon className="h-5 w-5" />
                                                             <span className="sr-only lg:not-sr-only lg:ml-1">Orders</span> {/* Screen reader only on small */}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            {/* Row for expanded content (Orders) */}
                                            {isExpanded && (
                                                <TableRow>
                                                    <TableCell colSpan={numberOfColumns} className="p-0 border-b-0">
                                                         <div className="p-4 bg-gray-50">
                                                             {/* Order Details Section */}
                                                             <h3 className="text-lg font-medium text-gray-800 mb-3">Orders for Cycle {cycle.id}</h3>
                                                             {loadingOrders ? (
                                                                 <div className="flex justify-center items-center p-4">
                                                                      <Spinner />
                                                                 </div>
                                                             ) : ordersError ? (
                                                                <Alert type="error" message={ordersError} />
                                                             ) : cycleOrders.length > 0 ? (
                                                                 // Simplified Order Table (Can be enhanced later)
                                                                 <div className="overflow-x-auto">
                                                                     <table className="min-w-full divide-y divide-gray-200">
                                                                          <thead className="bg-gray-100">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meals</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                                                                            </tr>
                                                                          </thead>
                                                                         <tbody className="bg-white divide-y divide-gray-200">
                                                                            {cycleOrders.map(order => (
                                                                                <tr key={order.id}>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{order.userName || order.userId}</td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{formatProteinCounts(order.mealCounts)}</td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{order.containerChoice}</td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{order.orderTimestamp}</td>
                                                                                </tr>
                                                                            ))}
                                                                         </tbody>
                                                                     </table>
                                                                 </div>
                                                             ) : (
                                                                 <p className="text-sm text-gray-500">No orders found for this cycle.</p>
                                                             )}
                                                         </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </div>
            )}
        </div>
    );
}

export default MealCycleManagementPage; 