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
    console.log('Searching for driver:', searchTerm);
    const data = await iracingApi.searchDriver(searchTerm);
    console.log('Search result:', data);
    res.json(data);
  } catch (error) {
    console.error('Error searching for driver:', error.message, error.response ? error.response.data : '');
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