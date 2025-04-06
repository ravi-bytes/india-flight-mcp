const puppeteer = require('puppeteer');
const BaseProvider = require('./BaseProvider');

class GoibiboProvider extends BaseProvider {
    constructor() {
        super();
        this.name = 'Goibibo';
        this.baseUrl = 'https://www.goibibo.com';
    }

    async searchFlights(from, to, departDate, returnDate = null) {
        const browser = await puppeteer.launch({ headless: "new" });
        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 800 });
            
            await page.goto(`${this.baseUrl}/flights`);
            
            // Fill search form
            await page.type('input[data-testid="fromCity"]', from);
            await page.type('input[data-testid="toCity"]', to);
            await page.type('input[data-testid="departureDate"]', departDate);
            
            if (returnDate) {
                await page.type('input[data-testid="returnDate"]', returnDate);
            }
            
            await page.click('button[data-testid="searchFlights"]');
            
            // Wait for results
            await page.waitForSelector('[data-testid="flight-list"]');
            
            const flights = await page.evaluate(() => {
                const flightItems = document.querySelectorAll('[data-testid="flight-list"] > div');
                return Array.from(flightItems).map(item => ({
                    airline: item.querySelector('[data-testid="airline-name"]')?.textContent,
                    flightNumber: item.querySelector('[data-testid="flight-number"]')?.textContent,
                    departureTime: item.querySelector('[data-testid="departure-time"]')?.textContent,
                    arrivalTime: item.querySelector('[data-testid="arrival-time"]')?.textContent,
                    duration: item.querySelector('[data-testid="duration"]')?.textContent,
                    basePrice: parseFloat(item.querySelector('[data-testid="price-value"]')?.textContent.replace(/[^0-9.]/g, '')) || 0
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
            await page.goto(`${this.baseUrl}/offers/flights`);
            
            await page.waitForSelector('.offerCardContainer');
            
            const offers = await page.evaluate(() => {
                const offerElements = document.querySelectorAll('.offerCardContainer');
                return Array.from(offerElements).map(offer => ({
                    title: offer.querySelector('.offerTitle')?.textContent,
                    code: offer.querySelector('.promoCode')?.textContent,
                    description: offer.querySelector('.offerDescription')?.textContent,
                    discountType: offer.querySelector('.discountType')?.textContent,
                    discountValue: offer.querySelector('.discountValue')?.textContent,
                    bankName: offer.querySelector('.bankName')?.textContent
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

module.exports = GoibiboProvider;
