import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { collection, getDocs, query, where, limit, addDoc, updateDoc, serverTimestamp, Timestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
    PageContainer,
    LoadingSpinner,
    Alert,
    Button,
    TextField,
    Card,
    StatusChip
} from '../components/mui';
import {
    Typography,
    Box,
    Divider,
    Grid,
    List,
    ListItem,
    ListItemText,
    Link,
    Paper,
    Chip,
    FormControl,
    FormLabel,
    FormGroup,
    FormControlLabel,
    Checkbox
} from '@mui/material';

// Assume commonUnits are defined or import them if needed from AddRecipePage
const commonUnits = ['g', 'kg', 'ml', 'l', 'unit', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pinch', 'slice', 'clove'];

function DashboardPage() {
    const { currentUser } = useAuth();
    const [activeCycle, setActiveCycle] = useState(null);
    const [chosenRecipeDetails, setChosenRecipeDetails] = useState(null);
    const [userOrder, setUserOrder] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    const [orderQuantities, setOrderQuantities] = useState({});
    const [orderCustomizations, setOrderCustomizations] = useState([]);
    const [isModifyingOrder, setIsModifyingOrder] = useState(false);

    const [loadingCycle, setLoadingCycle] = useState(true);
    const [loadingOrderCheck, setLoadingOrderCheck] = useState(true);
    const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [error, setError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState('');
    const [orderValidationError, setOrderValidationError] = useState('');

    // Fetch User Profile
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
                setUserProfile(null);
            }
            setLoadingProfile(false);
        }, (err) => {
            console.error("Error fetching user profile:", err);
            setError("Could not load user profile information.");
            setLoadingProfile(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    // Fetch Active Cycle
    useEffect(() => {
        const fetchActiveCycle = async () => {
            setLoadingCycle(true);
            setError('');
            setActiveCycle(null);
            setChosenRecipeDetails(null);
            setUserOrder(null);
            setOrderSuccess('');
            try {
                const cyclesRef = collection(db, "mealCycles");
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
                    if (cycle.chosenRecipe?.recipeId) {
                        fetchChosenRecipe(cycle.chosenRecipe.recipeId);
                    } else {
                        setError("Active cycle found, but recipe details are missing.");
                    }
                }
            } catch (err) {
                console.error("Error fetching active cycle:", err);
                setError("Could not load meal cycle information.");
            } finally {
                setLoadingCycle(false);
            }
        };
        fetchActiveCycle();
    }, []);

    // Fetch Chosen Recipe Details
    const fetchChosenRecipe = async (recipeId) => {
        if (!recipeId) return;
        setLoadingRecipeDetails(true);
        try {
            const recipeDocRef = doc(db, 'recipes', recipeId);
            const docSnap = await getDoc(recipeDocRef);
            if (docSnap.exists()) {
                const recipeData = { id: docSnap.id, ...docSnap.data() };
                setChosenRecipeDetails(recipeData);
                const initialQuantities = {};
                if (recipeData.proteinOptions && recipeData.proteinOptions.length > 0) {
                    recipeData.proteinOptions.forEach(opt => {
                        initialQuantities[opt.optionName] = 0;
                    });
                } else {
                    initialQuantities["default"] = 1;
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

    // Check User Order
    useEffect(() => {
        if (!activeCycle || !['planned', 'ordering_open'].includes(activeCycle.status) || !currentUser) {
            setLoadingOrderCheck(false);
            setUserOrder(null);
            setIsModifyingOrder(false);
            return;
        }
        setLoadingOrderCheck(true);
        setUserOrder(null);
        setIsModifyingOrder(false);
        const ordersRef = collection(db, "orders");
        const q = query(
            ordersRef,
            where("cycleId", "==", activeCycle.id),
            where("userId", "==", currentUser.uid),
            limit(1)
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const orderDoc = querySnapshot.docs[0];
                const orderData = { id: orderDoc.id, ...orderDoc.data() };
                setUserOrder(orderData);
                const initialQuantities = {};
                if (chosenRecipeDetails?.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0) {
                    chosenRecipeDetails.proteinOptions.forEach(opt => {
                        const existingItem = orderData.items?.find(item => item.protein === opt.optionName);
                        initialQuantities[opt.optionName] = existingItem ? existingItem.quantity : 0;
                    });
                } else {
                    const existingItem = orderData.items?.find(item => item.protein === 'default');
                    initialQuantities["default"] = existingItem ? existingItem.quantity : (orderData.totalServings || 0);
                }
                setOrderQuantities(initialQuantities);
                setOrderCustomizations(orderData.customizations || []);
            } else {
                setUserOrder(null);
                if (chosenRecipeDetails) {
                    const initialQuantities = {};
                    if (chosenRecipeDetails.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0) {
                        chosenRecipeDetails.proteinOptions.forEach(opt => {
                            initialQuantities[opt.optionName] = 0;
                        });
                    } else {
                        initialQuantities["default"] = 1;
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
        return () => unsubscribe();
    }, [activeCycle, currentUser, chosenRecipeDetails]);

    const handleQuantityChange = (proteinName, value) => {
        const quantity = parseInt(value, 10);
        const validQuantity = !isNaN(quantity) && quantity >= 0 ? quantity : 0;
        setOrderQuantities(prev => ({
            ...prev,
            [proteinName]: validQuantity
        }));
        setOrderValidationError('');
    };

    const handleCustomizationChange = (event) => {
        const { name, checked } = event.target;
        setOrderCustomizations(prev =>
            checked ? [...prev, name] : prev.filter(c => c !== name)
        );
    };

    const handleModifyOrderClick = () => {
        if (!userOrder) return;
        // Quantities are already pre-filled by the useEffect
        setIsModifyingOrder(true);
        setOrderSuccess(''); // Clear previous success message
    };

    const handleOrderSubmit = async () => {
        // Basic validation: Ensure at least one item is ordered
        const totalQuantity = Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0);
        if (totalQuantity <= 0) {
            setOrderValidationError("Please select at least one meal.");
            return;
        }
        setOrderValidationError(''); // Clear validation error
        setIsSubmittingOrder(true);
        setError('');
        setOrderSuccess('');

        try {
            const orderData = {
                cycleId: activeCycle.id,
                userId: currentUser.uid,
                userName: userProfile?.displayName || currentUser.email, // Use profile name or email
                orderTimestamp: serverTimestamp(),
                status: 'placed', // Initial status
                items: Object.entries(orderQuantities)
                            .filter(([_, qty]) => qty > 0) // Only include items with quantity > 0
                            .map(([protein, quantity]) => ({ protein, quantity })),
                customizations: orderCustomizations,
                locationStatus: userProfile?.defaultLocation || 'carry_out', // Default from profile or fallback
                totalServings: totalQuantity,
                // Add recipe details for easy reference if needed
                recipeName: chosenRecipeDetails?.name || 'N/A',
                recipeId: chosenRecipeDetails?.id || 'N/A',
            };

            if (isModifyingOrder && userOrder?.id) {
                // Update existing order
                const orderRef = doc(db, 'orders', userOrder.id);
                // Overwrite timestamp only if specifically desired, otherwise keep original
                // Here, we update everything including the timestamp to reflect modification time
                await updateDoc(orderRef, orderData);
                setOrderSuccess("Order updated successfully!");
            } else {
                // Add new order
                const ordersRef = collection(db, "orders");
                await addDoc(ordersRef, orderData);
                setOrderSuccess("Order placed successfully!");
            }
            setIsModifyingOrder(false); // Exit modification mode after successful submission
        } catch (err) {
            console.error("Error submitting order:", err);
            setError("Failed to submit your order. Please try again.");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    const renderOrderingSection = () => {
        if (!activeCycle || !chosenRecipeDetails) {
            return <Typography>Recipe details are loading or unavailable.</Typography>;
        }

        const isOrderingOpen = activeCycle.status === 'ordering_open';
        const deadlinePassed = activeCycle.orderDeadline && new Date() > activeCycle.orderDeadline;
        const showForm = isOrderingOpen && !deadlinePassed && (!userOrder || isModifyingOrder);
        const showExistingOrder = userOrder && !isModifyingOrder;

        return (
            <Card sx={{ mt: 3 }}>
                 <Box sx={{ p: 2 }}>
                     <Typography variant="h6" gutterBottom>
                         Order: {chosenRecipeDetails.name}
                     </Typography>

                    {isOrderingOpen && activeCycle.orderDeadline && (
                         <Typography variant="body2" color={deadlinePassed ? "error" : "text.secondary"} gutterBottom>
                             Order Deadline: {activeCycle.orderDeadline.toLocaleString()}
                             {deadlinePassed && " (Deadline Passed)"}
                         </Typography>
                     )}
                    {!isOrderingOpen && activeCycle.status === 'planned' && (
                        <Chip label="Ordering Not Yet Open" color="info" size="small" sx={{ mb: 1 }}/>
                    )}

                    {(loadingOrderCheck || loadingRecipeDetails) && <LoadingSpinner size={30} sx={{ my: 2 }}/>}

                    {showExistingOrder && (
                        <Box sx={{ my: 2, p: 2, border: '1px solid', borderColor: 'success.light', borderRadius: 1, bgcolor: 'success.ultralight' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ color: 'success.dark' }}>Your Current Order:</Typography>
                            {userOrder.items.map(item => (
                                <Typography key={item.protein} variant="body2" sx={{ color: 'success.dark' }}>
                                    {item.protein}: {item.quantity}
                                </Typography>
                            ))}
                            {userOrder.customizations && userOrder.customizations.length > 0 && (
                                <Typography variant="body2" sx={{ mt: 1, color: 'success.dark' }}>
                                    Customizations: {userOrder.customizations.join(', ')}
                                </Typography>
                            )}
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handleModifyOrderClick}
                                sx={{ mt: 1.5 }}
                                disabled={!isOrderingOpen || deadlinePassed}
                            >
                                Modify Order
                            </Button>
                        </Box>
                    )}

                    {showForm && (
                        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleOrderSubmit(); }} sx={{ mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                {isModifyingOrder ? "Modify Your Meal Quantities" : "Select Meal Quantities"}
                            </Typography>
                             <Grid container spacing={2} sx={{ mb: 2 }}>
                                {chosenRecipeDetails.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0 ? (
                                     chosenRecipeDetails.proteinOptions.map(option => (
                                         <Grid item xs={6} sm={4} key={option.optionName}>
                                             <TextField
                                                 label={option.optionName}
                                                 type="number"
                                                 value={orderQuantities[option.optionName] || 0}
                                                 onChange={(e) => handleQuantityChange(option.optionName, e.target.value)}
                                                 inputProps={{ min: 0 }}
                                                 size="small"
                                                 fullWidth
                                             />
                                         </Grid>
                                     ))
                                ) : (
                                     <Grid item xs={6} sm={4}>
                                         <TextField
                                             label="Quantity"
                                             type="number"
                                             value={orderQuantities["default"] || 1}
                                             onChange={(e) => handleQuantityChange("default", e.target.value)}
                                             inputProps={{ min: 0 }}
                                             size="small"
                                             fullWidth
                                         />
                                     </Grid>
                                )}
                            </Grid>

                            {chosenRecipeDetails.customizationOptions && chosenRecipeDetails.customizationOptions.length > 0 && (
                                <FormControl component="fieldset" sx={{ mt: 2, mb: 2 }}>
                                    <FormLabel component="legend">Customizations</FormLabel>
                                    <FormGroup row>
                                        {chosenRecipeDetails.customizationOptions.map(cust => (
                                            <FormControlLabel
                                                key={cust}
                                                control={
                                                    <Checkbox
                                                        checked={orderCustomizations.includes(cust)}
                                                        onChange={handleCustomizationChange}
                                                        name={cust}
                                                        size="small"
                                                    />
                                                }
                                                label={cust}
                                            />
                                        ))}
                                    </FormGroup>
                                </FormControl>
                            )}

                            {orderValidationError && (
                                <Alert severity="error" sx={{ mb: 2 }}>{orderValidationError}</Alert>
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                isLoading={isSubmittingOrder}
                                disabled={isSubmittingOrder || !isOrderingOpen || deadlinePassed}
                            >
                                {isModifyingOrder ? 'Update Order' : 'Place Order'}
                            </Button>
                            {isModifyingOrder && (
                                <Button
                                    variant="text"
                                    onClick={() => setIsModifyingOrder(false)} // Cancel modification
                                    sx={{ mt: 1, ml: 1 }} // Align properly
                                    size="small"
                                >
                                    Cancel
                                </Button>
                            )}
                        </Box>
                    )}

                    {/* Display success/error messages */} 
                    {orderSuccess && (
                        <Alert severity="success" sx={{ mt: 2 }}>{orderSuccess}</Alert>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
                    )}

                </Box>
             </Card>
        );
    };

    const renderWelcome = () => (
         <Card sx={{ mt: 3, p: 2 }}>
             <Typography variant="h5" gutterBottom>
                 Welcome, {userProfile?.displayName || currentUser?.email}!
             </Typography>
            <Typography variant="body1">
                Check the current meal cycle below or manage your recipes.
            </Typography>
            {userProfile?.isAdmin && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                    Admin Links: <Link component={RouterLink} to="/admin/cycles">Manage Cycles</Link> | <Link component={RouterLink} to="/admin/planning">Plan Next Cycle</Link>
                </Typography>
            )}
        </Card>
    );

    return (
        <PageContainer>
            {(loadingProfile || loadingCycle) ? (
                <LoadingSpinner centered size={60} />
            ) : (
                <>
                    {renderWelcome()}

                    {activeCycle ? (
                        renderOrderingSection()
                    ) : (
                         <Card sx={{ mt: 3, p: 2, textAlign: 'center' }}>
                             <Typography variant="h6" gutterBottom>
                                 No Active Meal Cycle
                             </Typography>
                            <Typography color="text.secondary">
                                There isn't an active meal cycle for ordering right now.
                            </Typography>
                        </Card>
                    )}
                </>
            )}
        </PageContainer>
    );
}

export default DashboardPage; 