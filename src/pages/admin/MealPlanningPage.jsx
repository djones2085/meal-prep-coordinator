import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    Timestamp,
    doc,
    getDoc
} from 'firebase/firestore';
import { db } from '../../firebaseConfig.js';
import { PageContainer, Button, LoadingSpinner, Alert, Select, Card } from '../../components/mui';
import { Typography, Box, Grid, CircularProgress } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
    nextDay,
    setHours,
    setMinutes,
    setSeconds,
    setMilliseconds,
    parse as parseTime
} from 'date-fns';

// Helper function to calculate default dates
const getDefaultDates = () => {
    const now = new Date();
    // Use UTC internally to avoid local timezone issues during calculation
    const nowUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()));

    // Target Thursday Noon Central (Use 17:00 UTC for Noon CDT, UTC-5)
    const targetDay = 4; // Thursday (0=Sun, 1=Mon, ..., 6=Sat)
    const targetHourUtc = 17; // Noon CDT = 17:00 UTC. (If CST, this will be 11 AM CST - might need adjustment later)

    const currentUtcDay = nowUtc.getUTCDay();
    let daysToAdd = (targetDay - currentUtcDay + 7) % 7;

    // If today *is* Thursday and it's already past Noon Central (targetHourUtc), aim for next week's Thursday
    if (daysToAdd === 0 && nowUtc.getUTCHours() >= targetHourUtc) {
        daysToAdd = 7;
    }

    const nextThursdayUtc = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate() + daysToAdd));
    nextThursdayUtc.setUTCHours(targetHourUtc, 0, 0, 0);

    // Target the Sunday *after* that Thursday
    const nextSundayUtc = new Date(nextThursdayUtc);
    // Add 3 days to get from Thursday (4) to Sunday (0/7)
    nextSundayUtc.setUTCDate(nextSundayUtc.getUTCDate() + 4);
    nextSundayUtc.setUTCHours(0, 0, 0, 0); // Set to start of the day UTC

    // --- DEBUG LOGS --- Start
    console.log("Current UTC Time:", nowUtc.toISOString());
    console.log("Calculated UTC Deadline:", nextThursdayUtc.toISOString()); 
    console.log("Calculated UTC Cook Date:", nextSundayUtc.toISOString()); 
    // --- DEBUG LOGS --- End

    // Return local Date objects expected by MUI pickers
    const defaultOrderDeadline = new Date(nextThursdayUtc.getTime());
    const defaultTargetCookDate = new Date(nextSundayUtc.getTime());

    // --- DEBUG LOGS --- Start
    console.log("Default Order Deadline (Local for Picker):", defaultOrderDeadline);
    console.log("Default Target Cook Date (Local for Picker):", defaultTargetCookDate);
    // --- DEBUG LOGS --- End

    return { defaultOrderDeadline, defaultTargetCookDate };
};

const dayStringToNumber = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
};

// New helper function to calculate dates based on admin defaults
const calculateDatesFromAdminSettings = (settings, fallbackFn) => {
    if (!settings || !settings.defaultOrderDeadlineDay || !settings.defaultOrderDeadlineTime || !settings.defaultTargetCookDay) {
        console.log("Admin settings incomplete or not found, using fallback dates.");
        return fallbackFn();
    }

    try {
        const { defaultOrderDeadlineDay, defaultOrderDeadlineTime, defaultTargetCookDay } = settings;

        const orderDayNumber = dayStringToNumber[defaultOrderDeadlineDay];
        const targetCookDayNumber = dayStringToNumber[defaultTargetCookDay];

        if (orderDayNumber === undefined || targetCookDayNumber === undefined) {
            console.error("Invalid day string in admin settings. Using fallback.");
            return fallbackFn();
        }

        let now = new Date();
        
        // Calculate Order Deadline
        let orderDeadline = nextDay(now, orderDayNumber);
        const [hours, minutes] = defaultOrderDeadlineTime.split(':').map(Number);
        orderDeadline = setHours(orderDeadline, hours || 0); // Default to 0 if hours is NaN
        orderDeadline = setMinutes(orderDeadline, minutes || 0); // Default to 0 if minutes is NaN
        orderDeadline = setSeconds(orderDeadline, 0);
        orderDeadline = setMilliseconds(orderDeadline, 0);

        // If the calculated deadline is in the past (e.g., today is Wed 6PM, deadline is Wed 5PM), advance by one week
        if (orderDeadline < now && 
            orderDeadline.getUTCFullYear() === now.getUTCFullYear() &&
            orderDeadline.getUTCMonth() === now.getUTCMonth() &&
            orderDeadline.getUTCDate() === now.getUTCDate()) {
            orderDeadline = nextDay(orderDeadline, orderDayNumber); // Get the same day next week
        }

        // Calculate Target Cook Date (must be after order deadline)
        let targetCookDate = nextDay(orderDeadline, targetCookDayNumber);
        // Ensure cook date is at the start of the day (00:00:00)
        targetCookDate = setHours(targetCookDate, 0);
        targetCookDate = setMinutes(targetCookDate, 0);
        targetCookDate = setSeconds(targetCookDate, 0);
        targetCookDate = setMilliseconds(targetCookDate, 0);

        // Ensure targetCookDate is strictly after orderDeadline
        // If targetCookDay is the same day or before the orderDeadline's day of week,
        // nextDay might pick the same week if deadline is late in its day.
        // We want cook day to be *after* the full deadline moment.
        if (targetCookDate <= orderDeadline) {
            // If cook day is on or before deadline day, advance it by a week from its current calculation
            // e.g. deadline Fri, cook day Fri -> advance cook day to next Fri
            // e.g. deadline Fri, cook day Wed -> advance cook day to next Wed
             targetCookDate = nextDay(setHours(targetCookDate, 23, 59, 59), targetCookDayNumber); // advance from end of current cook day to next specified day
             targetCookDate = setHours(targetCookDate, 0,0,0,0); // reset time
        }
        
        console.log("Calculated from Admin Defaults:", { orderDeadline, targetCookDate });
        return { defaultOrderDeadline: orderDeadline, defaultTargetCookDate: targetCookDate };

    } catch (error) {
        console.error("Error calculating dates from admin settings:", error);
        return fallbackFn();
    }
};

