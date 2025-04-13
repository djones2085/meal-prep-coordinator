import React from 'react';
import { Typography, Container } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

function DashboardPage() {
  const { currentUser } = useAuth();

  return (
    <Container>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      {currentUser && (
        <Typography variant="body1">
          Welcome back, {currentUser.email}! This is your main dashboard.
          {/* Add dashboard content here */}
        </Typography>
      )}
    </Container>
  );
}

export default DashboardPage; 