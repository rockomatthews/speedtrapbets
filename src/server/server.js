const express = require('express');
const cors = require('cors');
const IracingApi = require('./iRacingApi');
require('dotenv').config();

const app = express();
app.use(cors());

const iracingApi = new IracingApi();
let isAuthenticated = false;

// Authenticate at startup
(async function authenticateIRacing() {
    try {
        await iracingApi.login(process.env.IRACING_USERNAME, process.env.IRACING_PASSWORD);
        console.log('Authentication successful');
        isAuthenticated = true;
    } catch (error) {
        console.error('Authentication failed:', error);
    }
})();

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    if (!isAuthenticated) {
        return res.status(503).json({ error: 'iRacing API not authenticated' });
    }
    next();
};

// Basic request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        authenticated: isAuthenticated
    });
});

app.get('/api/search-driver', checkAuth, async (request, response) => {
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

app.get('/api/official-races', checkAuth, async (request, response) => {
    try {
        const page = parseInt(request.query.page) || 1;
        const pageSize = parseInt(request.query.pageSize) || 10;
        
        console.log(`Fetching official races (Page: ${page}, PageSize: ${pageSize})`);
        const officialRaces = await iracingApi.getOfficialRaces(page, pageSize);
        console.log(`Retrieved ${officialRaces.races.length} official races`);
        response.json(officialRaces);
    } catch (error) {
        console.error('Error fetching official races:', error);
        response.status(500).json({
            error: 'An error occurred while fetching official races',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((error, request, response, next) => {
    console.error('Unhandled error:', error);
    response.status(500).json({
        error: 'An unexpected error occurred',
        details: error.message,
        stack: error.stack
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    app.close(() => {
        console.log('HTTP server closed');
    });
});