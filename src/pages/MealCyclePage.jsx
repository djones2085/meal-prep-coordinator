import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { PageContainer, LoadingSpinner, Alert, StatusChip, Card } from '../components/mui';
import {
    Typography,
    Box,
    Divider,
    Grid,
    List,
    ListItem,
    ListItemText
} from '@mui/material';

// Helper function to format protein counts
const formatProteinCounts = (counts) => {
    if (!counts || typeof counts !== 'object' || Object.keys(counts).length === 0) {
        return 'N/A';
    }
    return Object.entries(counts)
        .map(([protein, count]) => `${protein}: ${count}`)
        .join(', ');
};

// Helper to round numbers nicely
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
                const cyclesRef = collection(db, "mealCycles");
                const activeStatuses = ['ordering_open', 'ordering_closed', 'shopping', 'cooking', 'packaging', 'distributing'];
                const q = query(
                    cyclesRef,
                    where("status", "in", activeStatuses),
                    orderBy("creationDate", "desc"),
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
                    orderDeadline: cycleDoc.data().orderDeadline?.toDate ? cycleDoc.data().orderDeadline.toDate() : null,
                    targetCookDate: cycleDoc.data().targetCookDate?.toDate ? cycleDoc.data().targetCookDate.toDate() : null,
                    creationDate: cycleDoc.data().creationDate?.toDate ? cycleDoc.data().creationDate.toDate() : null,
                    aggregationTimestamp: cycleDoc.data().aggregationTimestamp?.toDate ? cycleDoc.data().aggregationTimestamp.toDate() : null,
                };
                setCycle(cycleData);

                const recipeId = cycleData.chosenRecipe?.recipeId;
                if (recipeId) {
                    const recipeDocRef = doc(db, 'recipes', recipeId);
                    const recipeSnap = await getDoc(recipeDocRef);
                    if (recipeSnap.exists()) {
                        setRecipe({ id: recipeSnap.id, ...recipeSnap.data() });
                    } else {
                        setError(`Recipe (ID: ${recipeId}) for the current cycle not found.`);
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
        <PageContainer maxWidth="md">
            <Typography variant="h4" component="h1" gutterBottom>
                Current Meal Cycle Details
            </Typography>

            {loading && (
                <LoadingSpinner centered size={60} />
            )}

            {error && !cycle && !loading && (
                <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            )}

            {!loading && !cycle && !error && (
                <Card sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="h6" component="p" gutterBottom>
                        No Active Cycle
                    </Typography>
                    <Typography color="text.secondary">
                        There isn't an active meal cycle currently available. Check back later!
                    </Typography>
                </Card>
            )}

            {cycle && !loading && (
                <Card sx={{ mt: 3 }}>
                     <Box sx={{ p: 2, pb: 0 }}>
                        <Typography variant="h6" gutterBottom>
                            Cycle Overview
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            ID: {cycle.id}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mt: 1 }}>
                            <StatusChip status={cycle.status} />
                            {cycle.orderDeadline && (
                                <Typography variant="body2" color="text.secondary">
                                    Deadline: {cycle.orderDeadline.toLocaleString()}
                                </Typography>
                            )}
                            {cycle.targetCookDate && (
                                <Typography variant="body2" color="text.secondary">
                                    Cook Date: {cycle.targetCookDate.toLocaleDateString()}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Recipe</Typography>
                        {recipe ? (
                            <Box>
                                <Typography variant="h5" color="primary" gutterBottom>{recipe.name}</Typography>
                                <Typography variant="body1">
                                    {recipe.description}
                                </Typography>
                            </Box>
                        ) : (
                            <Alert severity="warning">{error || `Recipe details could not be loaded.`}</Alert>
                        )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Order Summary</Typography>
                        {cycle.aggregationTimestamp ? (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Total Servings</Typography>
                                    <Typography variant="body1">{cycle.Servings ?? 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Protein Counts</Typography>
                                    <Typography variant="body1">{formatProteinCounts(cycle.Proteins)}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Dine-In Containers</Typography>
                                    <Typography variant="body1">{cycle.DineIn ?? 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="body2" color="text.secondary">Carry-Out Containers</Typography>
                                    <Typography variant="body1">{cycle.CarryOut ?? 'N/A'}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                     <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                        Summary generated on: {cycle.aggregationTimestamp.toLocaleString()}
                                    </Typography>
                                </Grid>
                            </Grid>
                        ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                Order aggregation has not run yet. Summary will appear once orders are finalized.
                            </Typography>
                        )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Shopping List</Typography>
                        {(cycle.aggregationTimestamp && cycle.totalIngredients && cycle.totalIngredients.length > 0) ? (
                             <List dense disablePadding>
                                {cycle.totalIngredients.map((ing, index) => (
                                    <ListItem key={index} disableGutters>
                                        <ListItemText
                                            primary={ing.name}
                                            secondary={`${roundNicely(ing.quantity)} ${ing.unit}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                         ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                                {cycle.aggregationTimestamp 
                                    ? "No ingredients calculated yet. Check orders or recipe data."
                                    : "Shopping list will be generated after order aggregation runs."
                                }
                            </Typography>
                         )}
                    </Box>
                </Card>
            )}
        </PageContainer>
    );
}

export default MealCyclePage; 