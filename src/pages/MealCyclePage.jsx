import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import {
    Container, Typography, Box, Paper, CircularProgress, Alert,
    Divider, List, ListItem, ListItemText, Grid, Chip,
    ListItemIcon
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'; // Example icon

// Helper function to format protein counts (same as in MealCycleManagementPage)
const formatProteinCounts = (counts) => {
    if (!counts || typeof counts !== 'object' || Object.keys(counts).length === 0) {
        return 'N/A'; // Return N/A if no counts
    }
    return Object.entries(counts)
        .map(([protein, count]) => `${protein}: ${count}`)
        .join(', ');
};

// Helper to round numbers nicely (can copy from RecipeDetailPage if needed, or simple rounding)
function roundNicely(num) {
    if (num === 0 || !num) return 0;
    if (Math.abs(num) < 0.1) return num.toPrecision(1);
    if (Math.abs(num) < 1) return Math.round(num * 100) / 100;
    return Math.round(num * 10) / 10;
}


function MealCyclePage() {
    const [cycle, setCycle] = useState(null);
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCurrentCycleAndRecipe = async () => {
            setLoading(true);
            setError('');
            setCycle(null);
            setRecipe(null);

            try {
                // 1. Find the most recent active cycle (not planned, completed, or cancelled)
                const cyclesRef = collection(db, "mealCycles");
                const activeStatuses = ['ordering_open', 'ordering_closed', 'shopping', 'cooking', 'packaging', 'distributing'];
                const q = query(
                    cyclesRef,
                    where("status", "in", activeStatuses),
                    orderBy("creationDate", "desc"), // Get the latest one first
                    limit(1)
                );
                const cycleSnapshot = await getDocs(q);

                if (cycleSnapshot.empty) {
                    setError("No active meal cycle found.");
                    setLoading(false);
                    return;
                }

                const cycleDoc = cycleSnapshot.docs[0];
                const cycleData = {
                    id: cycleDoc.id,
                    ...cycleDoc.data(),
                    // Ensure dates are JS Dates if needed (they are needed for display here)
                     orderDeadline: cycleDoc.data().orderDeadline?.toDate ? cycleDoc.data().orderDeadline.toDate() : null,
                     targetCookDate: cycleDoc.data().targetCookDate?.toDate ? cycleDoc.data().targetCookDate.toDate() : null,
                     creationDate: cycleDoc.data().creationDate?.toDate ? cycleDoc.data().creationDate.toDate() : null,
                      // aggregationTimestamp might also be useful
                     aggregationTimestamp: cycleDoc.data().aggregationTimestamp?.toDate ? cycleDoc.data().aggregationTimestamp.toDate() : null,
                };
                setCycle(cycleData);

                // 2. Fetch the associated recipe
                const recipeId = cycleData.chosenRecipe?.recipeId;
                if (recipeId) {
                    const recipeDocRef = doc(db, 'recipes', recipeId);
                    const recipeSnap = await getDoc(recipeDocRef);
                    if (recipeSnap.exists()) {
                        setRecipe({ id: recipeSnap.id, ...recipeSnap.data() });
                    } else {
                        setError(`Recipe (ID: ${recipeId}) for the current cycle not found.`);
                         // Still show cycle data even if recipe fetch fails
                    }
                } else {
                    setError("Current cycle is missing recipe information.");
                }

            } catch (err) {
                console.error("Error fetching current cycle details:", err);
                setError("Failed to load current meal cycle information.");
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentCycleAndRecipe();
    }, []);

    return (
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ my: { xs: 3, md: 4 } }}>
                Current Meal Cycle Details
            </Typography>

            {loading && <CircularProgress sx={{ display: 'block', margin: 'auto' }} />}
            {error && !cycle && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} {/* Show primary error only if cycle fails */}
            {!loading && !cycle && !error && (
                <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    No active meal cycle is currently available.
                </Typography>
            )}

            {cycle && (
                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                    {/* Display basic cycle info */} 
                    <Typography variant="h5" gutterBottom>
                         Cycle ID: {cycle.id}
                    </Typography>
                     <Typography component="div" variant="body1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        Status:&nbsp;
                        <Chip label={cycle.status.replace('_', ' ')} size="small" color={cycle.status === 'ordering_open' ? 'success' : 'default'} />
                     </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {cycle.orderDeadline ? `Order Deadline: ${cycle.orderDeadline.toLocaleString()}` : ''}
                        {cycle.targetCookDate ? ` | Cook Date: ${cycle.targetCookDate.toLocaleDateString()}` : ''}
                     </Typography>
                    <Divider sx={{ my: 2 }} />

                     {/* Display Recipe Info */} 
                     <Typography variant="h6" gutterBottom>Recipe</Typography>
                     {recipe ? (
                         <Box sx={{ mb: 2 }}>
                            <Typography variant="h5" component="h2">{recipe.name}</Typography>
                            <Typography variant="body1" color="text.secondary" paragraph>
                                {recipe.description}
                            </Typography>
                             {/* Add other recipe details if needed e.g., prep/cook time */} 
                        </Box>
                     ) : (
                         <Alert severity="warning">Recipe details could not be loaded.</Alert>
                     )}
                     <Divider sx={{ my: 2 }} />

                    {/* Display Aggregated Order Info */} 
                    <Typography variant="h6" gutterBottom>Order Summary</Typography>
                    {cycle.aggregationTimestamp ? (
                        <Grid container spacing={1} sx={{ mb: 2 }}>
                            <Grid xs={6} sm={4}><strong>Total Servings:</strong></Grid>
                            <Grid xs={6} sm={8}>{cycle.totalMealCounts ?? 'N/A'}</Grid>

                            <Grid xs={6} sm={4}><strong>Protein Counts:</strong></Grid>
                            <Grid xs={6} sm={8}>{formatProteinCounts(cycle.totalCountsByProtein)}</Grid>

                            <Grid xs={6} sm={4}><strong>Dine-In:</strong></Grid>
                            <Grid xs={6} sm={8}>{cycle.dineInContainers ?? 'N/A'}</Grid>

                            <Grid xs={6} sm={4}><strong>Carry-Out:</strong></Grid>
                            <Grid xs={6} sm={8}>{cycle.carryOutContainers ?? 'N/A'}</Grid>
                            
                            <Grid xs={12} sm={12} sx={{mt: 1}}>
                                 <Typography variant="caption" color="text.secondary">Aggregated on: {cycle.aggregationTimestamp.toLocaleString()}</Typography>
                             </Grid>
                        </Grid>
                     ) : (
                         <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                             Order aggregation has not run yet for this cycle.
                        </Typography>
                     )}
                    <Divider sx={{ my: 2 }} />

                    {/* Display Aggregated Ingredients (Shopping List) */} 
                     <Typography variant="h6" gutterBottom>Shopping List</Typography>
                    {(cycle.aggregationTimestamp && cycle.totalIngredients && cycle.totalIngredients.length > 0) ? (
                        <List dense>
                            {cycle.totalIngredients.map((ing, index) => (
                                <ListItem key={index} disablePadding>
                                     <ListItemIcon sx={{minWidth: '30px'}}><RestaurantMenuIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText 
                                         primary={ing.name}
                                         secondary={`${roundNicely(ing.quantity)} ${ing.unit}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                     ) : (
                         <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                             {cycle.aggregationTimestamp ? 'No ingredients calculated (check orders/recipe).' : 'Shopping list will be generated after order aggregation.'}
                        </Typography>
                     )}
                </Paper>
            )}
        </Container>
    );
}

export default MealCyclePage; 