const express = require('express');
const cors = require('cors');
const IracingApi = require('./iRacingApi');
require('dotenv').config();

const app = express();
app.use(cors());

const iracingApi = new IracingApi(process.env.IRACING_USERNAME, process.env.IRACING_PASSWORD);

// Existing search driver route
app.get('/api/search-driver', async (req, res) => {
  try {
    const { searchTerm } = req.query;
    console.log('Received search request for:', searchTerm);
    
    console.log('Attempting to search for driver...');
    const data = await iracingApi.searchDriver(searchTerm);
    
    console.log('Search completed. Result:', data);
    
    res.json(data);
  } catch (error) {
    console.error('Error in search-driver endpoint:', error);
    console.error('Error details:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'An error occurred while searching for the driver', details: error.message });
  }
});

// New test authentication route
app.get('/api/test-auth', async (req, res) => {
  try {
    await iracingApi.login();
    res.json({ message: 'Authentication successful' });
  } catch (error) {
    console.error('Authentication test failed:', error.message);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));