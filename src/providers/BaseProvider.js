class BaseProvider {
    constructor() {
        if (this.constructor === BaseProvider) {
            throw new Error('Abstract class cannot be instantiated');
        }
    }

    async searchFlights(from, to, departDate, returnDate = null) {
        throw new Error('Method must be implemented');
    }

    async getOffers() {
        throw new Error('Method must be implemented');
    }

    calculateBestPrice(basePrice, offers) {
        throw new Error('Method must be implemented');
    }
}

module.exports = BaseProvider;
