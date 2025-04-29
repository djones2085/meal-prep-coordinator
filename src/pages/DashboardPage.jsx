import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Keep if needed elsewhere
import { collection, getDocs, query, where, limit, addDoc, updateDoc, serverTimestamp, Timestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
// Removed MUI imports that are no longer needed
// No MUI imports needed here anymore? Check thoroughly if any were missed.
// import {} from '@mui/material';

// Import extracted components
import TailwindAlert from '../components/ui/Alert.jsx';
import StyledInput from '../components/ui/Input.jsx';
import StyledButton from '../components/ui/Button.jsx';
import Spinner from '../components/ui/Spinner.jsx';

// Assume commonUnits are defined or import them if needed from AddRecipePage
const commonUnits = ['g', 'kg', 'ml', 'l', 'unit', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pinch', 'slice', 'clove'];

// --- Removed Reusable Tailwind Component Definitions ---
// const TailwindAlert = (...) => { ... };
// const StyledInput = React.forwardRef(...) => { ... };
// const StyledButton = (...) => { ... };
// const Spinner = (...) => { ... };

function DashboardPage() {
    const { currentUser } = useAuth();
    const [activeCycle, setActiveCycle] = useState(null); // Can be planned or ordering cycle
    const [chosenRecipeDetails, setChosenRecipeDetails] = useState(null);
    const [userOrder, setUserOrder] = useState(null); // Stores user's existing order for the cycle
    const [userProfile, setUserProfile] = useState(null); // Store user profile data

    // --- State for Ordering Form ---
    const [orderQuantities, setOrderQuantities] = useState({}); // { proteinName: quantity }
    const [orderCustomizations, setOrderCustomizations] = useState([]); // e.g., ['no cheese']
    const [isModifyingOrder, setIsModifyingOrder] = useState(false); // Track if user is modifying

    // --- Loading / Error States ---
    const [loadingCycle, setLoadingCycle] = useState(true);
    const [loadingOrderCheck, setLoadingOrderCheck] = useState(true);
    const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true); // Added loading state for profile
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [error, setError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState('');
    const [orderValidationError, setOrderValidationError] = useState(''); // Specific for quantity validation

    // --- Fetch User Profile ---
    useEffect(() => {
        if (!currentUser) {
            setLoadingProfile(false);
            return;
        }
        setLoadingProfile(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile({ id: docSnap.id, ...docSnap.data() });
            } else {
                console.warn("User profile document not found for UID:", currentUser.uid);
                // Set default or handle missing profile?
                setUserProfile(null); // Or set a default profile structure
            }
            setLoadingProfile(false);
        }, (err) => {
            console.error("Error fetching user profile:", err);
            setError("Could not load user profile information.");
            setLoadingProfile(false);
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [currentUser]);

    // --- Fetch Active Cycle (Planned or Ordering) ---
    useEffect(() => {
        const fetchActiveCycle = async () => {
            setLoadingCycle(true);
            setError('');
            setActiveCycle(null); // Reset on fetch
            setChosenRecipeDetails(null);
            setUserOrder(null);
            setOrderSuccess('');

            try {
                const cyclesRef = collection(db, "mealCycles");
                // Look for 'planned' OR 'ordering_open' cycle
                const q = query(cyclesRef, where("status", "in", ["planned", "ordering_open"]), limit(1));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const cycleDoc = querySnapshot.docs[0];
                    const cycleData = cycleDoc.data();
                    const cycle = {
                        id: cycleDoc.id,
                        ...cycleData,
                        orderDeadline: cycleData.orderDeadline?.toDate ? cycleData.orderDeadline.toDate() : null,
                        targetCookDate: cycleData.targetCookDate?.toDate ? cycleData.targetCookDate.toDate() : null,
                    };
                    setActiveCycle(cycle);

                    // If cycle exists and has a chosen recipe, fetch its details
                    if (cycle.chosenRecipe?.recipeId) {
                        fetchChosenRecipe(cycle.chosenRecipe.recipeId);
                    } else {
                        // Handle case where cycle exists but recipe is missing (shouldn't happen with new flow)
                        setError("Active cycle found, but recipe details are missing.");
                    }
                } else {
                    // No active cycle found with status 'planned' or 'ordering_open'
                }
            } catch (err) {
                console.error("Error fetching active cycle:", err);
                setError("Could not load meal cycle information.");
            } finally {
                setLoadingCycle(false);
            }
        };
        fetchActiveCycle();
    }, []); // Fetch cycle on initial load

    // --- Fetch Chosen Recipe Details ---
    const fetchChosenRecipe = async (recipeId) => {
        if (!recipeId) return;
        setLoadingRecipeDetails(true);
        try {
            const recipeDocRef = doc(db, 'recipes', recipeId);
            const docSnap = await getDoc(recipeDocRef);
            if (docSnap.exists()) {
                const recipeData = { id: docSnap.id, ...docSnap.data() };
                setChosenRecipeDetails(recipeData);
                // Initialize orderQuantities with 0 for each protein option
                const initialQuantities = {};
                if (recipeData.proteinOptions && recipeData.proteinOptions.length > 0) {
                    recipeData.proteinOptions.forEach(opt => {
                        initialQuantities[opt.optionName] = 0;
                    });
                } else {
                     initialQuantities["default"] = 1; // Default quantity if no protein options
                }
                setOrderQuantities(initialQuantities);
            } else {
                setError(`Chosen recipe (ID: ${recipeId}) not found.`);
                setChosenRecipeDetails(null);
            }
        } catch (err) {
            console.error("Error fetching chosen recipe:", err);
            setError("Could not load details for the chosen recipe.");
        } finally {
            setLoadingRecipeDetails(false);
        }
    };

    // --- Check User Order (if cycle is ordering_open or planned) ---
    useEffect(() => {
        // Check order status if the cycle allows ordering (either planned or ordering_open)
        if (!activeCycle || !['planned', 'ordering_open'].includes(activeCycle.status) || !currentUser) {
            setLoadingOrderCheck(false);
            setUserOrder(null); // Ensure order state is clear if conditions aren't met
            setIsModifyingOrder(false); // Reset modification state
            return;
        }

        setLoadingOrderCheck(true);
        setUserOrder(null); // Reset before checking
        setIsModifyingOrder(false); // Reset modification state
        const ordersRef = collection(db, "orders");
        const q = query(
            ordersRef,
            where("cycleId", "==", activeCycle.id),
            where("userId", "==", currentUser.uid),
            limit(1)
        );

        // Use onSnapshot to listen for real-time changes to the order
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const orderDoc = querySnapshot.docs[0];
                const orderData = { id: orderDoc.id, ...orderDoc.data() };
                setUserOrder(orderData);
                // Don't set success message here, let render logic handle display
                // If an order exists, pre-fill quantities for potential modification
                const initialQuantities = {};
                 if (chosenRecipeDetails?.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0) {
                    chosenRecipeDetails.proteinOptions.forEach(opt => {
                         const existingItem = orderData.items?.find(item => item.protein === opt.optionName);
                         initialQuantities[opt.optionName] = existingItem ? existingItem.quantity : 0;
                     });
                 } else {
                     // Handle case with no protein options
                     const existingItem = orderData.items?.find(item => item.protein === 'default'); // Assuming 'default' key
                     initialQuantities["default"] = existingItem ? existingItem.quantity : (orderData.totalServings || 0);
                 }
                setOrderQuantities(initialQuantities);
                setOrderCustomizations(orderData.customizations || []);

            } else {
                setUserOrder(null);
                // Reset quantities if no order exists
                 if (chosenRecipeDetails) {
                     const initialQuantities = {};
                     if (chosenRecipeDetails.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0) {
                         chosenRecipeDetails.proteinOptions.forEach(opt => {
                             initialQuantities[opt.optionName] = 0;
                         });
                     } else {
                         initialQuantities["default"] = 1; // Default to 1 if creating new order
                     }
                     setOrderQuantities(initialQuantities);
                     setOrderCustomizations([]);
                 }
            }
            setLoadingOrderCheck(false);
        }, (err) => {
            console.error("Error checking user order:", err);
            setError("Could not verify order status.");
            setLoadingOrderCheck(false);
        });

        return () => unsubscribe(); // Cleanup listener

    }, [activeCycle, currentUser, chosenRecipeDetails]); // Add chosenRecipeDetails dependency

    // --- Handler for Quantity Input Change ---
    const handleQuantityChange = (proteinName, value) => {
        const quantity = parseInt(value, 10);
        // Allow 0, but treat NaN or negative as 0
        const validQuantity = !isNaN(quantity) && quantity >= 0 ? quantity : 0;
        setOrderQuantities(prev => ({
            ...prev,
            [proteinName]: validQuantity
        }));
        setOrderValidationError(''); // Clear validation error on change
    };

    // --- Handle Modify Button Click ---
    const handleModifyOrderClick = () => {
        if (!userOrder) return; // Should not happen if button is shown

        // Pre-fill form state with existing order details
        const currentQuantities = {};
        if (chosenRecipeDetails?.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0) {
            chosenRecipeDetails.proteinOptions.forEach(opt => {
                const existingItem = userOrder.items?.find(item => item.protein === opt.optionName);
                currentQuantities[opt.optionName] = existingItem ? existingItem.quantity : 0;
            });
        } else {
            // Handle case with no protein options
            const existingItem = userOrder.items?.find(item => item.protein === 'default');
            currentQuantities["default"] = existingItem ? existingItem.quantity : (userOrder.totalServings || 0);
        }
        setOrderQuantities(currentQuantities);
        setOrderCustomizations(userOrder.customizations || []);

        setIsModifyingOrder(true); // Show the form
        setOrderSuccess(''); // Clear previous success messages
        setOrderValidationError(''); // Clear validation errors
    };

    // --- Handle Order Submission / Update ---
    const handleOrderSubmit = async () => {
        if (!currentUser || !activeCycle || !chosenRecipeDetails || !userProfile) { // Ensure profile is loaded
            setError("Cannot submit order: missing user, cycle, recipe, or profile details.");
            return;
        }

        setOrderValidationError(''); // Clear previous validation errors

        // 1. Create items array from orderQuantities
        const items = Object.entries(orderQuantities)
            .map(([protein, quantity]) => ({ protein, quantity }))
            .filter(item => item.quantity > 0); // Only include items with quantity > 0

        // 2. Calculate totalServings
        const totalServings = items.reduce((sum, item) => sum + item.quantity, 0);

        // 3. Validation
        if (totalServings <= 0) {
            setOrderValidationError("Please order at least one serving.");
            return;
        }

        setIsSubmittingOrder(true);
        setError('');
        setOrderSuccess('');

        // 4. Prepare orderData with new structure
        const orderData = {
            userId: currentUser.uid,
            // Use profile displayName if available, otherwise fallback to email
            userName: userProfile.displayName || currentUser.email,
            cycleId: activeCycle.id,
            recipeId: chosenRecipeDetails.id,
            recipeName: chosenRecipeDetails.name,
            items: items, // Array of { protein, quantity }
            totalServings: totalServings,
            customizations: orderCustomizations || [],
            // Add locationStatus from user profile
            locationStatus: userProfile.locationStatus || 'unknown', // Default if not set
            // Use serverTimestamp for new orders, keep existing for updates? Or update timestamp? Let's update.
            orderTimestamp: serverTimestamp(),
            status: 'placed', // Keep status as placed
        };

        try {
            if (userOrder && userOrder.id) {
                // --- UPDATE Existing Order ---
                const orderDocRef = doc(db, "orders", userOrder.id);
                await updateDoc(orderDocRef, orderData);
                console.log("Order updated for ID: ", userOrder.id);
                setOrderSuccess("Your order has been updated successfully!");
                // Update local state immediately (or rely on snapshot listener)
                setUserOrder({ ...orderData, id: userOrder.id }); // Update local state
            } else {
                // --- ADD New Order ---
                const ordersRef = collection(db, "orders");
                const docRef = await addDoc(ordersRef, orderData);
                console.log("Order placed with ID: ", docRef.id);
                setOrderSuccess("Your order has been placed successfully!");
                // Update local state immediately (or rely on snapshot listener)
                setUserOrder({ ...orderData, id: docRef.id }); // Update local state with new ID
            }
            setIsModifyingOrder(false); // Hide form after successful submission/update
        } catch (err) {
            console.error("Error saving order:", err);
            setError("Failed to save order. Please check the details and try again.");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    // --- Render Ordering Section (If applicable) ---
    const renderOrderingSection = () => {
        if (loadingOrderCheck || loadingRecipeDetails || loadingProfile) { // Include profile loading
            return <p className="text-center text-gray-500 py-4">Loading order details...</p>;
        }

        const now = new Date();
        const deadlinePassed = activeCycle.orderDeadline && now > activeCycle.orderDeadline;

        if (userOrder && !isModifyingOrder) {
            // --- User has an existing order and is NOT modifying ---
            const itemsSummary = userOrder.items?.map(item =>
                `${item.quantity} x ${item.protein === 'default' ? chosenRecipeDetails?.name : item.protein}`
            ).join(', ');

            return (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Your Current Order</h3>
                    <div className="bg-gray-50 shadow border border-gray-200 rounded-lg p-4 mb-4">
                         <p className="text-sm mb-1">
                             <strong>Recipe:</strong> {userOrder.recipeName}
                         </p>
                         <p className="text-sm mb-1">
                             <strong>Items:</strong> {itemsSummary || 'N/A'}
                         </p>
                         <p className="text-sm mb-1">
                             <strong>Total Servings:</strong> {userOrder.totalServings}
                         </p>
                         {userOrder.customizations && userOrder.customizations.length > 0 && (
                            <p className="text-sm mb-1">
                                <strong>Customizations:</strong> {userOrder.customizations.join(', ')}
                            </p>
                         )}
                        {userOrder.orderTimestamp?.toDate && (
                            <p className="text-xs text-gray-500 mt-2">
                                Ordered on: {userOrder.orderTimestamp.toDate().toLocaleString()}
                             </p>
                        )}
                    </div>
                    {orderSuccess && <TailwindAlert severity="success">{orderSuccess}</TailwindAlert>}
                    {!deadlinePassed ? (
                        <StyledButton
                            variant="outline"
                            onClick={handleModifyOrderClick}
                            disabled={isSubmittingOrder}
                        >
                            Modify Order
                        </StyledButton>
                    ) : (
                        <TailwindAlert severity="info">The ordering deadline has passed. Your order is final.</TailwindAlert>
                    )}
                </div>
            );
        }

        if (deadlinePassed && !userOrder) {
             // Deadline passed and user never placed an order
             return (
                 <TailwindAlert severity="warning" className="mt-6">The ordering deadline for this cycle has passed.</TailwindAlert>
            );
        }

        // --- User is placing a new order OR modifying an existing one ---
        const proteinOptions = chosenRecipeDetails?.proteinOptions;
        const hasProteinOptions = proteinOptions && proteinOptions.length > 0;

        return (
            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">
                    {isModifyingOrder ? 'Modify Your Order' : 'Place Your Order'}
                </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 items-center mb-4">
                    {hasProteinOptions ? (
                        proteinOptions.map((opt) => (
                             <div key={opt.optionName} className="flex items-center justify-between sm:justify-start space-x-2">
                                <span className="text-sm flex-grow">
                                    {opt.optionName}
                                    {opt.addedCost > 0 && <span className="text-xs text-gray-500">{` (+${opt.addedCost.toFixed(2)})`}</span>}
                                </span>
                                <StyledInput
                                    type="number"
                                    aria-label={`Quantity for ${opt.optionName}`}
                                    value={orderQuantities[opt.optionName] || 0}
                                    onChange={(e) => handleQuantityChange(opt.optionName, e.target.value)}
                                    min="0"
                                    disabled={isSubmittingOrder}
                                    className="w-20 text-center"
                                />
                            </div>
                        ))
                    ) : (
                         <div className="sm:col-span-2">
                            <StyledInput
                                label="Quantity"
                                type="number"
                                name="defaultQuantity"
                                value={orderQuantities["default"] || 0}
                                onChange={(e) => handleQuantityChange("default", e.target.value)}
                                min="0"
                                disabled={isSubmittingOrder}
                                required
                            />
                        </div>
                    )}
                     {orderValidationError && (
                        <div className="sm:col-span-2">
                            <p className="text-red-600 text-sm mt-1">{orderValidationError}</p>
                        </div>
                    )}
                </div>
                <StyledButton
                    type="submit"
                    variant="primary"
                    onClick={handleOrderSubmit}
                    disabled={isSubmittingOrder || loadingOrderCheck || loadingProfile}
                    fullWidth
                    size="large"
                    className="mt-4"
                >
                    {isSubmittingOrder && <Spinner className="-ml-1 mr-2 h-5 w-5 text-indigo-200" color="text-indigo-600"/>}
                    {isSubmittingOrder ? 'Submitting...' : (isModifyingOrder ? 'Update Order' : 'Submit Order')}
                </StyledButton>
                {isModifyingOrder && (
                     <StyledButton
                         variant="text"
                         onClick={() => setIsModifyingOrder(false)}
                         disabled={isSubmittingOrder}
                         size="small"
                         className="mt-2 text-sm"
                    >
                        Cancel Modification
                    </StyledButton>
                )}
            </div>
        );
    };

    // --- Main Render Logic ---
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 my-4 sm:my-6">
                Meal Cycle Dashboard
            </h1>

            {loadingCycle && <p className="text-center text-gray-500 py-8">Loading cycle...</p>}
            {error && <TailwindAlert severity="error">{error}</TailwindAlert>}

            {!loadingCycle && !activeCycle && (
                <p className="text-lg text-gray-600 text-center mt-8">
                    No active meal cycle found (planned or accepting orders).
                </p>
            )}

            {activeCycle && (
                <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
                        Upcoming Meal: {activeCycle.chosenRecipe?.recipeName || 'Recipe Loading...'}
                    </h2>
                    <hr className="border-t border-gray-200 my-4" />

                    <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-2 mb-4">
                        <div className="col-span-1 sm:col-span-1">
                             <p className="text-sm font-medium text-gray-600">Target Cook Date:</p>
                        </div>
                        <div className="col-span-1 sm:col-span-1">
                            <p className="text-sm text-gray-900">
                                {activeCycle.targetCookDate ? activeCycle.targetCookDate.toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                         <div className="col-span-1 sm:col-span-1">
                             <p className="text-sm font-medium text-gray-600">Order Deadline:</p>
                        </div>
                         <div className="col-span-1 sm:col-span-1">
                             <p className="text-sm text-gray-900">
                                {activeCycle.orderDeadline ? activeCycle.orderDeadline.toLocaleString() : 'N/A'}
                             </p>
                        </div>
                         <div className="col-span-1 sm:col-span-1">
                            <p className="text-sm font-medium text-gray-600">Status:</p>
                        </div>
                        <div className="col-span-1 sm:col-span-1">
                            <p className="text-sm text-gray-900 capitalize">
                                {activeCycle.status.replace('_', ' ')}
                            </p>
                        </div>
                    </div>

                    {loadingRecipeDetails && <p className="text-sm text-gray-500 my-4">Loading recipe details...</p>}
                    {chosenRecipeDetails && (
                        <div className="mt-4">
                            <h3 className="text-lg font-medium text-gray-800">Recipe Details</h3>
                            <p className="text-sm text-gray-600 mt-1 mb-2">
                                {chosenRecipeDetails.description}
                            </p>
                            {/* Optional: Recipe details list (Refactored with Tailwind) */}
                            {chosenRecipeDetails.ingredients && chosenRecipeDetails.ingredients.length > 0 && (
                                <div className="mt-3">
                                    <h4 className="text-sm font-semibold mb-1 text-gray-700">Ingredients:</h4>
                                    <ul className="list-none list-outside space-y-1 text-sm text-gray-600 ml-2">
                                        {chosenRecipeDetails.ingredients.map((ing, index) => (
                                            <li key={index}>
                                                {`${ing.name} - ${ing.quantity} ${ing.unit}`}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {activeCycle.status === 'ordering_open' && chosenRecipeDetails && renderOrderingSection()}
                     {activeCycle.status === 'planned' && (
                        <TailwindAlert severity="info" className="mt-6">Ordering for this cycle has not opened yet.</TailwindAlert>
                     )}
                      {activeCycle.status !== 'ordering_open' && activeCycle.status !== 'planned' && (
                         <TailwindAlert severity="info" className="mt-6">This cycle is no longer accepting orders (Status: <span className="capitalize">{activeCycle.status.replace('_',' ')}</span>).</TailwindAlert>
                      )}

                </div>
            )}
        </div>
    );
}

export default DashboardPage; 