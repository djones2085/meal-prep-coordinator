import React from 'react';
import { TextField as MuiTextField } from '@mui/material';

const TextField = ({ 
    label, 
    error, 
    helperText, 
    fullWidth = true, 
    margin = "normal",
    size = "medium",
    variant = "outlined",
    ...props 
}) => {
    return (
        <MuiTextField
            label={label}
            error={error}
            helperText={helperText}
            fullWidth={fullWidth}
            margin={margin}
            size={size}
            variant={variant}
            sx={{
                '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                        borderColor: 'primary.main',
                    },
                },
            }}
            {...props}
        />
    );
};

export default TextField; 