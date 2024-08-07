const express = require('express');
const cors = require('cors');
const timeout = require('connect-timeout');
const IracingApi = require('./iRacingApi');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(timeout('30s'));
app.use(haltOnTimedout);

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
    // ... (existing code)
});

app.get('/api/official-races', checkAuth, async (request, response) => {
    try {
        console.log('Fetching official races');
        const officialRaces = await iracingApi.getOfficialRaces();
        console.log(`Retrieved ${officialRaces.length} official races`);
        console.log('First race:', JSON.stringify(officialRaces[0], null, 2));
        response.json(officialRaces);
    } catch (error) {
        console.error('Error fetching official races:', error);
        console.error('Error stack:', error.stack);
        response.status(500).json({
            error: 'An error occurred while fetching official races',
            details: error.message,
            stack: error.stack
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

function haltOnTimedout(req, res, next) {
    if (!req.timedout) next();
}

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