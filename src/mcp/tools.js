const FlightAggregator = require('../FlightAggregator');

const aggregator = new FlightAggregator();

const tools = {
    searchFlights: {
        name: 'searchFlights',
        description: 'Search for flights across multiple Indian travel websites',
        parameters: {
            type: 'object',
            properties: {
                from: {
                    type: 'string',
                    description: 'Origin airport code (e.g., DEL for Delhi)'
                },
                to: {
                    type: 'string',
                    description: 'Destination airport code (e.g., BOM for Mumbai)'
                },
                departDate: {
                    type: 'string',
                    description: 'Departure date in YYYY-MM-DD format'
                },
                returnDate: {
                    type: 'string',
                    description: 'Optional return date in YYYY-MM-DD format for round trips'
                }
            },
            required: ['from', 'to', 'departDate']
        },
        async handler(params) {
            const results = await aggregator.searchAllProviders(
                params.from,
                params.to,
                params.departDate,
                params.returnDate
            );
            return {
                success: true,
                results
            };
        }
    },

    getAirportCodes: {
        name: 'getAirportCodes',
        description: 'Get a list of supported Indian airport codes and their cities',
        parameters: {
            type: 'object',
            properties: {}
        },
        handler() {
            return {
                airports: [
                    { code: 'DEL', city: 'Delhi', name: 'Indira Gandhi International Airport' },
                    { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji Maharaj International Airport' },
                    { code: 'BLR', city: 'Bangalore', name: 'Kempegowda International Airport' },
                    { code: 'MAA', city: 'Chennai', name: 'Chennai International Airport' },
                    { code: 'HYD', city: 'Hyderabad', name: 'Rajiv Gandhi International Airport' },
                    { code: 'CCU', city: 'Kolkata', name: 'Netaji Subhas Chandra Bose International Airport' }
                ]
            };
        }
    }
};

module.exports = tools;
