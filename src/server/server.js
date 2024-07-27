const express = require('express');
const cors = require('cors');
const IracingApi = require('./iRacingApi');
require('dotenv').config();

const app = express();
app.use(cors());

const iracingApi = new IracingApi();

// Authenticate at startup
(async function authenticateIRacing() {
    try {
        await iracingApi.login(process.env.IRACING_USERNAME, process.env.IRACING_PASSWORD);
        console.log('Authentication successful');
    } catch (error) {
        console.error('Authentication failed:', error);
    }
})();

app.get('/api/search-driver', async (request, response) => {
    try {
        const searchTerm = request.query.searchTerm;
        console.log('Searching for driver:', searchTerm);
        const data = await iracingApi.searchDrivers(searchTerm);
        
        if (Array.isArray(data) && data.length > 0) {
            console.log('Driver found:', data[0]);
            response.json({ found: true, driver: data[0] });
        } else {
            console.log('Driver not found');
            response.json({ found: false });
        }
    } catch (error) {
        console.error('Error searching for driver:', error);
        response.status(500).json({
            error: 'An error occurred while searching for the driver',
            details: error.message
        });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});