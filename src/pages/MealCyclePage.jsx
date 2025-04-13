import React from 'react';
import { Typography, Container } from '@mui/material';

function MealCyclePage() {
  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Meal Cycle
      </Typography>
      <Typography variant="body1">
        Details about the current or upcoming meal cycle (voting, ordering, etc.) will be shown here.
        {/* Add meal cycle specific components later */}
      </Typography>
    </Container>
  );
}

export default MealCyclePage; 