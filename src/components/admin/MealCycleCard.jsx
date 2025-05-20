import React, { useState } from 'react';
import {
    Card,
    CardContent,
    Typography,
    CardActions,
    Button,
    IconButton,
    Box,
    Collapse,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel
} from '@mui/material';
import { StatusChip } from '../mui'; // Assuming StatusChip is in ../mui
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Helper function to format status for display (can be imported or redefined if not available)
const formatStatus = (status) => {
    if (!status) return 'N/A';
    return status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
};

// Define possible statuses (can be imported or passed as prop)
const cycleStatuses = [
    'ordering_open', 'ordering_closed',
    'shopping', 'cooking', 'packaging', 'distributing', 'completed', 'cancelled'
];

export default function MealCycleCard({
    cycle,
    onStatusChange,
    updatingStatus,
    onViewOrders, // Function to trigger viewing orders (could open modal or navigate)
    // onManageShoppingList, // Placeholder for shopping list action
    expandedCycleId, // To manage which cycle's details are shown if we use a global expand
    onExpandClick, // Function to handle expand/collapse of order details
    renderExpandedCycleContent // Function to render the expanded content (orders, shopping list)
}) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [showStatusSelector, setShowStatusSelector] = useState(false);

    const handleToggleDetails = () => {
        setDetailsOpen(!detailsOpen);
        // If using a global expand controlled by parent, call that instead/additionally
        if (onExpandClick) {
            onExpandClick(cycle.id);
        }
    };
    
    const isCurrentlyExpanded = expandedCycleId === cycle.id;


    return (
        <Card sx={{ mb: 2, boxShadow: 3 }}>
            <CardContent>
                <Typography variant="h6" component="div" gutterBottom>
                    {cycle.cycleName || `Cycle ID: ${cycle.id.substring(0, 6)}...`}
                </Typography>
                <StatusChip status={cycle.status || 'N/A'} />

                <Box sx={{ mt: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                        Target Cook Date: {cycle.targetCookDate || 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Order Deadline: {cycle.orderDeadline || 'N/A'}
                    </Typography>
                </Box>

                {cycle.totalMealCounts !== undefined && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Total Meals: {cycle.totalMealCounts}
                    </Typography>
                )}
                 {cycle.totalCountsByProtein && (
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        Proteins: {Object.entries(cycle.totalCountsByProtein).map(([p,c]) => `${p}: ${c}`).join(', ') || '-'}
                    </Typography>
                )}
            </CardContent>
            <Divider />
            <CardActions sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', p:1 }}>
                <Button
                    size="small"
                    onClick={() => setShowStatusSelector(!showStatusSelector)}
                    disabled={updatingStatus[cycle.id]}
                >
                    {showStatusSelector ? 'Hide Status' : 'Change Status'}
                </Button>
                {onViewOrders && (
                     <Button size="small" onClick={() => onViewOrders(cycle.id)}>
                        View Orders
                    </Button>
                )}
                {/* Placeholder for other actions like shopping list */}
                 <IconButton
                    onClick={handleToggleDetails}
                    aria-expanded={isCurrentlyExpanded}
                    aria-label="show more"
                    size="small"
                >
                    {isCurrentlyExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                </IconButton>
            </CardActions>

            {showStatusSelector && (
                <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                            value={cycle.status || ''}
                            label="Status"
                            onChange={(e) => {
                                onStatusChange(cycle.id, e.target.value);
                                setShowStatusSelector(false); // Optionally hide after selection
                            }}
                            disabled={updatingStatus[cycle.id]}
                        >
                            {cycleStatuses.map(s => (
                                <MenuItem key={s} value={s}>{formatStatus(s)}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            )}
            
            {/* Collapsible section for Orders and Shopping List */}
            <Collapse in={isCurrentlyExpanded} timeout="auto" unmountOnExit>
                <CardContent sx={{ borderTop: '1px solid rgba(0,0,0,0.12)', pt: 1.5}}>
                    {renderExpandedCycleContent && renderExpandedCycleContent(cycle)}
                </CardContent>
            </Collapse>
        </Card>
    );
}

// Props that MealCycleCard expects:
// cycle: object - The meal cycle data.
// onStatusChange: function(cycleId, newStatus) - Handler for changing status.
// updatingStatus: object - Tracks loading state for status updates (e.g., { cycleId1: true }).
// onViewOrders: function(cycleId) - Handler for viewing orders for a cycle.
// expandedCycleId: string | null - The ID of the currently expanded cycle (controlled by parent).
// onExpandClick: function(cycleId) - Handler for card expand/collapse action.
// renderExpandedCycleContent: function(cycle) - Function that returns JSX for the expanded content (orders, shopping list). 