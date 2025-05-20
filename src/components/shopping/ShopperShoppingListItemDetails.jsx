import React, { useState, useEffect } from 'react';
import {
    ListItem,
    ListItemText,
    TextField,
    Typography,
    Grid,
    InputAdornment,
    IconButton
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Helper function (can be moved to a utils file if used elsewhere)
const roundNicely = (num, decimalPlaces = 2) => {
    if (typeof num !== 'number' || isNaN(num)) return num; // Return original if not a valid number
    const factor = 10 ** decimalPlaces;
    return Math.round(num * factor) / factor;
};

function ShopperShoppingListItemDetails({ item, onHandQuantityChange, cycleId, disabled }) {
    const [currentOnHand, setCurrentOnHand] = useState(item.onHandQuantity || 0);

    useEffect(() => {
        setCurrentOnHand(item.onHandQuantity || 0);
    }, [item.onHandQuantity]);

    const handleLocalOnHandChange = (event) => {
        setCurrentOnHand(event.target.value);
    };

    const handleBlur = () => {
        const numericValue = parseFloat(currentOnHand);
        const validOnHand = !isNaN(numericValue) && numericValue >= 0 ? numericValue : 0;
        if (validOnHand !== (item.onHandQuantity || 0)) {
            onHandQuantityChange(cycleId, item.name, item.unit, validOnHand);
        }
    };

    const handleMarkAsAcquired = () => {
        onHandQuantityChange(cycleId, item.name, item.unit, item.aggregatedQuantity || 0);
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
                        Needed: {roundNicely(item.aggregatedQuantity)} {item.unit}
                        {item.originalQuantity && item.originalUnit && (item.originalQuantity !== item.aggregatedQuantity || item.originalUnit !== item.unit) && (
                            <Typography component="span" variant="caption" sx={{ ml: 0.5, fontStyle: 'italic' }}>
                                (orig. {roundNicely(item.originalQuantity)} {item.originalUnit})
                            </Typography>
                        )}
                    </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                    <TextField
                        label="On Hand"
                        type="number"
                        size="small"
                        value={currentOnHand}
                        onChange={handleLocalOnHandChange}
                        onBlur={handleBlur}
                        inputProps={{ min: 0, step: "any" }}
                        InputProps={{
                            endAdornment: <InputAdornment position="end">{item.unit}</InputAdornment>,
                        }}
                        sx={{ minWidth: '100px' }}
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
                        disabled={disabled || toBePurchased <= 0}
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

export default ShopperShoppingListItemDetails; 