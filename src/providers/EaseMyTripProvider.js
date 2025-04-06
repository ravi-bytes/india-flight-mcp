const puppeteer = require('puppeteer');
const BaseProvider = require('./BaseProvider');

class EaseMyTripProvider extends BaseProvider {
    constructor() {
        super();
        this.name = 'EaseMyTrip';
        this.baseUrl = 'https://www.easemytrip.com';
    }

    async searchFlights(from, to, departDate, returnDate = null) {
        const browser = await puppeteer.launch({ headless: "new" });
        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            
            await page.goto(`${this.baseUrl}/flight/flight-search`);
            
            // Fill search form
            await page.type('#FromSector', from);
            await page.type('#Editbox13', to);
            await page.type('#ddate', departDate);
            
            if (returnDate) {
                await page.click('#rdate');
                await page.type('#rdate', returnDate);
            }
            
            await page.click('#search');
            
            // Wait for results
            await page.waitForSelector('.flight-list');
            
            const flights = await page.evaluate(() => {
                const flightItems = document.querySelectorAll('.flight-list .flt-row');
                return Array.from(flightItems).map(item => ({
                    airline: item.querySelector('.airline-name')?.textContent,
                    flightNumber: item.querySelector('.flight-number')?.textContent,
                    departureTime: item.querySelector('.departure-time')?.textContent,
                    arrivalTime: item.querySelector('.arrival-time')?.textContent,
                    duration: item.querySelector('.duration')?.textContent,
                    basePrice: parseFloat(item.querySelector('.price-amount')?.textContent.replace(/[^0-9.]/g, '')) || 0
                }));
            });

            return flights;
        } catch (error) {
            console.error(`Error searching flights on ${this.name}:`, error);
            return [];
        } finally {
            await browser.close();
        }
    }

    async getOffers() {
        const browser = await puppeteer.launch({ headless: "new" });
        try {
            const page = await browser.newPage();
            await page.goto(`${this.baseUrl}/offers`);
            
            await page.waitForSelector('.offer-container');
            
            const offers = await page.evaluate(() => {
                const offerElements = document.querySelectorAll('.offer-container .offer-item');
                return Array.from(offerElements).map(offer => ({
                    title: offer.querySelector('.offer-title')?.textContent,
                    code: offer.querySelector('.promo-code')?.textContent,
                    description: offer.querySelector('.offer-description')?.textContent,
                    discountType: offer.querySelector('.discount-type')?.textContent,
                    discountValue: offer.querySelector('.discount-value')?.textContent,
                    bankName: offer.querySelector('.bank-name')?.textContent
                }));
            });

            return offers;
        } catch (error) {
            console.error(`Error fetching offers from ${this.name}:`, error);
            return [];
        } finally {
            await browser.close();
        }
    }

    calculateBestPrice(basePrice, offers) {
        let bestPrice = basePrice;
        let appliedOffer = null;

        for (const offer of offers) {
            let discountAmount = 0;
            
            if (offer.discountType?.toLowerCase().includes('percent')) {
                discountAmount = basePrice * (parseFloat(offer.discountValue) / 100);
            } else if (offer.discountType?.toLowerCase().includes('flat')) {
                discountAmount = parseFloat(offer.discountValue);
            }
            
            const priceAfterDiscount = basePrice - discountAmount;
            
            if (priceAfterDiscount < bestPrice) {
                bestPrice = priceAfterDiscount;
                appliedOffer = offer;
            }
        }

        return {
            originalPrice: basePrice,
            bestPrice: bestPrice,
            appliedOffer: appliedOffer
        };
    }
}

module.exports = EaseMyTripProvider;
