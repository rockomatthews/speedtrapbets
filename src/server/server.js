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
        console.log('Attempting to authenticate with iRacing API...');
        await iracingApi.login(process.env.IRACING_USERNAME, process.env.IRACING_PASSWORD);
        console.log('Authentication successful');
        isAuthenticated = true;
    } catch (error) {
        console.error('Authentication failed:', error);
        console.error('Stack trace:', error.stack);
    }
})();

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    console.log(`Checking authentication for request to ${req.url}`);
    if (!isAuthenticated) {
        console.warn('Request denied: iRacing API not authenticated');
        return res.status(503).json({ error: 'iRacing API not authenticated' });
    }
    console.log('Authentication check passed');
    next();
};

// Basic request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({
        status: 'ok',
        authenticated: isAuthenticated,
        serverTime: new Date().toISOString()
    });
});

app.get('/api/search-driver', checkAuth, async (request, response) => {
    try {
        const searchTerm = request.query.searchTerm;
        console.log('Searching for driver:', searchTerm);
        const data = await iracingApi.searchDrivers(searchTerm);
        
        console.log('Raw search result:', JSON.stringify(data, null, 2));
        
        if (Array.isArray(data) && data.length > 0) {
            console.log('Driver found:', JSON.stringify(data[0], null, 2));
            response.json({ found: true, driver: data[0] });
        } else {
            console.log('Driver not found');
            response.json({ found: false });
        }
    } catch (error) {
        console.error('Error searching for driver:', error);
        console.error('Stack trace:', error.stack);
        response.status(500).json({
            error: 'An error occurred while searching for the driver',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
        console.log('Official races:', JSON.stringify(officialRaces, null, 2));
        
        console.log('Sending response:', JSON.stringify(officialRaces, null, 2));

        response.json(officialRaces);
    } catch (error) {
        console.error('Error fetching official races:', error);
        console.error('Stack trace:', error.stack);
        response.status(500).json({
            error: 'An error occurred while fetching official races',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Error handling middleware
app.use((error, request, response, next) => {
    console.error('Unhandled error:', error);
    console.error('Stack trace:', error.stack);
    response.status(500).json({
        error: 'An unexpected error occurred',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

module.exports = app;