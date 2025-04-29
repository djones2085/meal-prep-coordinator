import React from 'react';
import { Alert as MuiAlert, AlertTitle } from '@mui/material';

const Alert = ({ 
    severity = 'info',
    title,
    children,
    variant = 'standard',
    ...props 
}) => {
    return (
        <MuiAlert
            severity={severity}
            variant={variant}
            sx={{
                '& .MuiAlert-message': {
                    width: '100%'
                }
            }}
            {...props}
        >
            {title && <AlertTitle>{title}</AlertTitle>}
            {children}
        </MuiAlert>
    );
};

export default Alert; 