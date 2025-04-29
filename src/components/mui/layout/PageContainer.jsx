import React from 'react';
import { Container, Box } from '@mui/material';

const PageContainer = ({ 
    children,
    maxWidth = 'lg',
    spacing = 3,
    ...props 
}) => {
    return (
        <Container maxWidth={maxWidth} {...props}>
            <Box
                sx={{
                    py: spacing,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing
                }}
            >
                {children}
            </Box>
        </Container>
    );
};

export default PageContainer; 