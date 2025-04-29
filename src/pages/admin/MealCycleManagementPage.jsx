import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, where } from 'firebase/firestore';
// Import Firebase functions instance for calling callable functions
import { getFunctions, httpsCallable } from "firebase/functions"; 
import { db, functions as functionsInstance } from '../../firebaseConfig'; // Import functionsInstance
import Button from '../../components/ui/Button'; // Use custom Button
import Spinner from '../../components/ui/Spinner'; // Use custom Spinner
import Alert from '../../components/ui/Alert';   // Use custom Alert

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
    const [updatingStatus, setUpdatingStatus] = useState({});
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertSeverity, setAlertSeverity] = useState('success');

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
        { id: 'servings', label: 'Servings', minWidth: 80, align: 'right', hideOnSmall: true },
        { id: 'protein', label: 'Protein Counts', minWidth: 170, hideOnMedium: true },
        { id: 'orderDeadline', label: 'Deadline', minWidth: 170, hideOnSmall: true },
        { id: 'cookDate', label: 'Cook Date', minWidth: 100, hideOnSmall: true },
        { id: 'actions', label: 'Actions', minWidth: 150, sticky: true },
    ];

    const numberOfColumns = columns.length;

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
                >
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
                // Replace Paper div with container for table
                <div className="shadow-md rounded-lg overflow-hidden">
                    {/* Replace TableContainer with a div for scrolling/max-height */}
                    <div className="overflow-x-auto max-h-[75vh]">
                        {/* Replace Table with HTML table, add base styling */}
                        <table className="min-w-full divide-y divide-gray-200">
                            {/* Replace TableHead with thead, add sticky header styling */}
                            {/* Ensure no whitespace between thead and tr */}
                            <thead className="bg-gray-100 sticky top-0 z-20"><tr>{/* Removed whitespace before tr */}
                                    {/* Replace TableCell with th, add styling */}
                                    {columns.map((column) => (
                                        <th
                                            key={column.id}
                                            scope="col"
                                            // Apply hidden classes based on column definition
                                            className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider 
                                                        ${column.align === 'right' ? 'text-right' : ''} 
                                                        ${column.sticky ? 'sticky right-0 bg-gray-100 border-l border-gray-200 z-10' : ''} 
                                                        ${column.hideOnSmall ? 'hidden sm:table-cell' : ''} 
                                                        ${column.hideOnMedium ? 'hidden md:table-cell' : ''}
                                                      `}
                                            style={{ minWidth: column.minWidth }}
                                        >
                                            {column.label}
                                        </th>
                                    ))}
                                </tr></thead>{/* Removed potential whitespace after tr */}
                            {/* Replace TableBody with tbody */}
                            <tbody className="bg-white divide-y divide-gray-200">
                                {cycles.map((cycle) => {
                                    const isExpanded = expandedCycleId === cycle.id;
                                    const isLoadingStatus = updatingStatus[cycle.id];

                                    return (
                                        <React.Fragment key={cycle.id}>
                                            <tr className="hover:bg-gray-50">
                                                {/* Expand Cell */}
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <Button onClick={() => handleExpandClick(cycle.id)} variant="icon" aria-label="expand row" size="small">
                                                        {isExpanded ? '-' : '+'}
                                                    </Button>
                                                </td>
                                                {/* Status Cell */}
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 capitalize">
                                                    {cycle.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </td>
                                                {/* Recipe Cell */}
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    {cycle.chosenRecipe?.recipeName || '-'}
                                                </td>
                                                {/* Servings Cell - Restore responsive hiding */}
                                                <td className={`px-4 py-2 whitespace-nowrap text-sm text-gray-700 text-right hidden sm:table-cell`}>
                                                    {cycle.totalMealCounts ?? '-'}
                                                </td>
                                                {/* Protein Cell - Restore responsive hiding and truncate */}
                                                <td className={`px-4 py-2 text-sm text-gray-700 hidden md:table-cell`} title={formatProteinCounts(cycle.totalCountsByProtein)}>
                                                     <span className="truncate max-w-[150px] inline-block">
                                                         {formatProteinCounts(cycle.totalCountsByProtein)}
                                                     </span>
                                                </td>
                                                {/* Deadline Cell - Restore responsive hiding */}
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                                    {cycle.orderDeadline}
                                                </td>
                                                {/* Cook Date Cell - Restore responsive hiding */}
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                                                    {cycle.targetCookDate}
                                                </td>
                                                {/* Actions Cell */}                                                
                                                <td className="sticky right-0 bg-white border-l border-gray-200 z-10">
                                                    <div className="flex items-center justify-center p-1"> {/* Centered content */}
                                                        {isLoadingStatus ? (
                                                            <Spinner size="small" />
                                                        ) : (
                                                            <select
                                                                value={cycle.status || ''}
                                                                onChange={(e) => handleStatusChange(cycle.id, e.target.value)}
                                                                disabled={isLoadingStatus}
                                                                className="block w-36 pl-2 pr-8 py-1 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md shadow-sm disabled:opacity-50 disabled:bg-gray-100"
                                                                title={`Current status: ${cycle.status}`}
                                                            >
                                                                {cycleStatuses.map((status) => (
                                                                    <option key={status} value={status}>
                                                                        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expanded Row - Replace TableRow/TableCell */} 
                                            {isExpanded && (
                                                <tr className="bg-gray-50">
                                                    {/* Use td spanning columns */}
                                                    <td colSpan={numberOfColumns} className="p-0 border-b-0">
                                                         <div className="p-4">
                                                             <h3 className="text-lg font-medium text-gray-800 mb-3">
                                                                 Orders for: {cycle.chosenRecipe?.recipeName || `Cycle ${cycle.id}`}
                                                             </h3>
                                                             {loadingOrders ? (
                                                                 <div className="flex justify-center items-center p-4">
                                                                      <Spinner />
                                                                 </div>
                                                             ) : ordersError ? (
                                                                <Alert type="error" message={ordersError} />
                                                             ) : cycleOrders.length > 0 ? (
                                                                 <div className="overflow-x-auto">
                                                                     {/* Sub-table for orders */}
                                                                     <table className="min-w-full divide-y divide-gray-200">
                                                                          <thead className="bg-gray-100">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meals</th>
                                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                                                                            </tr>
                                                                          </thead>
                                                                         <tbody className="bg-white divide-y divide-gray-200">
                                                                            {cycleOrders.map(order => (
                                                                                <tr key={order.id}>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{order.userName || order.userId || 'Unknown User'}</td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                                                                                        {/* Add space after comma */}
                                                                                        {order.items?.map(item => `${item.protein}: ${item.quantity}`).join(', \u00A0 ') || '-'} 
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 capitalize">
                                                                                        {order.locationStatus?.replace('_', ' ') || '-'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                         </tbody>
                                                                     </table>
                                                                 </div>
                                                             ) : (
                                                                 <p className="text-sm text-gray-500">No orders found for this cycle.</p>
                                                             )}
                                                         </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MealCycleManagementPage; 