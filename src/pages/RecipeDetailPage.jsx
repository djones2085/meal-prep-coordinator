import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom'; // Added RouterLink for potential future links
import { doc, getDoc } from 'firebase/firestore'; // Import doc and getDoc
import { db } from '../firebaseConfig'; // Import db instance
import {
    Container,
    Typography,
    CircularProgress,
    Alert,
    Box,
    Divider, // To separate sections
    List,     // For ingredients/instructions
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,     // For tags
    Grid      // For layout of details like time/yield
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'; // Example icon for ingredients
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'; // Example icon for instructions
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Icon for times
import InfoIcon from '@mui/icons-material/Info'; // Icon for yield/status

function RecipeDetailPage() {
    const { recipeId } = useParams(); // Get recipeId from URL parameter
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRecipe = async () => {
            if (!recipeId) return; // Should not happen with route setup, but good practice

            setError('');
            setLoading(true);
            try {
                const recipeDocRef = doc(db, 'recipes', recipeId); // Create document reference
                const docSnap = await getDoc(recipeDocRef); // Fetch the document

                if (docSnap.exists()) {
                    setRecipe({ id: docSnap.id, ...docSnap.data() });
                    console.log("Fetched recipe:", { id: docSnap.id, ...docSnap.data() });
                } else {
                    console.log("No such document!");
                    setError("Recipe not found.");
                    setRecipe(null); // Ensure recipe state is cleared
                }
            } catch (err) {
                console.error("Error fetching recipe:", err);
                setError("Failed to load recipe details.");
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [recipeId]); // Re-run effect if recipeId changes

    // Helper function to format ingredient display
    const formatIngredient = (ingredient) => {
        let text = '';
        if (ingredient.quantity) {
            text += `${ingredient.quantity} `;
        }
        if (ingredient.unit && ingredient.unit !== 'unit') { // Don't display 'unit' as a unit
             text += `${ingredient.unit} `;
        }
        text += ingredient.name;
         if (ingredient.notes) {
            text += ` (${ingredient.notes})`;
        }
        return text;
    };

    return (
        <Container maxWidth="md"> {/* Increased max width for better layout */}
            <Typography variant="h4" component="h1" gutterBottom>
                Recipe Detail
            </Typography>

            {loading && (
                 <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress size={60} />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
            )}

            {!loading && recipe && (
                <Box sx={{ my: 2 }}>
                    {/* --- Header --- */}
                    <Typography variant="h3" component="h1" gutterBottom>
                        {recipe.name || 'Unnamed Recipe'}
                    </Typography>
                    {recipe.description && (
                         <Typography variant="body1" color="text.secondary" paragraph>
                            {recipe.description}
                        </Typography>
                    )}

                     {/* --- Tags --- */}
                     {recipe.tags && recipe.tags.length > 0 && (
                        <Box sx={{ my: 2 }}>
                            {recipe.tags.map((tag) => (
                                <Chip key={tag} label={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                        </Box>
                     )}

                    <Divider sx={{ my: 2 }} />

                    {/* --- Quick Info Grid (Time, Yield, Status) --- */}
                    <Grid container spacing={2} sx={{ mb: 3, color: 'text.secondary' }}>
                         {(recipe.prepTime || recipe.cookTime) && (
                             <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                                <AccessTimeIcon sx={{ mr: 1 }} />
                                <Box>
                                    {recipe.prepTime && <Typography variant="body2">Prep: {recipe.prepTime}</Typography>}
                                    {recipe.cookTime && <Typography variant="body2">Cook: {recipe.cookTime}</Typography>}
                                </Box>
                            </Grid>
                         )}
                         {(recipe.baseYield && recipe.baseYieldUnit) && (
                             <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                                <InfoIcon sx={{ mr: 1 }} />
                                <Typography variant="body2">Yield: {recipe.baseYield} {recipe.baseYieldUnit}</Typography>
                            </Grid>
                         )}
                          {recipe.status && (
                             <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                                <InfoIcon sx={{ mr: 1 }} />
                                <Typography variant="body2">Status: {recipe.status}</Typography>
                             </Grid>
                          )}
                    </Grid>


                    {/* --- Ingredients --- */}
                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h5" component="h2" gutterBottom>Ingredients</Typography>
                            <List dense>
                                {recipe.ingredients.map((ingredient, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>
                                            <RestaurantMenuIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText primary={formatIngredient(ingredient)} />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}

                    {/* --- Instructions --- */}
                    {recipe.instructions && recipe.instructions.length > 0 && (
                         <Box sx={{ mb: 3 }}>
                            <Typography variant="h5" component="h2" gutterBottom>Instructions</Typography>
                            <List dense>
                                {recipe.instructions.map((step, index) => (
                                    <ListItem key={index} alignItems="flex-start">
                                        <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, mt: 0.5 }}>
                                            <FormatListNumberedIcon fontSize="small" />
                                        </ListItemIcon>
                                        {/* Using index + 1 for step number */}
                                        <ListItemText primary={`${index + 1}. ${step}`} />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}

                    {/* --- Protein Options (Optional Display) --- */}
                    {recipe.proteinOptions && recipe.proteinOptions.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h5" component="h2" gutterBottom>Protein Options / Variations</Typography>
                             {recipe.proteinOptions.map((option, index) => (
                                <Box key={index} sx={{ mb: 2, pl: 2, borderLeft: '3px solid', borderColor: 'grey.300' }}>
                                    <Typography variant="h6" component="h3">{option.optionName}</Typography>
                                    {option.ingredients && option.ingredients.length > 0 && (
                                        <>
                                            <Typography variant="subtitle2">Specific Ingredients:</Typography>
                                            <List dense disablePadding>
                                                {option.ingredients.map((ing, ingIndex) => (
                                                     <ListItem key={ingIndex} sx={{pl: 1}}>
                                                        <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>•</ListItemIcon>
                                                        <ListItemText primary={formatIngredient(ing)} />
                                                     </ListItem>
                                                ))}
                                            </List>
                                        </>
                                    )}
                                     {option.instructions && option.instructions.length > 0 && (
                                        <>
                                             <Typography variant="subtitle2" sx={{mt: 1}}>Specific Instructions:</Typography>
                                            <List dense disablePadding>
                                                {option.instructions.map((step, stepIndex) => (
                                                     <ListItem key={stepIndex} sx={{pl: 1}}>
                                                        <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>•</ListItemIcon>
                                                        <ListItemText primary={step} />
                                                     </ListItem>
                                                ))}
                                            </List>
                                        </>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    )}

                    <Divider sx={{ my: 3 }}/>

                    {/* --- Placeholder for future sections --- */}
                    <Typography variant="caption" color="text.secondary">
                         Recipe ID: {recipe.id} | Times Prepared: {recipe.timesPrepared ?? 0}
                         {/* Add Cook Notes / Feedback later */}
                    </Typography>
                </Box>
            )}
        </Container>
    );
}

export default RecipeDetailPage; 