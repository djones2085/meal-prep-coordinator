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
    LinearProgress
} from '@mui/material';

// Assume commonUnits are defined or import them if needed from AddRecipePage
const commonUnits = ['g', 'kg', 'ml', 'l', 'unit', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pinch', 'slice', 'clove'];

function DashboardPage() {
    const { currentUser } = useAuth();
    const [activeCycle, setActiveCycle] = useState(null); // Can be planned or ordering cycle
    const [chosenRecipeDetails, setChosenRecipeDetails] = useState(null);
    const [userOrder, setUserOrder] = useState(null); // Stores user's existing order for the cycle

    // --- State for Ordering Form ---
    const [orderServings, setOrderServings] = useState(1);
    const [orderProteinChoice, setOrderProteinChoice] = useState('');
    const [orderCustomizations, setOrderCustomizations] = useState([]); // e.g., ['no cheese']

    // --- Loading / Error States ---
    const [loadingCycle, setLoadingCycle] = useState(true);
    const [loadingOrderCheck, setLoadingOrderCheck] = useState(true);
    const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [error, setError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState('');

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
                setChosenRecipeDetails({ id: docSnap.id, ...docSnap.data() });
                // Set default protein choice if applicable
                const defaultOption = docSnap.data().proteinOptions?.find(opt => opt.isDefault);
                if (defaultOption) {
                    setOrderProteinChoice(defaultOption.optionName);
                } else if (docSnap.data().proteinOptions?.length > 0) {
                    // Select the first option if no default is set
                     setOrderProteinChoice(docSnap.data().proteinOptions[0].optionName);
                }

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

    // --- Handle Order Submission ---
    const handleOrderSubmit = async () => {
        if (!currentUser || !activeCycle || !chosenRecipeDetails) {
            setError("Cannot submit order: missing user, cycle, or recipe details.");
            return;
        }

        // Simple validation
        if (orderServings <= 0) {
            setError("Please enter a valid number of servings (at least 1).");
            return;
        }
         if (chosenRecipeDetails.proteinOptions?.length > 0 && !orderProteinChoice) {
            setError("Please select a protein option.");
            return;
        }

        setIsSubmittingOrder(true);
        setError('');
        setOrderSuccess('');

        const orderData = {
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email, // Store user identifier
            cycleId: activeCycle.id,
            recipeId: chosenRecipeDetails.id,
            recipeName: chosenRecipeDetails.name,
            servings: Number(orderServings),
            proteinChoice: orderProteinChoice || null,
            customizations: orderCustomizations || [],
            orderTimestamp: serverTimestamp(),
            status: 'placed', // Initial order status
        };

        try {
            const ordersRef = collection(db, "orders");
            const docRef = await addDoc(ordersRef, orderData);
            console.log("Order placed with ID: ", docRef.id);
            setOrderSuccess("Your order has been placed successfully!");
            setUserOrder({ id: docRef.id, ...orderData }); // Update local state to show order placed
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

        // Display ordering form
        return (
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>Place Your Order</Typography>
                <Grid container spacing={2}>
                    <Grid xs={12} sm={4}>
                        <TextField
                            label="Number of Servings"
                            type="number"
                            value={orderServings}
                            onChange={(e) => setOrderServings(parseInt(e.target.value, 10) || 1)}
                            InputProps={{ inputProps: { min: 1 } }}
                            fullWidth
                            disabled={isSubmittingOrder}
                            required
                        />
                    </Grid>
                    {chosenRecipeDetails?.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0 && (
                        <Grid xs={12} sm={8}>
                            <FormControl fullWidth required disabled={isSubmittingOrder}>
                                <InputLabel id="protein-choice-label">Protein Choice</InputLabel>
                                <Select
                                    labelId="protein-choice-label"
                                    value={orderProteinChoice}
                                    label="Protein Choice"
                                    onChange={(e) => setOrderProteinChoice(e.target.value)}
                                >
                                    {chosenRecipeDetails.proteinOptions.map((opt) => (
                                        <MenuItem key={opt.optionName} value={opt.optionName}>
                                            {opt.optionName} (+${opt.addedCost?.toFixed(2) || '0.00'})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
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
        <Container maxWidth="md">
            <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 3, mb: 2 }}>
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