const express = require('express');
const cors = require('cors');
const IracingApi = require('./iRacingApi'); // Ensure the path is correct
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let rateLimit;
try {
    rateLimit = require("express-rate-limit");
    console.log('express-rate-limit module loaded successfully.');
} catch (error) {
    console.warn("express-rate-limit module not found. Rate limiting will be disabled.");
}

const app = express();

const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

app.use(cors({
    origin: [
        'https://speed-trap-bets-44bx6tzqh-edward-teachs-projects.vercel.app',
        'http://localhost:3000',
        'https://www.speedtrapbets.com'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

console.log('CORS middleware has been successfully applied to the application.');

const iracingApi = new IracingApi(); // Correct instantiation of the IracingApi class

let isAuthenticated = false;

function logError(error, req = null) {
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    const logFile = path.join(logDir, 'error.log');
    const timestamp = new Date().toISOString();
    let logEntry = `${timestamp}: ${error.stack}\n`;
    if (req) {
        logEntry += `Request Details: ${req.method} ${req.url}\n`;
    }
    fs.appendFileSync(logFile, logEntry);
}

(async function authenticateIRacing() {
    try {
        console.log('Attempting to authenticate with iRacing API...');
        await iracingApi.login(process.env.IRACING_USERNAME, process.env.IRACING_PASSWORD);
        console.log('Authentication with iRacing API was successful.');
        isAuthenticated = true;
        iracingApi.startAuthTokenRefresh(); // Start the automatic token refresh process
    } catch (error) {
        console.error('Authentication with iRacing API failed:', error);
        logError(error);
        console.log('Retrying authentication in 60 seconds...');
        setTimeout(authenticateIRacing, 60000);
    }
})();

const checkAuth = (req, res, next) => {
    if (!isAuthenticated) {
        console.log('Authentication check failed. API is not authenticated.');
        return res.status(503).json({ error: 'iRacing API is not authenticated. Please try again later.' });
    }
    console.log('Authentication check passed. Proceeding with the request.');
    next();
};

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - Received ${req.method} request for ${req.url} from ${req.ip}`);
    next();
});

if (rateLimit) {
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: "Too many requests from this IP, please try again after 15 minutes"
    });
    app.use(apiLimiter);
    console.log('Rate limiting has been applied to all requests.');
} else {
    console.log('Rate limiting is disabled due to missing express-rate-limit module.');
}

app.get('/health', (req, res) => {
    console.log('Health check requested.');
    res.json({
        status: 'ok',
        authenticated: isAuthenticated,
        serverTime: new Date().toISOString()
    });
    console.log('Health check response sent.');
});

app.get('/api/search-driver', checkAuth, async (request, response) => {
    try {
        const searchTerm = request.query.searchTerm;
        console.log(`Driver search requested for term: "${searchTerm}"`);
        
        const cacheKey = `driver-search-${searchTerm}`;
        const cachedResult = cache.get(cacheKey);

        if (cachedResult) {
            console.log('Returning cached driver search result.');
            return response.json(cachedResult);
        }

        console.log(`Searching for driver with term: "${searchTerm}"`);
        const data = await iracingApi.searchDrivers(searchTerm);
        
        const result = Array.isArray(data) && data.length > 0
            ? { found: true, driver: data[0] }
            : { found: false };

        cache.set(cacheKey, result);
        console.log('Driver search result cached and returned.');
        response.json(result);
    } catch (error) {
        console.error('Error occurred while searching for driver:', error);
        logError(error, request);
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
        
        console.log('Returning official races data');
        response.json(officialRaces);
    } catch (error) {
        console.error('Error in /api/official-races:', error);
        logError(error, request);
        response.status(500).json({
            error: 'An error occurred while fetching official races',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/refresh-races', checkAuth, async (request, response) => {
    try {
        const page = 1;
        const pageSize = 10;
        console.log('Manual refresh requested by user.');
        const officialRaces = await iracingApi.getOfficialRaces(page, pageSize);
        console.log('Races data refreshed successfully.');
        response.json({ success: true, message: 'Races data refreshed successfully', data: officialRaces });
    } catch (error) {
        console.error('Error occurred while refreshing races data:', error);
        logError(error, request);
        response.status(500).json({
            error: 'An error occurred while refreshing races data',
            details: error.message
        });
    }
});

app.use((err, req, res, next) => {
    console.error('Global error handler caught an unhandled error:', err.stack);
    logError(err, req);
    res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred. Please try again later.' 
            : err.message
    });
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(`Server is now running and listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server...');
    server.close(() => {
        console.log('HTTP server has been closed.');
    });
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection detected. Promise:', promise, 'Reason:', reason);
    logError(new Error('Unhandled Rejection: ' + reason));
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception detected:', error);
    logError(error);
    console.log('Shutting down due to uncaught exception...');
    process.exit(1);
});

module.exports = app;
