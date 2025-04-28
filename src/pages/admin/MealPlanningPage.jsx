import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
    Container,
    Typography,
    Button,
    Box,
    CircularProgress,
    Alert,
    Grid,
    Paper,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

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

function MealPlanningPage() {
    const navigate = useNavigate();
    const [availableRecipes, setAvailableRecipes] = useState([]);
    const [selectedRecipeId, setSelectedRecipeId] = useState(''); // Store only the ID of the single selected recipe
    const [orderDeadline, setOrderDeadline] = useState(() => getDefaultDates().defaultOrderDeadline);
    const [targetCookDate, setTargetCookDate] = useState(() => getDefaultDates().defaultTargetCookDate);

    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true); // Separate loading for fetch
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
                    name: doc.data().name || 'Unnamed Recipe' // Ensure name exists
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

        // Dates are already Date objects from MUI Pickers
        const cycleData = {
            status: 'ordering_open', // Updated initial status: ready for orders
            chosenRecipe: { // Store the chosen recipe details
                 recipeId: selectedRecipe.id,
                 recipeName: selectedRecipe.name,
            },
            orderDeadline: orderDeadline,
            targetCookDate: targetCookDate,
            creationDate: serverTimestamp(),
            // Other fields like assignments, totals will be set later
        };

        try {
            const cyclesRef = collection(db, 'mealCycles');
            const docRef = await addDoc(cyclesRef, cycleData);
            console.log("Meal Cycle created with ID: ", docRef.id);
            setSuccess(`New Meal Cycle created (Status: Ordering Open) with recipe: ${selectedRecipe.name}. ID: ${docRef.id}`); // Updated success message
            // Optionally clear form
            setSelectedRecipeId('');
            setOrderDeadline(null);
            setTargetCookDate(null);
            setLoading(false);
            // Optionally navigate away
            // navigate('/dashboard'); // Or wherever appropriate
        } catch (err) {
            console.error("Error creating meal cycle: ", err);
            setError("Failed to create meal cycle. Please try again.");
            setLoading(false);
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth="md">
                <Typography variant="h4" component="h1" gutterBottom>
                    Plan New Meal Cycle
                </Typography>

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Select Recipe for the Cycle</Typography>
                        {fetchLoading && <CircularProgress size={24} />}
                        {!fetchLoading && availableRecipes.length === 0 && !error && (
                            <Typography color="text.secondary">No 'approved' or 'testing' recipes found.</Typography>
                        )}
                        {!fetchLoading && availableRecipes.length > 0 && (
                             <FormControl fullWidth sx={{ mt: 1 }}>
                                <InputLabel id="recipe-select-label">Recipe</InputLabel>
                                <Select
                                    labelId="recipe-select-label"
                                    id="recipe-select"
                                    value={selectedRecipeId}
                                    label="Recipe"
                                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                                    disabled={loading}
                                >
                                    {availableRecipes.map((recipe) => (
                                        <MenuItem key={recipe.id} value={recipe.id}>
                                            {recipe.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                         {error && !fetchLoading && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                    </Paper>

                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Set Deadlines & Dates</Typography>
                         <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                 <DateTimePicker
                                    label="Order Deadline *"
                                    value={orderDeadline}
                                    onChange={(newValue) => setOrderDeadline(newValue)}
                                    disabled={loading}
                                    slotProps={{ textField: { fullWidth: true, required: true, helperText:"Select date and time" } }}
                                 />
                            </Grid>
                             <Grid item xs={12} sm={6}>
                                <DatePicker
                                    label="Target Cook Date *"
                                    value={targetCookDate}
                                    onChange={(newValue) => setTargetCookDate(newValue)}
                                    disabled={loading}
                                    slotProps={{ textField: { fullWidth: true, required: true, helperText:"Select date" } }}
                                />
                            </Grid>
                         </Grid>
                    </Paper>

                     <Box sx={{ mt: 3 }}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading || fetchLoading || !selectedRecipeId}
                            fullWidth
                            size="large"
                        >
                            {loading ? <CircularProgress size={24} /> : 'Create Meal Cycle'}
                        </Button>
                    </Box>
                </Box>
            </Container>
        </LocalizationProvider>
    );
}

export default MealPlanningPage; 