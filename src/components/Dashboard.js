import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import SolanaBettingComponent from './SolanaBettingComponent';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        navigate('/');
      }
    };

    fetchUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Welcome to your Dashboard
        </Typography>
        <Typography component="p" variant="body1" sx={{ mt: 2 }}>
          Email: {user.email}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSignOut}
          sx={{ mt: 3, mb: 3 }}
        >
          Sign Out
        </Button>
        
        {/* Add the Solana Betting Component here */}
        <SolanaBettingComponent />
      </Box>
    </Container>
  );
};

export default Dashboard;