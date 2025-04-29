import React from 'react';
import { CircularProgress, Box } from '@mui/material';

const LoadingSpinner = ({ 
    size = 40,
    color = 'primary',
    centered = false,
    ...props 
}) => {
    const spinner = (
        <CircularProgress
            size={size}
            color={color}
            {...props}
        />
    );

    if (centered) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight={200}
            >
                {spinner}
            </Box>
        );
    }

    return spinner;
};

export default LoadingSpinner; 