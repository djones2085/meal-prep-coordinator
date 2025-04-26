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
    List,
    ListItem,
    ListItemText,
    Checkbox,
    Paper
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

function MealPlanningPage() {
    const navigate = useNavigate();
    const [availableRecipes, setAvailableRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState({}); // Use object { recipeId: recipeName }
    const [votingDeadline, setVotingDeadline] = useState(null);
    const [orderDeadline, setOrderDeadline] = useState(null);
    const [targetCookDate, setTargetCookDate] = useState(null);

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

    const handleRecipeSelection = (recipeId, recipeName, isSelected) => {
        setSelectedRecipes(prev => {
            const updated = { ...prev };
            if (isSelected) {
                updated[recipeId] = recipeName;
            } else {
                delete updated[recipeId];
            }
            return updated;
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const proposedRecipeArray = Object.entries(selectedRecipes).map(([id, name]) => ({ recipeId: id, recipeName: name }));

        // Validation
        if (proposedRecipeArray.length === 0) {
            setError("Please select at least one recipe to propose.");
            setLoading(false);
            return;
        }
        // Validation: Ensure Date objects are not null
        if (!votingDeadline || !orderDeadline || !targetCookDate) {
            setError("Please select valid dates and times for all deadlines.");
            setLoading(false);
            return;
        }

        // Check if dates are valid (MUI pickers usually ensure this, but double-check)
        if (isNaN(votingDeadline.getTime()) || isNaN(orderDeadline.getTime()) || isNaN(targetCookDate.getTime())) {
             setError("Invalid date detected. Please re-select the dates.");
             setLoading(false);
             return;
        }

        // Optional: Add validation for deadlines (e.g., voting < ordering < cooking)
         if (votingDeadline >= orderDeadline) {
            setError("Voting deadline must be before the order deadline.");
            setLoading(false);
            return;
         }
          if (orderDeadline >= targetCookDate) {
            setError("Order deadline must be before the target cook date.");
            setLoading(false);
            return;
         }

        // Dates are already Date objects from MUI Pickers
        // Convert to Firestore Timestamps explicitly for clarity if desired,
        // but Firestore handles Date objects automatically.
        const cycleData = {
            status: 'voting_open', // Initial status
            proposedRecipes: proposedRecipeArray,
            // Pass the Date objects directly
            votingDeadline: votingDeadline,
            orderDeadline: orderDeadline,
            targetCookDate: targetCookDate,
            creationDate: serverTimestamp(),
            // Other fields like chosenRecipeId, assignments, totals will be set later
        };

        try {
            const cyclesRef = collection(db, 'mealCycles');
            const docRef = await addDoc(cyclesRef, cycleData);
            console.log("Meal Cycle created with ID: ", docRef.id);
            setSuccess(`New Meal Cycle created successfully (Status: Voting Open). ID: ${docRef.id}`);
            // Optionally clear form
            setSelectedRecipes({});
            setVotingDeadline(null);
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
                        <Typography variant="h6" gutterBottom>Select Proposed Recipes</Typography>
                        {fetchLoading && <CircularProgress size={24} />}
                        {!fetchLoading && availableRecipes.length === 0 && !error && (
                            <Typography color="text.secondary">No 'approved' or 'testing' recipes found.</Typography>
                        )}
                        {!fetchLoading && availableRecipes.length > 0 && (
                             <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                                 {availableRecipes.map(recipe => (
                                    <ListItem
                                        key={recipe.id}
                                        secondaryAction={
                                            <Checkbox
                                                edge="end"
                                                onChange={(e) => handleRecipeSelection(recipe.id, recipe.name, e.target.checked)}
                                                checked={!!selectedRecipes[recipe.id]} // Check if recipeId exists as key
                                                disabled={loading}
                                            />
                                        }
                                        disablePadding
                                    >
                                        <ListItemText primary={recipe.name} />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                         {error && !fetchLoading && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                    </Paper>

                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Set Deadlines & Dates</Typography>
                         <Grid container spacing={3}>
                            <Grid item xs={12} sm={4}>
                                <DateTimePicker
                                    label="Voting Deadline *"
                                    value={votingDeadline}
                                    onChange={(newValue) => setVotingDeadline(newValue)}
                                    disabled={loading}
                                    slotProps={{ textField: { fullWidth: true, required: true, helperText:"Select date and time" } }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                 <DateTimePicker
                                    label="Order Deadline *"
                                    value={orderDeadline}
                                    onChange={(newValue) => setOrderDeadline(newValue)}
                                    disabled={loading}
                                    slotProps={{ textField: { fullWidth: true, required: true, helperText:"Select date and time" } }}
                                 />
                            </Grid>
                             <Grid item xs={12} sm={4}>
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
                            disabled={loading || fetchLoading}
                            fullWidth
                            size="large"
                        >
                            {loading ? <CircularProgress size={24} /> : 'Create Meal Cycle & Open Voting'}
                        </Button>
                    </Box>
                </Box>
            </Container>
        </LocalizationProvider>
    );
}

export default MealPlanningPage; 