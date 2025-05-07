import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom'; // Added RouterLink for potential future links
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, collection } from 'firebase/firestore'; // Added updateDoc, arrayUnion, arrayRemove, Timestamp, collection
import { db } from '../firebaseConfig'; // Import db instance
import { useAuth } from '../contexts/AuthContext'; // Added useAuth
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
    Grid,     // For layout of details like time/yield
    TextField, // Added for yield input
    Button,    // Added for action buttons
    ButtonGroup // To group action buttons
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'; // Example icon for ingredients
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'; // Example icon for instructions
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Icon for times
import InfoIcon from '@mui/icons-material/Info'; // Icon for yield/status
import PrintIcon from '@mui/icons-material/Print';       // Icon for Print
import DownloadIcon from '@mui/icons-material/Download'; // Icon for Download
import ShareIcon from '@mui/icons-material/Share';     // Icon for Share
import EmailIcon from '@mui/icons-material/Email'; // Icon for Mail fallback

// Helper to round numbers to a reasonable precision
function roundNicely(num) {
    if (num === 0) return 0;
    if (Math.abs(num) < 0.1) return num.toPrecision(1);
    if (Math.abs(num) < 1) return Math.round(num * 100) / 100; // e.g., 0.25, 0.33
    return Math.round(num * 10) / 10; // e.g., 1.5, 2.0
}

