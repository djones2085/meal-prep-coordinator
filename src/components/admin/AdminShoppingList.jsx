import React, { useState } from 'react';
import {
    Box,
    List,
    ListItem,
    ListItemText,
    TextField,
    Typography,
    Button,
    Paper,
    Divider,
    Grid,
    InputAdornment,
    IconButton
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
// Removed EditIcon, SaveIcon, CancelIcon, Checkbox as direct item editing/marking is changing

// Helper function (can be moved to a utils file if used elsewhere)
const roundNicely = (num, decimalPlaces = 2) => {
    if (typeof num !== 'number' || isNaN(num)) return num; // Return original if not a valid number
    const factor = 10 ** decimalPlaces;
    return Math.round(num * factor) / factor;
};

function AdminShoppingListItemDetails({ item, onHandQuantityChange, disabled }) {
    const [currentOnHand, setCurrentOnHand] = useState(item.onHandQuantity || 0);

    // Effect to update currentOnHand if item.onHandQuantity changes from props (e.g. after Firestore update)
    React.useEffect(() => {
        setCurrentOnHand(item.onHandQuantity || 0);
    }, [item.onHandQuantity]);

    const handleLocalOnHandChange = (event) => {
        setCurrentOnHand(event.target.value);
    };

    const handleBlur = () => {
        const numericValue = parseFloat(currentOnHand);
        const validOnHand = !isNaN(numericValue) && numericValue >= 0 ? numericValue : 0;
        // Call the parent handler only if the value has actually changed from the item's perspective
        if (validOnHand !== (item.onHandQuantity || 0)) {
            onHandQuantityChange(item.name, item.unit, validOnHand);
        }
        // Optionally, always set currentOnHand to the validated/committed value
        // setCurrentOnHand(validOnHand); 
    };

    const handleMarkAsAcquired = () => {
        // Call parent handler to set onHandQuantity to the full aggregatedQuantity
        onHandQuantityChange(item.name, item.unit, item.aggregatedQuantity || 0);
    };

    const toBePurchased = roundNicely(Math.max(0, (item.aggregatedQuantity || 0) - (item.onHandQuantity || 0)));
    const isFullyOnHand = toBePurchased <= 0;

    return (
        <ListItem
            disablePadding
            sx={{ '&:not(:last-child)': { mb: 1.5 }, alignItems: 'center', display: 'flex', flexWrap: 'wrap' }}
        >
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                    <ListItemText
                        primary={
                            <Typography variant="body1" sx={{ textDecoration: isFullyOnHand ? 'line-through' : 'none' }}>
                                {item.name}
                            </Typography>
                        }
                        secondary={`Unit: ${item.unit}`}
                    />
                </Grid>
                <Grid item xs={6} sm={2.5}>
                    <Typography variant="body2" color="text.secondary">
                        Needed: {roundNicely(item.aggregatedQuantity)}
                    </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField
                        label="On Hand"
                        type="number"
                        size="small"
                        value={currentOnHand} // Controlled by local state for immediate input feedback
                        onChange={handleLocalOnHandChange}
                        onBlur={handleBlur} // Update parent/Firestore on blur
                        inputProps={{ min: 0, step: "any" }}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">{item.unit}</InputAdornment>,
                        }}
                        sx={{ minWidth: '100px' }}
                        // Disabled based on parent component's logic (e.g. if list not approved)
                        disabled={disabled}
                    />
                </Grid>
                <Grid item xs={12} sm={2.5} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" color={isFullyOnHand ? "success.main" : "error.main"} fontWeight="bold" sx={{ mr: 1 }}>
                        To Buy: {toBePurchased}
                    </Typography>
                    <IconButton 
                        aria-label="Mark as acquired" 
                        onClick={handleMarkAsAcquired} 
                        disabled={disabled || toBePurchased <= 0} // Also disable if already fully on hand
                        size="small"
                        color="primary"
                    >
                        <CheckCircleOutlineIcon fontSize="small" />
                    </IconButton>
                </Grid>
            </Grid>
        </ListItem>
    );
}

function AdminShoppingList({
    cycleId,
    shoppingList, // Expecting { status: string, items: [], ... }
    onApproveList,
    onUpdateItemOnHand // New prop: (cycleId, itemName, itemUnit, newOnHandQuantity) => void
}) {
    if (!shoppingList || !shoppingList.items || shoppingList.items.length === 0) {
        return <Typography sx={{ p: 2, fontStyle: 'italic' }}>Shopping list is empty or not yet generated.</Typography>;
    }

    const items = shoppingList.items;
    const status = shoppingList.status;

    const canApprove = status === 'pending_approval';
    const isApprovedOrLater = ['approved', 'shopping_in_progress', 'completed'].includes(status);
    // Determine if onHand fields should be editable
    const allowOnHandEditing = status === 'approved' || status === 'shopping_in_progress';

    const handleItemOnHandChange = (itemName, itemUnit, newOnHandQuantity) => {
        // This will call the handler passed from MealCycleManagementPage
        if (onUpdateItemOnHand) {
            onUpdateItemOnHand(cycleId, itemName, itemUnit, newOnHandQuantity);
        }
    };

    return (
        <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Manage Shopping List</Typography>
                {canApprove && onApproveList && (
                    <Button variant="contained" color="success" onClick={() => onApproveList(cycleId)}>
                        Approve Shopping List
                    </Button>
                )}
                {isApprovedOrLater && (
                     <Typography variant="caption" color="success.main" sx={{fontWeight: "bold"}}>
                        Status: {status.replace('_', ' ').toUpperCase()}
                    </Typography>
                )}
            </Box>
            <Divider sx={{mb:2}}/>
            <List dense>
                {items.map((item, index) => (
                    // Using name and unit for key assuming they are unique within the list for now
                    // Ideally, items from Firestore would have stable IDs.
                    <AdminShoppingListItemDetails
                        key={`${item.name}-${item.unit}-${index}`}
                        item={item}
                        onHandQuantityChange={handleItemOnHandChange} 
                        disabled={!allowOnHandEditing}
                    />
                ))}
            </List>
        </Paper>
    );
}

export default AdminShoppingList; 