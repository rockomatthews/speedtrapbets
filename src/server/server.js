// Import required modules
const express = require('express');
const cors = require('cors');
const IracingApi = require('./iRacingApi');
const NodeCache = require('node-cache');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Attempt to require express-rate-limit, but handle the case where it's not installed
let rateLimit;
try {
    rateLimit = require("express-rate-limit");
    console.log('express-rate-limit module loaded successfully.');
} catch (error) {
    console.warn("express-rate-limit module not found. Rate limiting will be disabled.");
}

// Initialize Express application
const app = express();

// Initialize cache with 1 minute Time-To-Live (TTL) and check every 2 minutes
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// CORS (Cross-Origin Resource Sharing) configuration
// This allows the API to be accessed from specific origins
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

// Log that CORS middleware has been applied
console.log('CORS middleware has been successfully applied to the application.');

// Initialize iRacing API
const iracingApi = new IracingApi();

// Authentication state
let isAuthenticated = false;

// Function for logging errors to a file
function logError(error) {
    // Define the directory for log files
    const logDir = path.join(__dirname, 'logs');
    
    // Create the log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    
    // Define the path for the error log file
    const logFile = path.join(logDir, 'error.log');
    
    // Get the current timestamp
    const timestamp = new Date().toISOString();
    
    // Create the log entry with timestamp and error stack
    const logEntry = `${timestamp}: ${error.stack}\n`;
    
    // Append the log entry to the file
    fs.appendFileSync(logFile, logEntry);
}

// Authenticate with iRacing API at startup
(async function authenticateIRacing() {
    try {
        console.log('Attempting to authenticate with iRacing API...');
        
        // Attempt to log in using environment variables for credentials
        await iracingApi.login(process.env.IRACING_USERNAME, process.env.IRACING_PASSWORD);
        
        console.log('Authentication with iRacing API was successful.');
        isAuthenticated = true;
    } catch (error) {
        console.error('Authentication with iRacing API failed:', error);
        logError(error);
        
        // Implement a retry mechanism
        console.log('Retrying authentication in 60 seconds...');
        setTimeout(authenticateIRacing, 60000); // Retry after 1 minute
    }
})();

// Middleware to check authentication before processing requests
const checkAuth = (req, res, next) => {
    if (!isAuthenticated) {
        console.log('Authentication check failed. API is not authenticated.');
        return res.status(503).json({ error: 'iRacing API is not authenticated. Please try again later.' });
    }
    console.log('Authentication check passed. Proceeding with the request.');
    next();
};

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - Received ${req.method} request for ${req.url}`);
    next();
});

// Apply rate limiting if the module is available
if (rateLimit) {
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: "Too many requests from this IP, please try again after 15 minutes"
    });

    // Apply rate limiting to all requests
    app.use(apiLimiter);
    console.log('Rate limiting has been applied to all requests.');
} else {
    console.log('Rate limiting is disabled due to missing express-rate-limit module.');
}

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested.');
    res.json({
        status: 'ok',
        authenticated: isAuthenticated,
        serverTime: new Date().toISOString()
    });
    console.log('Health check response sent.');
});

// Driver search endpoint
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
        logError(error);
        response.status(500).json({
            error: 'An error occurred while searching for the driver',
            details: error.message
        });
    }
});

// Official races endpoint
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
        logError(error);
        response.status(500).json({
            error: 'An error occurred while fetching official races',
            details: error.message
        });
    }
});

// Refresh races endpoint
app.get('/api/refresh-races', checkAuth, async (request, response) => {
    try {
        const page = 1;
        const pageSize = 10;
        console.log('Refreshing races cache.');
        const officialRaces = await iracingApi.getOfficialRaces(page, pageSize);
        const cacheKey = `official-races-${page}-${pageSize}`;
        cache.set(cacheKey, officialRaces);
        console.log('Races cache refreshed successfully.');
        response.json({ success: true, message: 'Cache refreshed successfully' });
    } catch (error) {
        console.error('Error occurred while refreshing races cache:', error);
        logError(error);
        response.status(500).json({
            error: 'An error occurred while refreshing races cache',
            details: error.message
        });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler caught an unhandled error:', err.stack);
    logError(err);
    res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'production' 
            ? 'An unexpected error occurred. Please try again later.' 
            : err.message
    });
});

// Define the port for the server to listen on
const PORT = process.env.PORT || 3001;

// Start the server
const server = app.listen(PORT, () => {
    console.log(`Server is now running and listening on port ${PORT}`);
});

// Graceful shutdown handler
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server...');
    server.close(() => {
        console.log('HTTP server has been closed.');
    });
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection detected. Promise:', promise, 'Reason:', reason);
    logError(new Error('Unhandled Rejection: ' + reason));
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception detected:', error);
    logError(error);
    // In a production environment, you might want to attempt a graceful shutdown here
    console.log('Shutting down due to uncaught exception...');
    process.exit(1);
});

// Export the app for potential testing or importing in other files
module.exports = app;