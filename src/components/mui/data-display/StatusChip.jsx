import React from 'react';
import { Chip } from '@mui/material';

const StatusChip = ({ 
    status,
    variant = 'filled',
    size = 'medium',
    ...props 
}) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'ordering_open':
                return 'success';
            case 'ordering_closed':
                return 'warning';
            case 'shopping':
            case 'cooking':
            case 'packaging':
            case 'distributing':
                return 'info';
            case 'completed':
                return 'default';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const formatStatus = (status) => {
        return status
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <Chip
            label={formatStatus(status)}
            color={getStatusColor(status)}
            variant={variant}
            size={size}
            {...props}
        />
    );
};

export default StatusChip; 