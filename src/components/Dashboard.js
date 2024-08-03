import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Divider } from '@mui/material';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Search from './Search'; // Import the Search component
import FollowedDrivers from './FollowedDrivers';


const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        navigate('/');
      }
      setLoading(false);
    };

    fetchUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!user) {
    return <Typography>No user found. Please sign in.</Typography>;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to your Dashboard
        </Typography>
        <Typography variant="subtitle1">
          Email: {user.email}
        </Typography>
        {user.user_metadata && user.user_metadata.username && (
          <Typography variant="subtitle1">
            Username: {user.user_metadata.username}
          </Typography>
        )}
        {user.user_metadata && user.user_metadata.iRacing_name && (
          <Typography variant="subtitle1">
            iRacing Name: {user.user_metadata.iRacing_name}
          </Typography>
        )}
        <Button
          variant="contained"
          color="secondary"
          onClick={handleSignOut}
          sx={{ mt: 2 }}
        >
          Sign Out
        </Button>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" component="h2" gutterBottom>
          Search iRacer
        </Typography>
        <Search />
        <FollowedDrivers />
      </Box>
    </Container>
  );
};

export default Dashboard;