import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Box, Typography, Button } from '@mui/material';

function NotFoundPage() {
  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        textAlign="center"
      >
        <Typography variant="h1" component="h1" sx={{ mb: 2 }}>
          404
        </Typography>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Page Not Found
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          The page you are looking for does not exist.
        </Typography>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Button variant="contained" color="primary">
            Go Home
          </Button>
        </Link>
      </Box>
    </Container>
  );
}

export default NotFoundPage;