function RecipeDetailPage() {
    const { recipeId } = useParams(); // Get recipeId from URL parameter
    const { currentUser } = useAuth(); // Get current user
    const [recipe, setRecipe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [displayYield, setDisplayYield] = useState(0); // State for adjustable yield

    // State for recipe notes
    const [userProfile, setUserProfile] = useState(null); // For authorName
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [newNoteText, setNewNoteText] = useState('');
    const [editingNote, setEditingNote] = useState(null); // { id: string, text: string }
    const [notesError, setNotesError] = useState('');

    useEffect(() => {
        const fetchRecipe = async () => {
            if (!recipeId) return; // Should not happen with route setup, but good practice

            setError('');
            setLoading(true);
            setRecipe(null); // Reset recipe on fetch
            setDisplayYield(0); // Reset display yield
            try {
                const recipeDocRef = doc(db, 'recipes', recipeId); // Create document reference
                const docSnap = await getDoc(recipeDocRef); // Fetch the document

                if (docSnap.exists()) {
                    const fetchedRecipe = { id: docSnap.id, ...docSnap.data() };
                    setRecipe(fetchedRecipe);
                    setDisplayYield(fetchedRecipe.baseYield || 1); // Initialize displayYield
                    console.log("Fetched recipe:", fetchedRecipe);
                } else {
                    console.log("No such document!");
                    setError("Recipe not found.");
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

    // Fetch User Profile for authorName
    useEffect(() => {
        if (!currentUser) {
            setUserProfile(null);
            return;
        }
        setLoadingProfile(true);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const fetchUserProfile = async () => {
            try {
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    setUserProfile({ id: docSnap.id, ...docSnap.data() });
                } else {
                    console.warn("User profile not found for notes author name.");
                    setUserProfile({ displayName: currentUser.email }); // Fallback
                }
            } catch (err) {
                console.error("Error fetching user profile for notes:", err);
                // Use email as fallback if profile fetch fails
                setUserProfile({ displayName: currentUser.email });
            } finally {
                setLoadingProfile(false);
            }
        };
        fetchUserProfile();
    }, [currentUser]);

    // Calculate scaling factor, prevent division by zero
    const scalingFactor = (recipe?.baseYield > 0 && displayYield > 0) ? displayYield / recipe.baseYield : 1;

    // Helper function to format ingredient display
    const formatIngredient = (ingredient, factor) => {
        let text = '';
        // Scale quantity if it exists and is numeric
        if (ingredient.quantity && typeof ingredient.quantity === 'number') {
             const scaledQuantity = ingredient.quantity * factor;
             text += `${roundNicely(scaledQuantity)} `;
        } else if (ingredient.quantity) {
             // Keep non-numeric quantities (like "to taste") as is
             text += `${ingredient.quantity} `;
        }

        if (ingredient.unit && ingredient.unit !== 'unit') {
             text += `${ingredient.unit} `;
        }
        text += ingredient.name;
         if (ingredient.notes) {
            text += ` (${ingredient.notes})`;
        }
        return text;
    };

    // Generate simple text for download/sharing
    const generateRecipeText = (factor) => {
        if (!recipe) return '';
        let text = `${recipe.name}\n`;
        text += `${recipe.description || ''}\n\n`;
        text += `Yield: ${displayYield} ${recipe.baseYieldUnit || 'servings'}\n\n`;

        text += "INGREDIENTS:\n";
        recipe.ingredients?.forEach(ing => {
            text += `- ${formatIngredient(ing, factor)}\n`;
        });

        // Include protein options if they exist
        if (recipe.proteinOptions && recipe.proteinOptions.length > 0) {
             text += "\nPROTEIN OPTIONS / VARIATIONS:\n";
             recipe.proteinOptions.forEach(opt => {
                 text += `\n* ${opt.optionName}:\n`;
                 opt.ingredients?.forEach(ing => {
                     text += `  - ${formatIngredient(ing, factor)}\n`;
                 });
                 opt.instructions?.forEach((inst, i) => {
                     text += `  (${i + 1}) ${inst}\n`;
                 });
             });
        }

        text += "\nINSTRUCTIONS:\n";
        recipe.instructions?.forEach((step, index) => {
            text += `${index + 1}. ${step}\n`;
        });

        return text;
    };

    // --- Action Handlers ---
    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        const text = generateRecipeText(scalingFactor);
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${recipe.name.replace(/\s+/g, '_').toLowerCase()}.txt`; // Simple filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

     const handleShare = async () => {
        const recipeText = generateRecipeText(scalingFactor);
        const shareData = {
            title: `Recipe: ${recipe.name}`,
            text: recipeText,
            // url: window.location.href // Optional: include URL to the page
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
                console.log('Recipe shared successfully');
            } catch (err) {
                console.error('Error sharing:', err);
                // Fallback or specific error handling if needed
            }
        } else {
            // Fallback for browsers without navigator.share (e.g., desktop Firefox)
            // Simple mailto link
            const subject = encodeURIComponent(shareData.title);
            const body = encodeURIComponent(shareData.text);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
    };

    const handleYieldChange = (event) => {
         const newYield = Math.max(1, parseInt(event.target.value, 10) || 0); // Ensure at least 1
         setDisplayYield(newYield);
    };

    // --- Notes Handlers ---
    const handleAddNote = async () => {
        if (!currentUser || !userProfile || !newNoteText.trim()) {
            setNotesError("You must be logged in and provide text to add a note.");
            return;
        }
        setNotesError('');
        const recipeDocRef = doc(db, 'recipes', recipeId);
        const noteId = doc(collection(db, '_')).id; // Generate a unique ID

        const noteToAdd = {
            id: noteId,
            text: newNoteText.trim(),
            authorName: userProfile.displayName || currentUser.email, // Fallback to email
            authorUid: currentUser.uid,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        try {
            await updateDoc(recipeDocRef, {
                notes: arrayUnion(noteToAdd)
            });
            setNewNoteText('');
            // Optimistically update local state or re-fetch recipe for simplicity here
            setRecipe(prev => prev ? ({ ...prev, notes: [...(prev.notes || []), noteToAdd] }) : null);
        } catch (err) {
            console.error("Error adding note:", err);
            setNotesError("Failed to add note. Please try again.");
        }
    };

    const handleEditNoteStart = (note) => {
        setEditingNote({ id: note.id, text: note.text });
        setNotesError('');
    };

    const handleSaveEditedNote = async () => {
        if (!currentUser || !editingNote || !editingNote.text.trim()) {
            setNotesError("Cannot save an empty note.");
            return;
        }
        setNotesError('');
        const recipeDocRef = doc(db, 'recipes', recipeId);

        try {
            // Fetch the current recipe to get the notes array
            const currentRecipeSnap = await getDoc(recipeDocRef);
            if (!currentRecipeSnap.exists()) {
                setNotesError("Recipe not found, cannot update note.");
                return;
            }
            const currentRecipeData = currentRecipeSnap.data();
            const notes = currentRecipeData.notes || [];

            const updatedNotes = notes.map(note =>
                note.id === editingNote.id
                    ? { ...note, text: editingNote.text.trim(), updatedAt: Timestamp.now() }
                    : note
            );

            await updateDoc(recipeDocRef, {
                notes: updatedNotes
            });
            setRecipe(prev => prev ? ({ ...prev, notes: updatedNotes }) : null);
            setEditingNote(null);
        } catch (err) {
            console.error("Error saving note:", err);
            setNotesError("Failed to save note. Please try again.");
        }
    };

    const handleDeleteNote = async (noteIdToDelete) => {
        if (!currentUser) return;
        setNotesError('');
        const recipeDocRef = doc(db, 'recipes', recipeId);

        try {
            const currentRecipeSnap = await getDoc(recipeDocRef);
            if (!currentRecipeSnap.exists()) {
                setNotesError("Recipe not found, cannot delete note.");
                return;
            }
            const currentRecipeData = currentRecipeSnap.data();
            const noteToDelete = (currentRecipeData.notes || []).find(n => n.id === noteIdToDelete && n.authorUid === currentUser.uid);

            if (!noteToDelete) {
                setNotesError("Note not found or you don't have permission to delete it.");
                return;
            }

            await updateDoc(recipeDocRef, {
                notes: arrayRemove(noteToDelete) // Firestore needs the exact object to remove
            });
            setRecipe(prev => prev ? ({ ...prev, notes: (prev.notes || []).filter(n => n.id !== noteIdToDelete) }) : null);
        } catch (err) {
            console.error("Error deleting note:", err);
            setNotesError("Failed to delete note. Please try again.");
        }
    };

    return (
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 } }}> {/* Add responsive horizontal padding */}
            <Typography variant="h4" component="h1" gutterBottom sx={{ my: { xs: 3, md: 4 } }}> {/* Responsive vertical margin */}
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

                    {/* --- Action Buttons --- */}
                    {/* Stack vertically on xs screens */}
                    <Box sx={{
                        my: 2,
                        display: 'flex',
                        gap: 2, // Increase gap slightly
                        flexDirection: { xs: 'column', sm: 'row' }, // Stack on xs, row otherwise
                        alignItems: { xs: 'flex-start', sm: 'center' } // Align items differently based on direction
                    }}>
                         <TextField
                             label="Yield"
                             type="number"
                             size="small"
                             value={displayYield}
                             onChange={handleYieldChange}
                             InputProps={{ inputProps: { min: 1 } }}
                             // sx={{ maxWidth: '100px', mr: 1 }}
                             // Let flexbox handle spacing, adjust max width if needed on xs
                             sx={{ maxWidth: { xs: '150px', sm: '100px' } }}
                             helperText={recipe.baseYieldUnit || 'servings'}
                         />
                         <ButtonGroup variant="outlined" aria-label="recipe actions">
                             <Button onClick={handlePrint} startIcon={<PrintIcon />}>Print</Button>
                             <Button onClick={handleDownload} startIcon={<DownloadIcon />}>Download</Button>
                             <Button onClick={handleShare} startIcon={<ShareIcon />}>Share</Button>
                         </ButtonGroup>
                     </Box>

                    {/* --- Quick Info Grid (Time, Status) --- Yield moved to input */}
                    <Grid container spacing={2} sx={{ mb: 3, color: 'text.secondary' }}>
                         {(recipe.prepTime || recipe.cookTime) && (
                             <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                                <AccessTimeIcon sx={{ mr: 1 }} />
                                <Box>
                                    {recipe.prepTime && <Typography variant="body2">Prep: {recipe.prepTime}</Typography>}
                                    {recipe.cookTime && <Typography variant="body2">Cook: {recipe.cookTime}</Typography>}
                                </Box>
                            </Grid>
                         )}
                          {recipe.status && (
                             <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                                <InfoIcon sx={{ mr: 1 }} />
                                <Typography variant="body2">Status: {recipe.status}</Typography>
                             </Grid>
                          )}
                    </Grid>

                    {/* --- Ingredients --- */}
                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                             <Typography variant="h5" component="h2" gutterBottom>Ingredients (for {displayYield} {recipe.baseYieldUnit || 'servings'})</Typography>
                            <List dense>
                                 {recipe.ingredients.map((ingredient, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>
                                            <RestaurantMenuIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText primary={formatIngredient(ingredient, scalingFactor)} />
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

                    {/* --- Protein Options (Optional Display - Scales ingredients) --- */}
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
                                                        {/* Scale protein option ingredients too */}
                                                        <ListItemText primary={formatIngredient(ing, scalingFactor)} />
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

                    {/* --- Footer Info --- */}
                    <Typography variant="caption" color="text.secondary">
                         Recipe ID: {recipe.id} | Base Yield: {recipe.baseYield} {recipe.baseYieldUnit} | Times Prepared: {recipe.timesPrepared ?? 0}
                         {/* Add Cook Notes / Feedback later */}
                    </Typography>

                    {/* --- Recipe Notes Section --- */}
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 3 }}>
                        Recipe Notes
                    </Typography>

                    {notesError && <Alert severity="error" sx={{ mb: 2 }}>{notesError}</Alert>}

                    {currentUser && !loadingProfile && (
                        <Box component="form" onSubmit={(e) => { e.preventDefault(); handleAddNote(); }} sx={{ mb: 3 }}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                variant="outlined"
                                label="Add a new note..."
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                                sx={{ mb: 1 }}
                            />
                            <Button 
                                type="submit" 
                                variant="contained" 
                                disabled={!newNoteText.trim() || loadingProfile}
                            >
                                Add Note
                            </Button>
                        </Box>
                    )}
                    {!currentUser && <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>Please log in to add notes.</Typography>}

                    {(recipe.notes && recipe.notes.length > 0) ? (
                        <List>
                            {recipe.notes.slice().sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()).map((note) => (
                                <ListItem key={note.id} alignItems="flex-start" sx={{ flexDirection: 'column', borderBottom: '1px solid #eee', py:2 }}>
                                    {editingNote && editingNote.id === note.id ? (
                                        <Box sx={{ width: '100%' }}>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={3}
                                                value={editingNote.text}
                                                onChange={(e) => setEditingNote({...editingNote, text: e.target.value})}
                                                sx={{ mb: 1 }}
                                            />
                                            <Button onClick={handleSaveEditedNote} variant="contained" size="small" sx={{mr:1}}>Save</Button>
                                            <Button onClick={() => setEditingNote(null)} variant="outlined" size="small">Cancel</Button>
                                        </Box>
                                    ) : (
                                        <>
                                            <ListItemText
                                                primary={<Typography variant="body1">{note.text}</Typography>}
                                                secondaryTypographyProps={{component: 'div'}}
                                                secondary={
                                                    <Box sx={{mt: 0.5}}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            By: {note.authorName} on {note.createdAt?.toDate().toLocaleDateString()}
                                                            {note.updatedAt && note.createdAt.seconds !== note.updatedAt.seconds && 
                                                                ` (edited ${note.updatedAt?.toDate().toLocaleDateString()})`
                                                            }
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                            {currentUser && currentUser.uid === note.authorUid && (
                                                <Box sx={{ mt: 1 }}>
                                                    <Button onClick={() => handleEditNoteStart(note)} size="small" sx={{mr:1}}>Edit</Button>
                                                    <Button onClick={() => handleDeleteNote(note.id)} size="small" color="error">Delete</Button>
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No notes for this recipe yet.
                        </Typography>
                    )}
                </Box>
            )}
        </Container>
    );
}

export default RecipeDetailPage; 