import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { collection, getDocs, query, where, limit, addDoc, updateDoc, serverTimestamp, Timestamp, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import {
    PageContainer,
    LoadingSpinner,
    Alert as MuiAlert,
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
    Checkbox,
    Snackbar,
    ListItemButton,
    ListItemIcon
} from '@mui/material';
import OrderHistory from '../components/OrderHistory';

// Import Admin Page Icons (example, adjust as needed)
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import LoopIcon from '@mui/icons-material/Loop';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EmailIcon from '@mui/icons-material/Email';
import TuneIcon from '@mui/icons-material/Tune';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';

// Assume commonUnits are defined or import them if needed from AddRecipePage
const commonUnits = ['g', 'kg', 'ml', 'l', 'unit', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pinch', 'slice', 'clove'];

function DashboardPage() {
    const { currentUser } = useAuth();
    const location = useLocation();

    const [activeCycle, setActiveCycle] = useState(null);
    const [chosenRecipeDetails, setChosenRecipeDetails] = useState(null);
    const [userOrder, setUserOrder] = useState(null);
    const [userProfile, setUserProfile] = useState(null);

    const [orderQuantities, setOrderQuantities] = useState({});
    const [selectedRecipeCustomizations, setSelectedRecipeCustomizations] = useState([]);
    const [freeTextCustomization, setFreeTextCustomization] = useState('');

    const [isModifyingOrder, setIsModifyingOrder] = useState(false);

    const [loadingCycle, setLoadingCycle] = useState(true);
    const [loadingOrderCheck, setLoadingOrderCheck] = useState(true);
    const [loadingRecipeDetails, setLoadingRecipeDetails] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [error, setError] = useState('');
    const [orderSuccess, setOrderSuccess] = useState('');
    const [orderValidationError, setOrderValidationError] = useState('');

    // State for Snackbar message from navigation
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info'); // Default severity

    // Effect to show Snackbar if message is passed in location state
    useEffect(() => {
        if (location.state?.message) {
            setSnackbarMessage(location.state.message);
            setSnackbarSeverity(location.state.severity || 'info');
            setSnackbarOpen(true);
            // Clear the location state after displaying
            window.history.replaceState({}, document.title)
        }
    }, [location.state]);

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

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
                setSelectedRecipeCustomizations(orderData.selectedCustomizations || []);
                setFreeTextCustomization(orderData.freeTextCustomization || '');
            } else {
                setUserOrder(null);
                setSelectedRecipeCustomizations([]);
                setFreeTextCustomization('');
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
                }
            }
            setLoadingOrderCheck(false);
        }, (err) => {
            console.error("Error checking user order:", err);
            setError("Could not verify order status.");
            setLoadingOrderCheck(false);
        });
        return () => unsubscribe();
    }, [activeCycle, currentUser]);

    // Effect to reset/initialize customizations when chosenRecipeDetails changes
    useEffect(() => {
        if (chosenRecipeDetails && !userOrder) {
            setSelectedRecipeCustomizations([]);
            setFreeTextCustomization('');
        }
    }, [chosenRecipeDetails, userOrder]);

    const handleQuantityChange = (proteinName, value) => {
        if (value === '') {
            setOrderQuantities(prev => ({
                ...prev,
                [proteinName]: '' // Allow empty string
            }));
        } else {
            const quantity = parseInt(value, 10);
            // If parsing results in NaN or a negative number, treat as 0. Otherwise, use the parsed quantity.
            const newQuantity = !isNaN(quantity) && quantity >= 0 ? quantity : 0;
            setOrderQuantities(prev => ({
                ...prev,
                [proteinName]: newQuantity
            }));
        }
        setOrderValidationError('');
    };

    const handleSelectedRecipeCustomizationChange = (event) => {
        const { value, checked } = event.target;
        setSelectedRecipeCustomizations(prev =>
            checked ? [...prev, value] : prev.filter(c => c !== value)
        );
    };

    const handleModifyOrderClick = () => {
        if (!userOrder || !activeCycle || !chosenRecipeDetails) {
            setError("Cannot modify order: essential data missing.");
            return;
        }

        // Check if order deadline has passed
        if (activeCycle.orderDeadline && new Date() > activeCycle.orderDeadline) {
            setError("The order deadline has passed. You can no longer modify your order.");
            setOrderSuccess('');
            return;
        }

        setIsModifyingOrder(true);
        setOrderSuccess(''); // Clear any previous success messages
        setError('');
        setOrderValidationError('');


        // Repopulate form states from userOrder
        const initialQuantities = {};
        if (chosenRecipeDetails.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0) {
            chosenRecipeDetails.proteinOptions.forEach(opt => {
                const existingItem = userOrder.items?.find(item => item.protein === opt.optionName);
                initialQuantities[opt.optionName] = existingItem ? existingItem.quantity : 0;
            });
        } else {
            const existingItem = userOrder.items?.find(item => item.protein === 'default'); // or however default protein is identified
            initialQuantities["default"] = existingItem ? existingItem.quantity : (userOrder.totalServings || 0);
        }
        setOrderQuantities(initialQuantities);

        setSelectedRecipeCustomizations(userOrder.selectedCustomizations || []);
        setFreeTextCustomization(userOrder.freeTextCustomization || '');
    };

    const handleOrderSubmit = async () => {
        setError('');
        setOrderSuccess('');
        setOrderValidationError('');

        if (!activeCycle || !chosenRecipeDetails || !userProfile) {
            setOrderValidationError("Cannot submit order: essential data missing (cycle, recipe, or user profile).");
            return;
        }

        // Check if order deadline has passed
        if (activeCycle.orderDeadline && new Date() > activeCycle.orderDeadline) {
            setOrderValidationError("The order deadline has passed. You can no longer place or modify orders for this cycle.");
            return;
        }

        const totalServings = Object.values(orderQuantities)
            .map(q => (q === '' ? 0 : q)) // Convert empty strings to 0
            .reduce((sum, q) => sum + q, 0);
        if (totalServings <= 0) {
            setOrderValidationError("You must order at least one serving.");
            return;
        }

        setIsSubmittingOrder(true);

        const orderData = {
            userId: currentUser.uid,
            userDisplayName: userProfile.displayName || currentUser.email, // Use displayName from profile
            userEmail: currentUser.email,
            userLocationStatus: userProfile?.locationStatus || 'unknown', // Default if not set
            cycleId: activeCycle.id,
            recipeId: chosenRecipeDetails.id,
            recipeName: chosenRecipeDetails.name,
            items: chosenRecipeDetails.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0
                ? chosenRecipeDetails.proteinOptions
                    .filter(opt => (orderQuantities[opt.optionName] === '' ? 0 : orderQuantities[opt.optionName]) > 0)
                    .map(opt => ({
                        protein: opt.optionName,
                        quantity: orderQuantities[opt.optionName] === '' ? 0 : orderQuantities[opt.optionName]
                    }))
                : [{ protein: 'default', quantity: (orderQuantities['default'] === '' ? 0 : (orderQuantities['default'] || 0)) || totalServings }], // Handle default case, ensure 0 for empty string
            totalServings,
            selectedCustomizations: selectedRecipeCustomizations,
            freeTextCustomization: freeTextCustomization.trim(),
            status: 'placed', // Initial status
            // For new orders, createdAt. For updates, updatedAt will be set.
        };

        try {
            if (isModifyingOrder && userOrder?.id) {
                // Update existing order
                const orderRef = doc(db, 'orders', userOrder.id);
                await updateDoc(orderRef, {
                    ...orderData,
                    updatedAt: serverTimestamp(),
                });
                setOrderSuccess("Order updated successfully!");
                setIsModifyingOrder(false); // Exit modification mode
            } else {
                // Add new order
                await addDoc(collection(db, 'orders'), {
                    ...orderData,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                setOrderSuccess("Order placed successfully!");
            }
            // Reset form fields (optional, consider UX)
            // const initialQuantitiesReset = {};
            // if (chosenRecipeDetails.proteinOptions && chosenRecipeDetails.proteinOptions.length > 0) {
            //     chosenRecipeDetails.proteinOptions.forEach(opt => initialQuantitiesReset[opt.optionName] = 0);
            // } else {
            //     initialQuantitiesReset["default"] = 1; // Or 0 depending on desired default
            // }
            // setOrderQuantities(initialQuantitiesReset);
            // setSelectedRecipeCustomizations([]);
            // setFreeTextCustomization('');

        } catch (err) {
            console.error("Error submitting order:", err);
            setError(`Failed to submit order: ${err.message}`);
            // If permissions error, guide user to check console or specific error message
            if (err.code === 'permission-denied') {
                setError("Failed to submit order: Permission denied. Please ensure you are logged in and have rights to order for this cycle.");
            }
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
                            {userOrder.selectedCustomizations && userOrder.selectedCustomizations.length > 0 && (
                                <Typography variant="body2" sx={{ mt: 1, color: 'success.dark' }}>
                                    Options: {userOrder.selectedCustomizations.join(', ')}
                                </Typography>
                            )}
                            {userOrder.freeTextCustomization && (
                                <Typography variant="body2" sx={{ mt: 1, color: 'success.dark' }}>
                                    Note: {userOrder.freeTextCustomization}
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
                                                 value={orderQuantities[option.optionName] === '' ? '' : (orderQuantities[option.optionName] || 0)}
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
                                             value={orderQuantities["default"] === '' ? '' : (orderQuantities["default"] === undefined && !chosenRecipeDetails?.proteinOptions?.length ? 1 : (orderQuantities["default"] || 0) )}
                                             onChange={(e) => handleQuantityChange("default", e.target.value)}
                                             inputProps={{ min: 0 }}
                                             size="small"
                                             fullWidth
                                         />
                                     </Grid>
                                )}
                            </Grid>

                            {/* Predefined Customizations from Recipe */}
                            {chosenRecipeDetails?.predefinedCustomizations && chosenRecipeDetails.predefinedCustomizations.length > 0 && (
                                <FormControl component="fieldset" sx={{ mt: 2, mb: 2 }}>
                                    <FormLabel component="legend">Recipe Options</FormLabel>
                                    <FormGroup row>
                                        {chosenRecipeDetails.predefinedCustomizations.map(custOpt => (
                                            <FormControlLabel
                                                key={custOpt}
                                                control={
                                                    <Checkbox
                                                        checked={selectedRecipeCustomizations.includes(custOpt)}
                                                        onChange={handleSelectedRecipeCustomizationChange}
                                                        name={custOpt}
                                                        size="small"
                                                    />
                                                }
                                                label={custOpt}
                                            />
                                        ))}
                                    </FormGroup>
                                </FormControl>
                            )}

                            {/* Free Text Customization from Recipe Setting */}
                            {chosenRecipeDetails?.allowFreeTextCustomization && (
                                <TextField
                                    label="Additional Notes / Customizations (Optional)"
                                    fullWidth
                                    multiline
                                    rows={2}
                                    value={freeTextCustomization}
                                    onChange={(e) => setFreeTextCustomization(e.target.value)}
                                    sx={{ mt: 2, mb: 2 }}
                                    helperText="e.g., 'extra sauce please', 'no peanuts due to allergy'"
                                />
                            )}

                            {orderValidationError && (
                                <MuiAlert severity="error" sx={{ mb: 2 }}>{orderValidationError}</MuiAlert>
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
                        <MuiAlert severity="success" sx={{ mt: 2 }}>{orderSuccess}</MuiAlert>
                    )}
                    {error && (
                        <MuiAlert severity="error" sx={{ mt: 2 }}>{error}</MuiAlert>
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
                Enter your order amount below.
            </Typography>
            {userProfile?.roles?.includes('admin') && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, textAlign: 'center', width: '100%' }}>
                        Admin Panel
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <List dense sx={{ width: 'fit-content' }}>
                            <ListItem disablePadding>
                                <ListItemButton component={RouterLink} to="/admin/planning">
                                    <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}><PlaylistAddIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Plan New Meal Cycle" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton component={RouterLink} to="/admin/cycles">
                                    <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}><LoopIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Manage Meal Cycles" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton component={RouterLink} to="/admin/users">
                                    <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}><PeopleAltIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Manage Users" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton component={RouterLink} to="/admin/invites">
                                    <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}><EmailIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Manage Invites" />
                                </ListItemButton>
                            </ListItem>
                            <ListItem disablePadding>
                                <ListItemButton component={RouterLink} to="/admin/settings">
                                    <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}><TuneIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText primary="Application Settings" />
                                </ListItemButton>
                            </ListItem>
                        </List>
                    </Box>
                </>
            )}
        </Card>
    );

    return (
        <PageContainer title="Dashboard">
            {loadingCycle || loadingOrderCheck || loadingProfile && <LoadingSpinner />}
            {error && <MuiAlert severity="error" sx={{ mb: 2 }}>{error}</MuiAlert>}
            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <MuiAlert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} elevation={6} variant="filled">
                    {snackbarMessage}
                </MuiAlert>
            </Snackbar>

            {!loadingCycle && !loadingOrderCheck && !loadingProfile && (
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
                    {currentUser && !loadingProfile && <OrderHistory />}
                </>
            )}
        </PageContainer>
    );
}

export default DashboardPage; 