import React, { useState, useContext } from 'react';
import { TextField, Button, Box, Typography, IconButton } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { UserContext } from '../contexts/UserContext';  // We'll create this context later

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const { followedDrivers, setFollowedDrivers } = useContext(UserContext);

  const handleSearch = async () => {
    try {
      const response = await fetch(`https://speedtrapbets.onrender.com/api/search-driver?searchTerm=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      console.log('API response:', data);
      setSearchResult(data);
    } catch (error) {
      console.error('Error searching for driver:', error);
      setSearchResult({ found: false, error: error.message });
    }
  };

  const toggleFollow = (driver) => {
    setFollowedDrivers(prev => {
      const isFollowed = prev.some(d => d.cust_id === driver.cust_id);
      if (isFollowed) {
        return prev.filter(d => d.cust_id !== driver.cust_id);
      } else {
        return [...prev, driver];
      }
    });
  };

  const isFollowed = (driver) => {
    return followedDrivers.some(d => d.cust_id === driver.cust_id);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, marginY: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          label="Search Driver"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button variant="contained" onClick={handleSearch}>
          Submit
        </Button>
      </Box>
      {searchResult && (
        <Box sx={{ marginTop: 2 }}>
          {searchResult.found ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography>
                Driver found: {searchResult.driver.display_name} (ID: {searchResult.driver.cust_id})
              </Typography>
              <IconButton onClick={() => toggleFollow(searchResult.driver)}>
                {isFollowed(searchResult.driver) ? <StarIcon /> : <StarBorderIcon />}
              </IconButton>
            </Box>
          ) : (
            <Typography>Driver not found</Typography>
          )}
        </Box>
      )}
      {searchResult && searchResult.error && (
        <Typography color="error">Error: {searchResult.error}</Typography>
      )}
    </Box>
  );
};

export default Search;