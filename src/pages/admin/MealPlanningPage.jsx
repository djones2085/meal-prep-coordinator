import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
    Container,
    Typography,
    TextField,
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

function MealPlanningPage() {
    const navigate = useNavigate();
    const [availableRecipes, setAvailableRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState({}); // Use object { recipeId: recipeName }
    const [votingDeadline, setVotingDeadline] = useState(''); // Use simple string input for now
    const [orderDeadline, setOrderDeadline] = useState('');
    const [targetCookDate, setTargetCookDate] = useState('');

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

    // Basic date string validation (can be improved)
    const isValidDateTimeString = (dateTimeString) => {
        // Example: Expecting YYYY-MM-DDTHH:MM
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTimeString);
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
        if (!votingDeadline || !isValidDateTimeString(votingDeadline) ||
            !orderDeadline || !isValidDateTimeString(orderDeadline) ||
            !targetCookDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetCookDate)) { // Simple date validation for cook date
            setError("Please enter valid dates/times in the format YYYY-MM-DD or YYYY-MM-DDTHH:MM.");
            setLoading(false);
            return;
        }

        // Convert deadline strings to Timestamps
        // Note: This assumes the input strings are in local time.
        // For more robust handling across timezones, consider UTC or a date library.
        let votingTimestamp, orderTimestamp, cookTimestamp;
        try {
             votingTimestamp = new Date(votingDeadline);
             orderTimestamp = new Date(orderDeadline);
             cookTimestamp = new Date(targetCookDate); // Target cook date might just be date

             if (isNaN(votingTimestamp) || isNaN(orderTimestamp) || isNaN(cookTimestamp)) {
                 throw new Error("Invalid date format");
             }

        } catch (dateError) {
             setError("Invalid date format. Please use YYYY-MM-DD or YYYY-MM-DDTHH:MM.");
             setLoading(false);
             return;
        }


        const cycleData = {
            status: 'voting_open', // Initial status
            proposedRecipes: proposedRecipeArray,
            votingDeadline: votingTimestamp, // Firestore Timestamp
            orderDeadline: orderTimestamp,   // Firestore Timestamp
            targetCookDate: cookTimestamp, // Firestore Timestamp (or just Date)
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
            setVotingDeadline('');
            setOrderDeadline('');
            setTargetCookDate('');
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
                     <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Voting Deadline"
                                type="datetime-local" // Uses browser's native picker
                                value={votingDeadline}
                                onChange={(e) => setVotingDeadline(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                                disabled={loading}
                                helperText="YYYY-MM-DDTHH:MM"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                             <TextField
                                label="Order Deadline"
                                type="datetime-local"
                                value={orderDeadline}
                                onChange={(e) => setOrderDeadline(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                                disabled={loading}
                                helperText="YYYY-MM-DDTHH:MM"
                            />
                        </Grid>
                         <Grid item xs={12} sm={4}>
                            <TextField
                                label="Target Cook Date"
                                type="date" // Just the date
                                value={targetCookDate}
                                onChange={(e) => setTargetCookDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                required
                                disabled={loading}
                                helperText="YYYY-MM-DD"
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
    );
}

export default MealPlanningPage; 