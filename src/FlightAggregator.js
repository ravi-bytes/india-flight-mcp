const MakeMyTripProvider = require('./providers/MakeMyTripProvider');
const CleartripProvider = require('./providers/CleartripProvider');
const EaseMyTripProvider = require('./providers/EaseMyTripProvider');
const YatraProvider = require('./providers/YatraProvider');
const GoibiboProvider = require('./providers/GoibiboProvider');
const HappyFaresProvider = require('./providers/HappyFaresProvider');

class FlightAggregator {
    constructor() {
        // For testing, only use Cleartrip provider
        this.providers = [
            new CleartripProvider()
        ];
        
        // Uncomment below to use all providers
        /*
        this.providers = [
            new MakeMyTripProvider(),
            new CleartripProvider(),
            new EaseMyTripProvider(),
            new YatraProvider(),
            new GoibiboProvider(),
            new HappyFaresProvider()
        ];
        */
    }

    async searchAllProviders(from, to, departDate, returnDate = null) {
        const results = [];
        const searchPromises = this.providers.map(async provider => {
            try {
                console.log(`Searching flights on ${provider.name}...`);
                const flights = await provider.searchFlights(from, to, departDate, returnDate);
                console.log(`Getting offers from ${provider.name}...`);
                const offers = await provider.getOffers();
                
                console.log(`Processing ${flights.length} flights from ${provider.name}`);
                for (const flight of flights) {
                    const priceDetails = provider.calculateBestPrice(flight.basePrice, offers);
                    results.push({
                        provider: provider.name,
                        flight,
                        priceDetails,
                        offers: offers.length > 0 ? offers : null
                    });
                }
            } catch (error) {
                console.error(`Error with provider ${provider.name}:`, error);
            }
        });

        // Run all provider searches in parallel
        await Promise.all(searchPromises);

        // Sort results by best price
        return results.sort((a, b) => a.priceDetails.bestPrice - b.priceDetails.bestPrice);
    }
}

module.exports = FlightAggregator;
