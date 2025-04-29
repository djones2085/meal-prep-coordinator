import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Import db instance
import {
    Container,
    Typography,
    CircularProgress,
    Alert,
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemText
} from '@mui/material';

// Placeholder image URL (using Vite logo from public directory)
const PLACEHOLDER_IMAGE_URL = '/vite.svg';

function RecipesPage() {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRecipes = async () => {
            setError('');
            setLoading(true);
            try {
                const recipesCollectionRef = collection(db, 'recipes');
                // Optional: Order by name, though we only have the name field currently
                const q = query(recipesCollectionRef, orderBy('name'));
                const querySnapshot = await getDocs(q);

                const recipesList = querySnapshot.docs.map(doc => ({
                    id: doc.id, // Get the document ID
                    ...doc.data() // Get the document data (which is just { name: '...' } for now)
                }));
                setRecipes(recipesList);
                console.log("Fetched recipes:", recipesList);

            } catch (err) {
                console.error("Error fetching recipes:", err);
                setError("Failed to load recipes. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchRecipes();
    }, []); // Empty dependency array means this runs once on mount

    return (
        <Container sx={{ px: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ my: 4 }}>
                Recipes
            </Typography>

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
            )}

            {!loading && !error && (
                <List>
                    {recipes.length === 0 ? (
                        <ListItem>
                            <ListItemText primary="No recipes found." />
                        </ListItem>
                    ) : (
                        recipes.map((recipe) => (
                            <ListItem key={recipe.id} disablePadding>
                                <ListItemButton component={RouterLink} to={`/recipes/${recipe.id}`}>
                                    <ListItemText primary={recipe.name || 'Unnamed Recipe'} />
                                </ListItemButton>
                            </ListItem>
                        ))
                    )}
                </List>
            )}
        </Container>
    );
}

export default RecipesPage; 