const ADMIN_SETTINGS_DOC_PATH = 'app_config/adminDefaults';

function MealPlanningPage() {
    const navigate = useNavigate();
    const [availableRecipes, setAvailableRecipes] = useState([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState('');
    const [adminDefaults, setAdminDefaults] = useState(null);
    const [loadingAdminDefaults, setLoadingAdminDefaults] = useState(true);

    // State for dates, initially null or a very past date to indicate they need setting
    const [orderDeadline, setOrderDeadline] = useState(null);
    const [targetCookDate, setTargetCookDate] = useState(null);

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Effect to fetch admin-defined default settings
    useEffect(() => {
        const fetchAdminDefaults = async () => {
            setLoadingAdminDefaults(true);
            try {
                const settingsDocRef = doc(db, ADMIN_SETTINGS_DOC_PATH);
                const docSnap = await getDoc(settingsDocRef);
                if (docSnap.exists()) {
                    setAdminDefaults(docSnap.data());
                    console.log("Admin defaults loaded:", docSnap.data());
                } else {
                    console.log('No admin default settings found in Firestore.');
                    setAdminDefaults(null);
                }
            } catch (err) {
                console.error("Error fetching admin default settings:", err);
                setError("Failed to load admin settings. Using fallback date calculations.");
                setAdminDefaults(null);
            }
            setLoadingAdminDefaults(false);
        };
        fetchAdminDefaults();
    }, []);

    // New useEffect to calculate and set initial dates once adminDefaults are loaded
    useEffect(() => {
        if (!loadingAdminDefaults) {
            const { defaultOrderDeadline: newDeadline, defaultTargetCookDate: newCookDate } = 
                calculateDatesFromAdminSettings(adminDefaults, getDefaultDates);
            setOrderDeadline(newDeadline);
            setTargetCookDate(newCookDate);
            console.log("Dates set in useEffect:", {newDeadline, newCookDate})
        }
    }, [adminDefaults, loadingAdminDefaults]);

    // Fetch 'approved' or 'testing' recipes
    useEffect(() => {
        const fetchAvailableRecipes = async () => {
            setError('');
            setFetchLoading(true);
            try {
                const recipesRef = collection(db, "recipes");
                const q = query(recipesRef, where("status", "in", ["approved", "testing"]));
                const querySnapshot = await getDocs(q);
                const recipesList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name || 'Unnamed Recipe'
                }));
                setAvailableRecipes(recipesList);
            } catch (err) {
                console.error("Error fetching available recipes: ", err);
                setError("Failed to load recipes for selection.");
            } finally {
                setFetchLoading(false);
            }
        };
        fetchAvailableRecipes();
    }, []);

    const resetDatePickers = () => {
        const { defaultOrderDeadline: newDeadline, defaultTargetCookDate: newCookDate } = 
            calculateDatesFromAdminSettings(adminDefaults, getDefaultDates);
        setOrderDeadline(newDeadline);
        setTargetCookDate(newCookDate);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const selectedRecipe = availableRecipes.find(r => r.id === selectedRecipeId);

        // Validation
        if (!selectedRecipeId || !selectedRecipe) {
            setError("Please select a recipe for the cycle.");
            setLoading(false);
            return;
        }
        // Validation: Ensure Date objects are not null
        if (!orderDeadline || !targetCookDate) {
            setError("Please select valid dates for order deadline and cook date.");
            setLoading(false);
            return;
        }

        // Check if dates are valid
        if (isNaN(orderDeadline.getTime()) || isNaN(targetCookDate.getTime())) {
             setError("Invalid date detected. Please re-select the dates.");
             setLoading(false);
             return;
        }

        // Optional: Add validation for deadlines
         if (orderDeadline >= targetCookDate) {
            setError("Order deadline must be before the target cook date.");
            setLoading(false);
            return;
         }

        // Check for existing cycle with the same recipe and cook date (optional but good practice)
        // This might require an async check here if you want to be strict

        setLoading(true); // Ensure loading is true before async operation

        try {
            // Default cycle name, can be adjusted
            const cycleName = `${selectedRecipe.name} - Cook Date: ${targetCookDate.toLocaleDateString()}`;

            const newCycleData = {
                name: cycleName,
                chosenRecipe: {
                    recipeId: selectedRecipe.id,
                    recipeName: selectedRecipe.name,
                    // Consider storing a copy of key recipe details if they might change
                    // and you need historical accuracy, e.g., servings, ingredients for the version used.
                },
                orderDeadline: Timestamp.fromDate(orderDeadline),
                targetCookDate: Timestamp.fromDate(targetCookDate),
                status: 'ordering_open', // Default status reverted to ordering_open
                creationDate: serverTimestamp(),
                // Aggregation fields (can be initialized here or by backend)
                totalMealCounts: 0,
                totalCountsByProtein: {},
                ordersCount: 0,
                dineInContainers: 0,
                carryOutContainers: 0,
                // Initialize shoppingList
                shoppingList: {
                    status: 'not_generated', // Initial status
                    items: [],
                    notes: '',
                    lastUpdatedAt: null, // Will be set when list is generated/updated
                    approvedBy: null,
                    approvedAt: null,
                    // Any other default fields your shoppingList might need
                }
            };

            const docRef = await addDoc(collection(db, 'mealCycles'), newCycleData);
            setSuccess(`New meal cycle "${cycleName}" created successfully!`);
            // Reset form fields after successful submission
            setSelectedRecipeId('');
            resetDatePickers(); // Use the new reset function
            setLoading(false);
            // Optionally navigate away
            // navigate('/dashboard'); // Or wherever appropriate
        } catch (err) {
            console.error("Error creating meal cycle: ", err);
            setError("Failed to create meal cycle. Please try again.");
            setLoading(false);
        }
    };

    // Prepare options for StyledSelect
    const recipeOptions = availableRecipes.map(recipe => ({ value: recipe.id, label: recipe.name }));

    // Disable form elements if dates are not yet calculated (i.e., orderDeadline is null)
    const formDisabled = loading || fetchLoading || loadingAdminDefaults || !orderDeadline;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <PageContainer>
                <Typography variant="h4" component="h1" gutterBottom>
                    Plan New Meal Cycle
                </Typography>
                 {/* Optionally show a loading indicator while admin defaults are loading */}
                {(loadingAdminDefaults || (!orderDeadline && !error)) && ( // Show loading if admin defaults loading OR if dates not set yet (and no error)
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 2}}>
                        <CircularProgress size={24} />
                        <Typography sx={{ ml: 1 }}>
                            {loadingAdminDefaults ? 'Loading admin settings...' : 'Calculating default dates...'}
                        </Typography>
                    </Box>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Card>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Select Recipe for the Cycle</Typography>
                        {fetchLoading && <LoadingSpinner centered />}
                        {!fetchLoading && availableRecipes.length === 0 && !error && (
                            <Typography color="text.secondary">No 'approved' or 'testing' recipes found.</Typography>
                        )}
                        {!fetchLoading && availableRecipes.length > 0 && (
                             <Select
                                label="Recipe *"
                                value={selectedRecipeId}
                                onChange={(e) => setSelectedRecipeId(e.target.value)}
                                options={recipeOptions}
                                disabled={formDisabled}
                                required
                                margin="none"
                                size="medium" // Ensure consistent size
                             />
                        )}
                         {error && fetchLoading && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    </Card>

                    <Card>
                         <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Set Deadlines & Dates</Typography>
                         <Grid container spacing={3}> 
                            <Grid item xs={12} sm={6}>
                                 <DateTimePicker
                                    label="Order Deadline *"
                                    value={orderDeadline}
                                    onChange={setOrderDeadline}
                                    disabled={formDisabled}
                                    ampm={true} // Use AM/PM
                                    slotProps={{ textField: { fullWidth: true, required: true, variant: 'outlined' } }} // Ensure consistent styling
                                 />
                            </Grid>
                             <Grid item xs={12} sm={6}>
                                <DatePicker
                                    label="Target Cook Date *"
                                    value={targetCookDate}
                                    onChange={setTargetCookDate}
                                    disabled={formDisabled}
                                    slotProps={{ textField: { fullWidth: true, required: true, variant: 'outlined' } }} // Ensure consistent styling
                                />
                            </Grid>
                         </Grid>
                    </Card>

                    <Box sx={{ mt: 2 }}> 
                        {error && !fetchLoading && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                        <Button
                            type="submit"
                            variant="contained"
                            isLoading={loading}
                            disabled={formDisabled || !selectedRecipeId}
                            fullWidth
                            size="large"
                        >
                            Create Meal Cycle
                        </Button>
                    </Box>
                </Box>
            </PageContainer>
        </LocalizationProvider>
    );
}

export default MealPlanningPage; 