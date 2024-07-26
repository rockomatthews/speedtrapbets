import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const handleSearch = async () => {
    try {
      // Replace 'your-render-app' with your actual Render.com app name
      const response = await fetch(`https://speedtrapbets.onrender.com/api/search-driver?searchTerm=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // Assuming the API returns an array of drivers
      const isDriverFound = data.length > 0;
      
      setSearchResult(isDriverFound);
      console.log(isDriverFound);
    } catch (error) {
      console.error('Error searching for driver:', error);
      setSearchResult(false);
      console.log(false);
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
      {searchResult !== null && (
        <Box sx={{ marginTop: 2 }}>
          {searchResult ? 'Driver found' : 'Driver not found'}
        </Box>
      )}
    </Box>
  );
};

export default Search;