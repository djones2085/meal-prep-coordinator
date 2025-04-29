import React from 'react';
import { Card as MuiCard, CardContent, CardHeader, CardActions } from '@mui/material';

const Card = ({ 
    children,
    title,
    subheader,
    action,
    footer,
    elevation = 1,
    ...props 
}) => {
    return (
        <MuiCard elevation={elevation} {...props}>
            {(title || subheader || action) && (
                <CardHeader
                    title={title}
                    subheader={subheader}
                    action={action}
                />
            )}
            <CardContent>
                {children}
            </CardContent>
            {footer && (
                <CardActions>
                    {footer}
                </CardActions>
            )}
        </MuiCard>
    );
};

export default Card; 