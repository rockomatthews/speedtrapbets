// components/Dashboard.js

import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Button, Divider, TextField, IconButton, Alert, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';
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

  const [officialRaces, setOfficialRaces] = useState([]);
  const [raceTypeFilter, setRaceTypeFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [isLoadingRaces, setIsLoadingRaces] = useState(false);

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

  useEffect(() => {
    const fetchOfficialRaces = async () => {
      setIsLoadingRaces(true);
      try {
        const response = await fetch('https://speedtrapbets.onrender.com/api/official-races');
        if (!response.ok) {
          throw new Error('Failed to fetch official races');
        }
        const data = await response.json();
        setOfficialRaces(data);
      } catch (error) {
        console.error('Error fetching official races:', error);
        setError('Failed to fetch official races. Please try again later.');
      } finally {
        setIsLoadingRaces(false);
      }
    };

    fetchOfficialRaces();
    const interval = setInterval(fetchOfficialRaces, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const handleRaceTypeFilterChange = (event) => {
    setRaceTypeFilter(event.target.value);
  };

  const handleClassFilterChange = (event) => {
    setClassFilter(event.target.value);
  };

  const filteredRaces = officialRaces.filter(race => 
    (raceTypeFilter === 'all' || race.type === raceTypeFilter) &&
    (classFilter === 'all' || race.class === classFilter)
  );

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

        <Divider sx={{ my: 4 }} />

        <Typography variant="h5" component="h2" gutterBottom>Official Races</Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Race Type</InputLabel>
            <Select value={raceTypeFilter} onChange={handleRaceTypeFilterChange}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="oval">Oval</MenuItem>
              <MenuItem value="formula">Formula</MenuItem>
              <MenuItem value="dirt_oval">Dirt Oval</MenuItem>
              <MenuItem value="road">Road</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Class</InputLabel>
            <Select value={classFilter} onChange={handleClassFilterChange}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="Rookie">Rookie</MenuItem>
              <MenuItem value="D">D</MenuItem>
              <MenuItem value="C">C</MenuItem>
              <MenuItem value="B">B</MenuItem>
              <MenuItem value="A">A</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {isLoadingRaces ? (
          <CircularProgress />
        ) : filteredRaces.length > 0 ? (
          <Box sx={{ mt: 2 }}>
            {filteredRaces.map((race, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
                <Typography variant="h6">{race.name}</Typography>
                <Typography>Type: {race.type}</Typography>
                <Typography>Class: {race.class}</Typography>
                <Typography>Start Time: {new Date(race.startTime).toLocaleString()}</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography>No races found matching the current filters.</Typography>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard;