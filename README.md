# Indian Flight Search MCP Server

This MCP (Model Context Protocol) server aggregates flight information and deals from major Indian travel websites. It searches multiple providers simultaneously and finds the best prices including ongoing offers and bank deals.

## Supported Travel Websites

- MakeMyTrip
- Cleartrip (coming soon)
- EaseMyTrip (coming soon)
- Yatra (coming soon)
- Goibibo (coming soon)
- HappyFares (coming soon)

## Features

- Search flights across multiple providers
- Find and apply best available offers and bank deals
- Support for one-way and return trips
- Extensible architecture for adding new providers

## Prerequisites

- Node.js 16 or higher
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd india-flight-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will start on port 3000 by default.

## API Usage

### Search Flights

```http
POST /api/search-flights
Content-Type: application/json

{
    "from": "DEL",
    "to": "BOM",
    "departDate": "2025-04-20",
    "returnDate": "2025-04-25"  // Optional for one-way flights
}
```

## Adding New Providers

1. Create a new provider class in `src/providers/`
2. Extend the `BaseProvider` class
3. Implement the required methods:
   - `searchFlights()`
   - `getOffers()`
   - `calculateBestPrice()`
4. Add the new provider to `FlightAggregator.js`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
