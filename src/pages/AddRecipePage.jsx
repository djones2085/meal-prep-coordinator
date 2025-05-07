import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Import db instance
import { useAuth } from '../contexts/AuthContext'; // To potentially store creator ID later
import {
    Container,
    Typography,
    TextField,
    Button,
    Box,
    CircularProgress,
    Alert,
    Grid,
    IconButton,
    Paper,
    MenuItem, // For Select dropdowns
    Select,
    InputLabel,
    FormControl,
    FormHelperText,
    FormControlLabel,
    Checkbox,
    Chip,
    Stack
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

// Define units for dropdowns - adjust as needed
const commonUnits = ['g', 'kg', 'ml', 'l', 'unit', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pinch', 'slice', 'clove'];

function AddRecipePage() {
    const navigate = useNavigate();
    const { currentUser } = useAuth(); // Get current user if needed later
    const [recipeName, setRecipeName] = useState('');
    const [description, setDescription] = useState('');
    const [baseYield, setBaseYield] = useState('');
    const [baseYieldUnit, setBaseYieldUnit] = useState('servings');
    const [prepTime, setPrepTime] = useState('');
    const [cookTime, setCookTime] = useState('');
    const [ingredients, setIngredients] = useState([{ name: '', quantity: '', unit: '', notes: '' }]);
    const [instructions, setInstructions] = useState(['']);
    const [tags, setTags] = useState(''); // Simple comma-separated tags for now

    // New state for customizations
    const [predefinedCustomizations, setPredefinedCustomizations] = useState([]);
    const [currentCustomizationText, setCurrentCustomizationText] = useState('');
    const [allowFreeTextCustomization, setAllowFreeTextCustomization] = useState(true);

    const [rawRecipeText, setRawRecipeText] = useState(''); // For AI Formatter placeholder

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // --- Ingredient Handlers ---
    const handleIngredientChange = (index, field, value) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);
    };

    const addIngredient = () => {
        setIngredients([...ingredients, { name: '', quantity: '', unit: '', notes: '' }]);
    };

    const removeIngredient = (index) => {
        const newIngredients = ingredients.filter((_, i) => i !== index);
        setIngredients(newIngredients);
    };

    // --- Instruction Handlers ---
    const handleInstructionChange = (index, value) => {
        const newInstructions = [...instructions];
        newInstructions[index] = value;
        setInstructions(newInstructions);
    };

    const addInstruction = () => {
        setInstructions([...instructions, '']);
    };

    const removeInstruction = (index) => {
        const newInstructions = instructions.filter((_, i) => i !== index);
        setInstructions(newInstructions);
    };

    // --- Customization Handlers ---
    const handleAddPredefinedCustomization = () => {
        if (currentCustomizationText.trim() && !predefinedCustomizations.includes(currentCustomizationText.trim())) {
            setPredefinedCustomizations([...predefinedCustomizations, currentCustomizationText.trim()]);
            setCurrentCustomizationText('');
        }
    };

    const handleRemovePredefinedCustomization = (customizationToRemove) => {
        setPredefinedCustomizations(predefinedCustomizations.filter(cust => cust !== customizationToRemove));
    };

    // --- AI Placeholder Handler ---
    const handleFormatRecipe = () => {
        // In the future, this would call a Cloud Function with rawRecipeText
        console.log("Attempting to format (AI feature not implemented):", rawRecipeText);
        setError("AI Recipe Formatting is not implemented yet.");
        // Potential future steps:
        // 1. Call Cloud Function `formatRecipe(rawRecipeText)`
        // 2. Receive structured data { name, ingredients, instructions, ... }
        // 3. Update form state: setRecipeName(data.name), setIngredients(data.ingredients), etc.
    };


    // --- Form Submission ---
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Basic Validation
        if (!recipeName.trim()) {
            setError("Recipe name is required.");
            setLoading(false);
            return;
        }
        if (ingredients.some(ing => !ing.name.trim())) {
             setError("All ingredients must have a name.");
             setLoading(false);
             return;
        }
         if (instructions.some(inst => !inst.trim())) {
             setError("Instructions cannot be empty.");
             setLoading(false);
             return;
        }

        // Prepare data for Firestore
        const recipeData = {
            name: recipeName.trim(),
            description: description.trim(),
            baseYield: Number(baseYield) || 0, // Ensure it's a number
            baseYieldUnit: baseYieldUnit.trim(),
            prepTime: prepTime.trim(),
            cookTime: cookTime.trim(),
            // Filter out incomplete ingredients (e.g., only name entered) before saving
            ingredients: ingredients
                            .filter(ing => ing.name.trim()) // Only save ingredients with a name
                            .map(ing => ({
                                name: ing.name.trim(),
                                quantity: Number(ing.quantity) || null, // Store as number or null if empty/invalid
                                unit: ing.unit.trim(),
                                notes: ing.notes.trim()
                            })),
            instructions: instructions.filter(inst => inst.trim()), // Filter empty instructions
            proteinOptions: [], // Add logic for this later if needed
            // Add new customization fields
            predefinedCustomizations: predefinedCustomizations,
            allowFreeTextCustomization: allowFreeTextCustomization,
            cookNotes: [],
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag), // Split, trim, filter empty
            status: 'new', // Default status for new recipes
            timesPrepared: 0,
            creationDate: serverTimestamp(),
            // Optional: Add creator ID
            // createdBy: currentUser ? currentUser.uid : null,
        };

        try {
            const recipesCollectionRef = collection(db, 'recipes');
            const docRef = await addDoc(recipesCollectionRef, recipeData);
            console.log("Recipe added with ID: ", docRef.id);
            setSuccess(`Recipe "${recipeData.name}" added successfully!`);
            // Optionally clear the form or navigate away
            // navigate(`/recipes/${docRef.id}`); // Navigate to the new recipe detail page
            // OR clear form:
            // setRecipeName(''); setDescription(''); ... reset all state ...
            setLoading(false);

        } catch (err) {
            console.error("Error adding recipe: ", err);
            setError("Failed to add recipe. Please check your data and try again.");
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ my: { xs: 3, md: 4 } }}>
                Add New Recipe
            </Typography>

            {/* AI Formatter Placeholder */}
             <Paper elevation={2} sx={{ p: 2, mb: 3, backgroundColor: 'grey.100' }}>
                 <Typography variant="h6" gutterBottom>Recipe Formatter (AI - Coming Soon)</Typography>
                 <TextField
                    label="Paste Raw Recipe Text Here"
                    multiline
                    rows={4}
                    fullWidth
                    value={rawRecipeText}
                    onChange={(e) => setRawRecipeText(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 1 }}
                />
                <Button variant="contained" onClick={handleFormatRecipe} size="small">
                    Attempt to Format Recipe
                </Button>
                 <Typography variant="caption" display="block" sx={{mt: 1}}>
                    (In the future, this will attempt to parse the text above and pre-fill the form below.)
                 </Typography>
            </Paper>


            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                    {/* Basic Info */}
                    <Grid item xs={12}>
                        <TextField
                            label="Recipe Name"
                            required
                            fullWidth
                            value={recipeName}
                            onChange={(e) => setRecipeName(e.target.value)}
                            disabled={loading}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Description (Optional)"
                            multiline
                            rows={3}
                            fullWidth
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                        />
                    </Grid>
                     <Grid item xs={6} sm={4}>
                        <TextField
                            label="Base Yield (e.g., 4)"
                            type="number"
                             InputProps={{ inputProps: { min: 0 } }}
                            fullWidth
                            value={baseYield}
                            onChange={(e) => setBaseYield(e.target.value)}
                            disabled={loading}
                        />
                    </Grid>
                     <Grid item xs={6} sm={4}>
                        <TextField
                            label="Yield Unit (e.g., servings)"
                            fullWidth
                            value={baseYieldUnit}
                            onChange={(e) => setBaseYieldUnit(e.target.value)}
                            disabled={loading}
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                         <TextField
                            label="Prep Time (e.g., 15 min)"
                            fullWidth
                            value={prepTime}
                            onChange={(e) => setPrepTime(e.target.value)}
                            disabled={loading}
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                         <TextField
                            label="Cook Time (e.g., 30 min)"
                            fullWidth
                            value={cookTime}
                            onChange={(e) => setCookTime(e.target.value)}
                            disabled={loading}
                        />
                    </Grid>

                    {/* Ingredients Section */}
                     <Grid item xs={12}><Typography variant="h6" sx={{ mt: 2 }}>Ingredients</Typography></Grid>
                     {ingredients.map((ingredient, index) => (
                        <React.Fragment key={index}>
                             <Grid item xs={12} sm={4}>
                                <TextField
                                    label={`Ingredient ${index + 1} Name`}
                                    required
                                    fullWidth
                                    value={ingredient.name}
                                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                                    disabled={loading}
                                />
                            </Grid>
                             <Grid item xs={6} sm={2}>
                                <TextField
                                    label="Qty"
                                    type="number"
                                    InputProps={{ inputProps: { step: "any", min: 0 } }} // Allow decimals
                                    fullWidth
                                    value={ingredient.quantity}
                                     onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                     disabled={loading}
                                />
                            </Grid>
                            <Grid item xs={6} sm={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Unit</InputLabel>
                                    <Select
                                        label="Unit"
                                        value={ingredient.unit}
                                        onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                                        disabled={loading}
                                     >
                                         {commonUnits.map(unit => (
                                             <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                                         ))}
                                          {/* Option for custom unit? */}
                                          <MenuItem value="custom"><em>(Other)</em></MenuItem>
                                     </Select>
                                     {/* Conditionally show TextField if unit is 'custom' - advanced */}
                                </FormControl>
                            </Grid>
                            <Grid item xs={10} sm={3}>
                                <TextField
                                    label="Notes (Optional)"
                                    fullWidth
                                    value={ingredient.notes}
                                     onChange={(e) => handleIngredientChange(index, 'notes', e.target.value)}
                                     disabled={loading}
                                />
                            </Grid>
                             <Grid item xs={2} sm={1} sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconButton onClick={() => removeIngredient(index)} disabled={loading || ingredients.length <= 1} color="error">
                                    <RemoveCircleOutlineIcon />
                                </IconButton>
                            </Grid>
                        </React.Fragment>
                    ))}
                     <Grid item xs={12}>
                         <Button startIcon={<AddCircleOutlineIcon />} onClick={addIngredient} disabled={loading}>
                            Add Ingredient
                         </Button>
                    </Grid>

                    {/* Instructions Section */}
                    <Grid item xs={12}><Typography variant="h6" sx={{ mt: 2 }}>Instructions</Typography></Grid>
                     {instructions.map((instruction, index) => (
                         <React.Fragment key={index}>
                            <Grid item xs={10}>
                                 <TextField
                                    label={`Step ${index + 1}`}
                                    required
                                    multiline
                                    fullWidth
                                    value={instruction}
                                    onChange={(e) => handleInstructionChange(index, e.target.value)}
                                    disabled={loading}
                                />
                            </Grid>
                             <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center' }}>
                                <IconButton onClick={() => removeInstruction(index)} disabled={loading || instructions.length <= 1} color="error">
                                    <RemoveCircleOutlineIcon />
                                </IconButton>
                            </Grid>
                         </React.Fragment>
                     ))}
                     <Grid item xs={12}>
                         <Button startIcon={<AddCircleOutlineIcon />} onClick={addInstruction} disabled={loading}>
                            Add Step
                         </Button>
                    </Grid>

                     {/* Tags Section */}
                      <Grid item xs={12}><Typography variant="h6" sx={{ mt: 2 }}>Tags</Typography></Grid>
                       <Grid item xs={12}>
                         <TextField
                            label="Tags (comma-separated, e.g., easy, chicken, quick)"
                            fullWidth
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            disabled={loading}
                            helperText="Separate tags with commas."
                        />
                    </Grid>

                    {/* Predefined Customizations Section */}
                    <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Predefined Customizations</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={8}>
                            <TextField
                                label="New Customization Option"
                                fullWidth
                                value={currentCustomizationText}
                                onChange={(e) => setCurrentCustomizationText(e.target.value)}
                                disabled={loading}
                                helperText="e.g., Extra Spicy, No Onions, Side of Sauce"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Button
                                variant="outlined"
                                onClick={handleAddPredefinedCustomization}
                                disabled={loading || !currentCustomizationText.trim()}
                                startIcon={<AddCircleOutlineIcon />}
                                fullWidth
                            >
                                Add Option
                            </Button>
                        </Grid>
                    </Grid>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        {predefinedCustomizations.map((cust, index) => (
                            <Chip
                                key={index}
                                label={cust}
                                onDelete={() => handleRemovePredefinedCustomization(cust)}
                                disabled={loading}
                                sx={{ mb: 1 }}
                            />
                        ))}
                    </Stack>

                    {/* Allow Free Text Customization Checkbox */}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={allowFreeTextCustomization}
                                onChange={(e) => setAllowFreeTextCustomization(e.target.checked)}
                                disabled={loading}
                            />
                        }
                        label="Allow users to add free-text customization notes to their order for this recipe"
                        sx={{ mt: 2 }}
                    />

                    {/* Submit Button & Feedback */}
                    <Grid item xs={12}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading}
                            fullWidth
                        >
                            {loading ? <CircularProgress size={24} /> : 'Add Recipe'}
                        </Button>
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
}

export default AddRecipePage; 