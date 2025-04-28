import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Keep if needed elsewhere
import { collection, getDocs, query, where, limit, addDoc, serverTimestamp, Timestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
    Container,
    Typography,
    Box,
    Paper,
    List,
    ListItem,
    ListItemText,
    Button,
    CircularProgress,
    Alert,
    FormControl,
    FormLabel,
    Divider,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    Checkbox,
    FormGroup,
    Grid,
    LinearProgress,
    FormHelperText
} from '@mui/material';

// Assume commonUnits are defined or import them if needed from AddRecipePage
const commonUnits = ['g', 'kg', 'ml', 'l', 'unit', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pinch', 'slice', 'clove'];

function DashboardPage() {
    const { currentUser } = useAuth();
    const [activeCycle, setActiveCycle] = useState(null); // Can be planned or ordering cycle
    const [chosenRecipeDetails, setChosenRecipeDetails] = useState(null);
    const [userOrder, setUserOrder] = useState(null); // Stores user's existing order for the cycle

    // --- State for Ordering Form ---
    const [orderQuantities, setOrderQuantities] = useState({}); // { proteinName: quantity }
    const [orderCustomizations, setOrderCustomizations] = useState([]); // e.g., ['no cheese']

    // --- Loading / Error States ---
    const [loadingCycle, setLoadingCycle] = useState(true);
    const [loadingOrderCheck, setLoadingOrderCheck] = useState(true);
    const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [error, setError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState('');
    const [orderValidationError, setOrderValidationError] = useState(''); // Specific for quantity validation

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
            return;
        }

        const checkUserOrder = async () => {
            setLoadingOrderCheck(true);
            setUserOrder(null); // Reset before checking
            try {
                const ordersRef = collection(db, "orders");
                const q = query(
                    ordersRef,
                    where("cycleId", "==", activeCycle.id),
                    where("userId", "==", currentUser.uid),
                    limit(1)
                );
                const orderSnapshot = await getDocs(q);

                if (!orderSnapshot.empty) {
                    const orderDoc = orderSnapshot.docs[0];
                    setUserOrder({ id: orderDoc.id, ...orderDoc.data() });
                    setOrderSuccess("You have already placed an order for this cycle.");
                    // Pre-fill form with existing order details? (Optional)
                    // const existingOrder = orderDoc.data();
                    // setOrderServings(existingOrder.servings || 1);
                    // setOrderProteinChoice(existingOrder.proteinChoice || '');
                    // setOrderCustomizations(existingOrder.customizations || []);
                } else {
                    setUserOrder(null);
                     setOrderSuccess(''); // Clear success message if no order found
                }
            } catch (err) {
                console.error("Error checking user order:", err);
                setError("Could not verify order status.");
            } finally {
                setLoadingOrderCheck(false);
            }
        };

        checkUserOrder();
    }, [activeCycle, currentUser]);

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

    // --- Handle Order Submission ---
    const handleOrderSubmit = async () => {
        if (!currentUser || !activeCycle || !chosenRecipeDetails) {
            setError("Cannot submit order: missing user, cycle, or recipe details.");
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
            userName: currentUser.displayName || currentUser.email,
            cycleId: activeCycle.id,
            recipeId: chosenRecipeDetails.id,
            recipeName: chosenRecipeDetails.name,
            items: items, // Array of { protein, quantity }
            totalServings: totalServings,
            customizations: orderCustomizations || [],
            orderTimestamp: serverTimestamp(),
            status: 'placed',
        };

        try {
            const ordersRef = collection(db, "orders");
            const docRef = await addDoc(ordersRef, orderData);
            console.log("Order placed with ID: ", docRef.id);
            setOrderSuccess("Your order has been placed successfully!");
            setUserOrder({ id: docRef.id, ...orderData }); // Update local state
        } catch (err) {
            console.error("Error placing order:", err);
            setError("Failed to place order. Please check the details and try again.");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    // --- Render Ordering Section (If applicable) ---
    const renderOrderingSection = () => {
        if (loadingOrderCheck || loadingRecipeDetails) {
            return <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />;
        }

        if (userOrder) {
            // User has already ordered - display confirmation or order details
            return (
                <Box sx={{ mt: 3 }}>
                    <Alert severity="info">{orderSuccess || "You have already placed an order for this cycle."}</Alert>
                    {/* Optionally display order details: */}
                    {/* <Typography>Your Order: {userOrder.servings} servings...</Typography> */}
                </Box>
            );
        }

        // Check if ordering deadline has passed
        const now = new Date();
        if (activeCycle.orderDeadline && now > activeCycle.orderDeadline) {
            return (
                 <Alert severity="warning" sx={{ mt: 3 }}>The ordering deadline for this cycle has passed.</Alert>
            );
        }

        const proteinOptions = chosenRecipeDetails?.proteinOptions;
        const hasProteinOptions = proteinOptions && proteinOptions.length > 0;

        return (
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Place Your Order</Typography>
                <Grid container spacing={2} alignItems="center">
                    {hasProteinOptions ? (
                        // Render quantity input for each protein option
                        proteinOptions.map((opt) => (
                            <Grid item xs={12} sm={6} key={opt.optionName} sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography sx={{ flexGrow: 1, mr: 1 }}>
                                    {opt.optionName} 
                                    {opt.addedCost > 0 && `(+${opt.addedCost.toFixed(2)})`}
                                </Typography>
                                <TextField
                                    label="Quantity"
                                    type="number"
                                    size="small"
                                    value={orderQuantities[opt.optionName] || 0} // Use state object
                                    onChange={(e) => handleQuantityChange(opt.optionName, e.target.value)}
                                    InputProps={{ inputProps: { min: 0, style: { textAlign: 'center' } } }} // Allow 0
                                    sx={{ width: '80px' }} // Adjust width as needed
                                    disabled={isSubmittingOrder}
                                />
                            </Grid>
                        ))
                    ) : (
                         // Fallback: Render single quantity input if no protein options
                         <Grid item xs={12} sm={6}>
                             <TextField
                                label="Quantity"
                                type="number"
                                value={orderQuantities["default"] || 0} // Use default key
                                onChange={(e) => handleQuantityChange("default", e.target.value)}
                                InputProps={{ inputProps: { min: 0 } }} // Allow 0
                                fullWidth
                                disabled={isSubmittingOrder}
                                required
                            />
                        </Grid>
                    )}
                     {/* Display validation error */} 
                     {orderValidationError && (
                        <Grid item xs={12}>
                            <FormHelperText error>{orderValidationError}</FormHelperText>
                        </Grid>
                    )}
                    {/* Optional: Add Customizations Section (e.g., checkboxes for 'no onion', 'extra sauce') */}
                    {/* <Grid xs={12}>
                         <FormControl component="fieldset" variant="standard">
                            <FormLabel component="legend">Customizations</FormLabel>
                            <FormGroup>
                                <FormControlLabel control={<Checkbox />} label="No Cheese" />
                                <FormControlLabel control={<Checkbox />} label="Extra Spicy" />
                            </FormGroup>
                         </FormControl>
                    </Grid> */}
                </Grid>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleOrderSubmit}
                    disabled={isSubmittingOrder || loadingOrderCheck}
                    sx={{ mt: 2 }}
                    fullWidth
                    size="large"
                >
                    {isSubmittingOrder ? <CircularProgress size={24} /> : 'Submit Order'}
                </Button>
            </Box>
        );
    };

    // --- Main Render Logic ---
    return (
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ my: { xs: 3, md: 4 } }}>
                Meal Cycle Dashboard
            </Typography>

            {loadingCycle && <CircularProgress sx={{ display: 'block', margin: 'auto' }} />}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!loadingCycle && !activeCycle && (
                <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    No active meal cycle found (planned or accepting orders).
                </Typography>
            )}

            {activeCycle && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        Upcoming Meal: {activeCycle.chosenRecipe?.recipeName || 'Recipe Loading...'}
                    </Typography>
                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid xs={6} sm={4}>
                             <Typography variant="body1"><strong>Target Cook Date:</strong></Typography>
                        </Grid>
                        <Grid xs={6} sm={8}>
                            <Typography variant="body1">
                                {activeCycle.targetCookDate ? activeCycle.targetCookDate.toLocaleDateString() : 'N/A'}
                            </Typography>
                        </Grid>
                        <Grid xs={6} sm={4}>
                             <Typography variant="body1"><strong>Order Deadline:</strong></Typography>
                        </Grid>
                        <Grid xs={6} sm={8}>
                             <Typography variant="body1">
                                {activeCycle.orderDeadline ? activeCycle.orderDeadline.toLocaleString() : 'N/A'}
                             </Typography>
                        </Grid>
                         <Grid xs={6} sm={4}>
                            <Typography variant="body1"><strong>Status:</strong></Typography>
                        </Grid>
                        <Grid xs={6} sm={8}>
                            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                                {activeCycle.status.replace('_', ' ')}
                            </Typography>
                        </Grid>
                    </Grid>

                    {loadingRecipeDetails && <LinearProgress sx={{ my: 2 }} />}
                    {chosenRecipeDetails && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6">Recipe Details</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {chosenRecipeDetails.description}
                            </Typography>
                            {/* Optionally display ingredients or other details here */} 
                            {/* <Typography variant="subtitle2">Ingredients:</Typography>
                            <List dense>
                                {chosenRecipeDetails.ingredients?.map((ing, index) => (
                                    <ListItem key={index} disablePadding>
                                        <ListItemText primary={`${ing.name} - ${ing.quantity} ${ing.unit}`} />
                                    </ListItem>
                                ))}
                            </List> */}
                         </Box>
                    )}

                    {/* Render Ordering Section if cycle status allows and recipe is loaded */}
                    {activeCycle.status === 'ordering_open' && chosenRecipeDetails && renderOrderingSection()}
                     {/* Show a message if cycle is planned but not yet open for ordering */}
                     {activeCycle.status === 'planned' && (
                        <Alert severity="info" sx={{ mt: 3 }}>Ordering for this cycle has not opened yet.</Alert>
                     )}

                </Paper>
            )}
        </Container>
    );
}

export default DashboardPage; 