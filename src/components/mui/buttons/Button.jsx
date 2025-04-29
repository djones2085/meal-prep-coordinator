import React from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';

const Button = ({ 
    children, 
    variant = 'contained', 
    color = 'primary',
    size = 'medium',
    fullWidth = false,
    isLoading = false,
    startIcon,
    endIcon,
    ...props 
}) => {
    return (
        <MuiButton
            variant={variant}
            color={color}
            size={size}
            fullWidth={fullWidth}
            disabled={isLoading || props.disabled}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : startIcon}
            endIcon={endIcon}
            sx={{
                textTransform: 'none',
                fontWeight: 500,
                ...props.sx
            }}
            {...props}
        >
            {children}
        </MuiButton>
    );
};

export default Button; 