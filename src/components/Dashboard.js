import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Divider, TextField, IconButton, Alert } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import Search from './Search';
import FollowedDrivers from './FollowedDrivers';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [iRacingName, setIRacingName] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingIRacingName, setIsEditingIRacingName] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setUsername(user.user_metadata?.username || '');
        setIRacingName(user.user_metadata?.iRacing_name || '');
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

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const handleIRacingNameChange = (event) => {
    setIRacingName(event.target.value);
  };

  const saveUsername = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setError('This username is already taken.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: { username: username }
      });

      if (updateError) throw updateError;

      setUser({ ...user, user_metadata: { ...user.user_metadata, username: username } });
      setIsEditingUsername(false);
      setError('');
    } catch (error) {
      console.error('Error updating username:', error);
      setError(error.message || 'An error occurred while updating the username.');
    }
  };

  const checkIRacingName = async () => {
    try {
      const response = await fetch(`https://speedtrapbets.onrender.com/api/search-driver?searchTerm=${encodeURIComponent(iRacingName)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setSearchResult(data);

      if (data.found) {
        const { error } = await supabase.auth.updateUser({
          data: { iRacing_name: iRacingName }
        });

        if (error) throw error;

        setUser({ ...user, user_metadata: { ...user.user_metadata, iRacing_name: iRacingName } });
        setIsEditingIRacingName(false);
        setError('');
      } else {
        setError('iRacing name not found.');
      }
    } catch (error) {
      console.error('Error checking iRacing name:', error);
      setError(error.message || 'An error occurred while checking the iRacing name.');
    }
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
        <Typography variant="h4" component="h1" gutterBottom>Welcome to your Dashboard</Typography>
        <Typography variant="subtitle1">Email: {user.email}</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          {!isEditingUsername ? (
            <>
              <Typography variant="subtitle1">Username: {username || 'Not set'}</Typography>
              <IconButton onClick={() => setIsEditingUsername(true)} size="small">
                <EditIcon />
              </IconButton>
            </>
          ) : (
            <>
              <TextField
                value={username}
                onChange={handleUsernameChange}
                variant="outlined"
                size="small"
                placeholder="Enter username"
              />
              <Button variant="contained" onClick={saveUsername} sx={{ ml: 1 }}>Save</Button>
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          {!isEditingIRacingName ? (
            <>
              <Typography variant="subtitle1">iRacing Name: {iRacingName || 'Not set'}</Typography>
              <IconButton onClick={() => setIsEditingIRacingName(true)} size="small">
                <EditIcon />
              </IconButton>
            </>
          ) : (
            <>
              <TextField
                value={iRacingName}
                onChange={handleIRacingNameChange}
                variant="outlined"
                size="small"
                placeholder="Enter iRacing Name"
              />
              <Button variant="contained" onClick={checkIRacingName} sx={{ ml: 1 }}>Verify</Button>
            </>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {searchResult && searchResult.found && (
          <Alert severity="success" sx={{ mt: 2 }}>iRacing name verified and saved.</Alert>
        )}

        <Button variant="contained" color="secondary" onClick={handleSignOut} sx={{ mt: 2 }}>Sign Out</Button>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" component="h2" gutterBottom>Search iRacer</Typography>
        <Search />
        <FollowedDrivers />
      </Box>
    </Container>
  );
};

export default Dashboard;