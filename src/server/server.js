const express = require('express');
const cors = require('cors');
const IracingApi = require('./iRacingApi');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 }); // 1 minute cache, check every 2 minutes

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
        // Implement a retry mechanism here
    }
})();

// Middleware to check authentication
const checkAuth = (req, res, next) => {
    if (!isAuthenticated) {
        return res.status(503).json({ error: 'iRacing API not authenticated' });
    }
    next();
};

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        authenticated: isAuthenticated,
        serverTime: new Date().toISOString()
    });
});

app.get('/api/search-driver', checkAuth, async (request, response) => {
    try {
        const searchTerm = request.query.searchTerm;
        const cacheKey = `driver-search-${searchTerm}`;
        const cachedResult = cache.get(cacheKey);

        if (cachedResult) {
            return response.json(cachedResult);
        }

        const data = await iracingApi.searchDrivers(searchTerm);
        
        const result = Array.isArray(data) && data.length > 0
            ? { found: true, driver: data[0] }
            : { found: false };

        cache.set(cacheKey, result);
        response.json(result);
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
        
        const cacheKey = `official-races-${page}-${pageSize}`;
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
            return response.json(cachedData);
        }
        
        const officialRaces = await iracingApi.getOfficialRaces(page, pageSize);
        
        cache.set(cacheKey, officialRaces);
        response.json(officialRaces);
    } catch (error) {
        console.error('Error in /api/official-races:', error);
        response.status(500).json({
            error: 'An error occurred while fetching official races',
            details: error.message
        });
    }
});

app.get('/api/refresh-races', checkAuth, async (request, response) => {
    try {
        const page = 1;
        const pageSize = 10;
        const officialRaces = await iracingApi.getOfficialRaces(page, pageSize);
        const cacheKey = `official-races-${page}-${pageSize}`;
        cache.set(cacheKey, officialRaces);
        response.json({ success: true, message: 'Cache refreshed successfully' });
    } catch (error) {
        console.error('Error refreshing races cache:', error);
        response.status(500).json({
            error: 'An error occurred while refreshing races cache',
            details: error.message
        });
    }
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;