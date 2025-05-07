import React, { useState } from 'react';
import {
    Box,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    TextField,
    IconButton,
    Typography,
    Button,
    Paper,
    Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

// Helper function (can be moved to a utils file if used elsewhere)
const roundNicely = (num, decimalPlaces = 2) => {
    const factor = 10 ** decimalPlaces;
    return Math.round(num * factor) / factor;
};

function AdminShoppingListItem({ ingredient, cycleId, onUpdateIngredient }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        quantity: ingredient.originalQuantity !== undefined ? ingredient.originalQuantity : ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.shopperNotes || '',
    });

    const handleToggleOnHand = () => {
        onUpdateIngredient(ingredient.id, { markedOnHand: !ingredient.markedOnHand });
    };

    const handleEdit = () => {
        setIsEditing(true);
        // Reset form to current ingredient values in case of previous unsaved changes
        setEditForm({
            quantity: ingredient.originalQuantity !== undefined ? ingredient.originalQuantity : ingredient.quantity,
            unit: ingredient.unit, // Assuming unit might be editable in a more advanced version
            notes: ingredient.shopperNotes || '',
        });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSaveEdit = () => {
        const updates = {
            quantity: parseFloat(editForm.quantity) || 0,
            // unit: editForm.unit, // If unit becomes editable
            shopperNotes: editForm.notes,
        };
        // If quantity changed, perhaps update 'quantity' and keep 'originalQuantity'
        // For now, let's assume 'quantity' is what's being adjusted by the shopper/admin
        onUpdateIngredient(ingredient.id, updates);
        setIsEditing(false);
    };

    const handleChange = (e) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    const displayQuantity = ingredient.quantity; // This might be different from original if edited

    return (
        <ListItem
            secondaryAction={
                !isEditing && (
                    <IconButton edge="end" aria-label="edit" onClick={handleEdit} size="small">
                        <EditIcon fontSize="small" />
                    </IconButton>
                )
            }
            disablePadding
            sx={{ '&:not(:last-child)': { mb: 1 }, alignItems: 'flex-start' }}
        >
            <Checkbox
                edge="start"
                checked={ingredient.markedOnHand || false}
                onChange={handleToggleOnHand}
                tabIndex={-1}
                disableRipple
                inputProps={{ 'aria-labelledby': `checkbox-list-label-${ingredient.id}` }}
                size="small"
                sx={{ mr: 1, mt:0 }}
            />
            {isEditing ? (
                <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1, p:1, border: '1px solid lightgray', borderRadius:1 }}>
                    <Typography variant="subtitle1" sx={{textDecoration: ingredient.markedOnHand ? 'line-through' : 'none'}}>
                        {ingredient.name}
                    </Typography>
                    <TextField
                        label="Quantity"
                        name="quantity"
                        type="number"
                        value={editForm.quantity}
                        onChange={handleChange}
                        size="small"
                        sx={{width: '100px'}}
                        inputProps={{ step: "any" }}
                    />
                    <TextField
                        label="Unit"
                        name="unit"
                        value={editForm.unit}
                        onChange={handleChange}
                        size="small"
                        disabled // Unit editing not fully implemented, keep disabled
                        sx={{width: '100px'}}
                    />
                    <TextField
                        label="Shopper Notes"
                        name="notes"
                        value={editForm.notes}
                        onChange={handleChange}
                        multiline
                        rows={2}
                        size="small"
                        fullWidth
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                        <Button onClick={handleCancelEdit} size="small" variant="outlined" startIcon={<CancelIcon />}>Cancel</Button>
                        <Button type="submit" variant="contained" size="small" startIcon={<SaveIcon />}>Save</Button>
                    </Box>
                </Box>
            ) : (
                <ListItemText
                    id={`item-text-${ingredient.id}`}
                    primary={
                        <Typography variant="body1" sx={{ textDecoration: ingredient.markedOnHand ? 'line-through' : 'none' }}>
                            {ingredient.name}
                        </Typography>
                    }
                    secondary={
                        <>
                            <Typography component="span" variant="body2" color="text.primary">
                                Quantity: {roundNicely(displayQuantity)} {ingredient.unit}
                            </Typography>
                            {ingredient.originalQuantity !== undefined && roundNicely(ingredient.originalQuantity) !== roundNicely(displayQuantity) && (
                                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                    (Original: {roundNicely(ingredient.originalQuantity)} {ingredient.unit})
                                </Typography>
                            )}
                            {ingredient.shopperNotes && (
                                <Typography component="span" variant="caption" sx={{ display: 'block', fontStyle: 'italic', mt: 0.5 }}>
                                    Notes: {ingredient.shopperNotes}
                                </Typography>
                            )}
                        </>
                    }
                />
            )}
        </ListItem>
    );
}

function AdminShoppingList({
    ingredients = [],
    cycleId,
    onUpdateIngredient,
    onApproveList,
    shoppingListStatus
}) {
    if (!ingredients || ingredients.length === 0) {
        return <Typography sx={{ p: 2, fontStyle: 'italic' }}>Shopping list is empty or not yet generated.</Typography>;
    }

    // Ensure ingredients have a unique ID for keys and updates
    // This is a placeholder: Cloud Function should ideally provide stable IDs
    const processedIngredients = ingredients.map((ing, index) => ({
        ...ing,
        id: ing.id || `${ing.name.replace(/\s+/g, '-').toLowerCase()}-${index}` // Fallback ID
    }));

    const canApprove = shoppingListStatus === 'pending_approval';
    const isApproved = shoppingListStatus === 'approved' || shoppingListStatus === 'in_progress' || shoppingListStatus === 'completed';


    return (
        <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Manage Shopping List</Typography>
                {canApprove && onApproveList && (
                    <Button variant="contained" color="success" onClick={() => onApproveList(cycleId)}>
                        Approve Shopping List
                    </Button>
                )}
                {isApproved && (
                     <Typography variant="caption" color="success.main">List Approved</Typography>
                )}
            </Box>
            <Divider sx={{mb:2}}/>
            <List dense>
                {processedIngredients.map((ingredient) => (
                    <AdminShoppingListItem
                        key={ingredient.id}
                        ingredient={ingredient}
                        cycleId={cycleId}
                        onUpdateIngredient={onUpdateIngredient}
                    />
                ))}
            </List>
        </Paper>
    );
}

export default AdminShoppingList; 