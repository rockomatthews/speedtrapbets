const express = require('express');
const cors = require('cors');
const IracingApi = require('./iRacingApi');  // Updated import path
require('dotenv').config();

const app = express();
app.use(cors());

const iracingApi = new IracingApi();

// Authenticate at startup
(async () => {
  try {
    await iracingApi.authWithCredsFromFile(
      process.env.IRACING_KEY_FILE,
      process.env.IRACING_CREDS_FILE
    );
    console.log('Authentication successful');
  } catch (error) {
    console.error('Authentication failed:', error);
  }
})();

app.get('/api/search-driver', async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const data = await iracingApi.get('/lookup/drivers', { search_term: searchTerm });
    res.json(data);
  } catch (error) {
    console.error('Error searching for driver:', error);
    res.status(500).json({ error: 'An error occurred while searching for the driver', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));