const express = require('express');
const cors = require('cors');
const IracingApi = require('./iRacingApi');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const cache = new NodeCache({ stdTTL: 30 }); // 30 seconds cache

// CORS configuration
app.use(cors({
    origin: [
        'https://speed-trap-bets-44bx6tzqh-edward-teachs-projects.vercel.app',
        'http://localhost:3000',
        'https://www.speedtrapbets.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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
    console.log('Received request for /api/official-races');
    try {
        const page = parseInt(request.query.page) || 1;
        const pageSize = parseInt(request.query.pageSize) || 10;
        
        const cacheKey = `official-races-${page}-${pageSize}`;
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
            console.log('Returning cached data for official races');
            return response.json(cachedData);
        }
        
        console.log(`Fetching official races (Page: ${page}, PageSize: ${pageSize})`);
        const officialRaces = await iracingApi.getOfficialRaces(page, pageSize);
        console.log(`Retrieved ${officialRaces.races.length} official races`);
        
        cache.set(cacheKey, officialRaces);
        response.json(officialRaces);
    } catch (error) {
        console.error('Error in /api/official-races:', error);
        console.error('Stack trace:', error.stack);
        response.status(500).json({
            error: 'An error occurred while fetching official races',
            details: error.message,
            stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        });
    }
});

// Add a new endpoint to force refresh the cache
app.get('/api/refresh-races', checkAuth, async (request, response) => {
    try {
        const page = 1;
        const pageSize = 10;
        console.log('Forcing refresh of official races data');
        const officialRaces = await iracingApi.getOfficialRaces(page, pageSize);
        const cacheKey = `official-races-${page}-${pageSize}`;
        cache.set(cacheKey, officialRaces);
        response.json({ success: true, message: 'Cache refreshed successfully' });
    } catch (error) {
        console.error('Error refreshing races cache:', error);
        response.status(500).json({
            error: 'An error occurred while refreshing races cache',
            details: error.message,
            stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
        });
    }
});

// Server creation (for both local and production)
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    console.error('Stack trace:', reason.stack);
});

module.exports = app;