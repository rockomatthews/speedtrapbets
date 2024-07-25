const express = require('express');
const cors = require('cors');
const IracingApi = require('./iRacingApi');
require('dotenv').config();

const app = express();
app.use(cors());

const iracingApi = new IracingApi(process.env.IRACING_USERNAME, process.env.IRACING_PASSWORD);

app.get('/api/search-driver', async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const data = await iracingApi.searchDriver(searchTerm);
    res.json(data);
  } catch (error) {
    console.error('Error searching for driver:', error);
    res.status(500).json({ error: 'An error occurred while searching for the driver' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));