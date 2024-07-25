import React, { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = async () => {
    try {
      const response = await fetch(`https://members-ng.iracing.com/data/lookup/drivers?search_term=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // Assuming the API returns an array of drivers, we'll check if it's not empty
      const isDriverFound = data.length > 0;
      
      console.log(isDriverFound);
    } catch (error) {
      console.error('Error searching for driver:', error);
      console.log(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginY: 2 }}>
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
  );
};

export default Search;