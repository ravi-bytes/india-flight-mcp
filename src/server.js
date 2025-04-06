const express = require('express');
const moment = require('moment');
const FlightAggregator = require('./FlightAggregator');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const aggregator = new FlightAggregator();

// Test endpoint to verify server is running
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Flight MCP Server is running',
        endpoints: {
            search: '/api/search-flights',
            test: '/api/test'
        }
    });
});

// Test endpoint with sample data
app.get('/api/test', (req, res) => {
    res.json({
        message: 'Test endpoint',
        usage: {
            endpoint: '/api/search-flights',
            method: 'POST',
            body: {
                from: 'DEL',
                to: 'BOM',
                departDate: '2025-04-20',
                returnDate: '2025-04-25' // Optional
            }
        }
    });
});

// GET endpoint for flight search (for testing in browser)
app.get('/api/search-flights', (req, res) => {
    res.json({
        error: 'Please use POST method for flight search',
        usage: {
            method: 'POST',
            contentType: 'application/json',
            body: {
                from: 'DEL',
                to: 'BOM',
                departDate: '2025-04-20',
                returnDate: '2025-04-25' // Optional
            }
        }
    });
});

// Main search endpoint
app.post('/api/search-flights', async (req, res) => {
    try {
        const { from, to, departDate, returnDate } = req.body;

        // Validate required fields
        if (!from || !to || !departDate) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters',
                required: ['from', 'to', 'departDate'],
                received: req.body
            });
        }

        // Validate dates
        const depart = moment(departDate);
        const return_ = returnDate ? moment(returnDate) : null;

        if (!depart.isValid()) {
            return res.status(400).json({
                success: false,
                error: 'Invalid departure date format',
                expected: 'YYYY-MM-DD',
                received: departDate
            });
        }

        if (returnDate && !return_.isValid()) {
            return res.status(400).json({
                success: false,
                error: 'Invalid return date format',
                expected: 'YYYY-MM-DD',
                received: returnDate
            });
        }

        // Validate that departure date is not in the past
        if (depart.isBefore(moment().startOf('day'))) {
            return res.status(400).json({
                success: false,
                error: 'Departure date cannot be in the past',
                received: departDate
            });
        }

        // For round trips, validate return date is after departure
        if (return_ && return_.isBefore(depart)) {
            return res.status(400).json({
                success: false,
                error: 'Return date must be after departure date',
                departDate,
                returnDate
            });
        }

        // Search flights across all providers
        const results = await aggregator.searchAllProviders(
            from,
            to,
            departDate,
            returnDate
        );

        res.json({
            success: true,
            query: {
                from,
                to,
                departDate,
                returnDate
            },
            resultsCount: results.length,
            results
        });
    } catch (error) {
        console.error('Error searching flights:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Error handling for invalid routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        availableEndpoints: {
            search: '/api/search-flights',
            test: '/api/test'
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

app.listen(port, () => {
    console.log(`Flight MCP Server running on port ${port}`);
});
