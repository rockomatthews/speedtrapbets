import React, { useState } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const handleSearch = async () => {
    try {
      const response = await fetch(`https://speedtrapbets.onrender.com/api/search-driver?searchTerm=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      console.log('API response:', data); // Log the full response for debugging

      setSearchResult(data);
    } catch (error) {
      console.error('Error searching for driver:', error);
      setSearchResult({ found: false, error: error.message });
    }
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
            <Typography>
              Driver found: {searchResult.driver.display_name} (ID: {searchResult.driver.cust_id})
            </Typography>
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