const puppeteer = require('puppeteer');
const BaseProvider = require('./BaseProvider');

class MakeMyTripProvider extends BaseProvider {
    constructor() {
        super();
        this.name = 'MakeMyTrip';
        this.baseUrl = 'https://www.makemytrip.com';
        this.debug = process.env.DEBUG === 'true';
    }

    async searchFlights(from, to, departDate, returnDate = null) {
        let browser, page;
        
        try {
            console.log('Launching browser...');
            ({ browser, page } = await this.initBrowser());
            
            console.log(`Navigating to ${this.baseUrl}`);
            await page.goto(`${this.baseUrl}/flights`, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            
            console.log('Current URL:', page.url());
            await this.takeScreenshot(page, 'before-form');
            
            // Handle initial popups
            try {
                console.log('Checking for popups...');
                await page.waitForSelector('[data-cy="closeModal"]', { timeout: 5000 });
                await page.click('[data-cy="closeModal"]');
            } catch (error) {
                console.log('No popup found or already closed');
            }
            
            console.log('Filling search form...');
            
            // Clear and fill origin
            console.log('Setting origin:', from);
            await page.waitForSelector('[data-cy="fromCity"]', { visible: true });
            await page.click('[data-cy="fromCity"]');
            await page.keyboard.type(from);
            await page.waitForTimeout(2000);
            await page.keyboard.press('Enter');
            
            // Clear and fill destination
            console.log('Setting destination:', to);
            await page.waitForSelector('[data-cy="toCity"]', { visible: true });
            await page.click('[data-cy="toCity"]');
            await page.keyboard.type(to);
            await page.waitForTimeout(2000);
            await page.keyboard.press('Enter');
            
            // Fill departure date
            console.log('Setting departure date:', departDate);
            await page.waitForSelector('[data-cy="departureDate"]', { visible: true });
            await page.click('[data-cy="departureDate"]');
            await page.keyboard.type(departDate);
            await page.keyboard.press('Enter');
            
            if (returnDate) {
                console.log('Setting return date:', returnDate);
                await page.waitForSelector('[data-cy="returnDate"]', { visible: true });
                await page.click('[data-cy="returnDate"]');
                await page.keyboard.type(returnDate);
                await page.keyboard.press('Enter');
            }
            
            await this.takeScreenshot(page, 'after-form');
            
            console.log('Submitting search...');
            await page.click('[data-cy="search"]');
            
            // Wait for results
            console.log('Waiting for results...');
            await page.waitForSelector('[data-cy="flightResults"]', {
                timeout: 60000
            });
            
            await page.waitForTimeout(5000);
            await this.takeScreenshot(page, 'search-results');
            
            console.log('Extracting flight information...');
            const flights = await page.evaluate(() => {
                const flightCards = document.querySelectorAll('[data-cy="flightItem"]');
                return Array.from(flightCards).map(card => {
                    try {
                        return {
                            airline: card.querySelector('[data-cy="airlineName"]')?.textContent?.trim(),
                            flightNumber: card.querySelector('[data-cy="flightNumber"]')?.textContent?.trim(),
                            departureTime: card.querySelector('[data-cy="departureTime"]')?.textContent?.trim(),
                            arrivalTime: card.querySelector('[data-cy="arrivalTime"]')?.textContent?.trim(),
                            duration: card.querySelector('[data-cy="duration"]')?.textContent?.trim(),
                            basePrice: parseFloat(
                                card.querySelector('[data-cy="price"]')
                                    ?.textContent
                                    ?.replace(/[^0-9.]/g, '')
                            ) || 0,
                            stops: card.querySelector('[data-cy="stops"]')?.textContent?.trim() || 'Direct'
                        };
                    } catch (error) {
                        console.error('Error parsing flight card:', error);
                        return null;
                    }
                }).filter(flight => flight !== null);
            });

            console.log(`Found ${flights.length} flights`);
            
            if (this.debug) {
                console.log('Debug mode: keeping browser open for inspection');
                await page.waitForTimeout(30000);
            }
            
            return flights;
            
        } catch (error) {
            return await this.handleError(error, page);
        } finally {
            await this.closeBrowser(browser, page);
        }
    }

    async getOffers() {
        let browser, page;
        
        try {
            console.log('Launching browser...');
            ({ browser, page } = await this.initBrowser());
            
            console.log(`Navigating to ${this.baseUrl}/offers/flights`);
            await page.goto(`${this.baseUrl}/offers/flights`, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            
            await page.waitForSelector('[data-cy="offerCard"]');
            
            const offers = await page.evaluate(() => {
                const offerElements = document.querySelectorAll('[data-cy="offerCard"]');
                return Array.from(offerElements).map(offer => ({
                    title: offer.querySelector('[data-cy="offerTitle"]')?.textContent?.trim(),
                    code: offer.querySelector('[data-cy="promoCode"]')?.textContent?.trim(),
                    description: offer.querySelector('[data-cy="offerDescription"]')?.textContent?.trim(),
                    discountType: offer.querySelector('[data-cy="discountType"]')?.textContent?.trim(),
                    discountValue: offer.querySelector('[data-cy="discountValue"]')?.textContent?.trim(),
                    bankName: offer.querySelector('[data-cy="bankName"]')?.textContent?.trim()
                }));
            });

            console.log(`Found ${offers.length} offers`);
            
            if (this.debug) {
                console.log('Debug mode: keeping browser open for inspection');
                await page.waitForTimeout(30000);
            }
            
            return offers;
            
        } catch (error) {
            return await this.handleError(error, page);
        } finally {
            await this.closeBrowser(browser, page);
        }
    }

    calculateBestPrice(basePrice, offers) {
        let bestPrice = basePrice;
        let appliedOffer = null;

        for (const offer of offers) {
            let discountAmount = 0;
            
            if (!offer || !offer.discountType || !offer.discountValue) {
                continue;
            }
            
            const discountValue = parseFloat(offer.discountValue);
            if (isNaN(discountValue)) {
                continue;
            }
            
            if (offer.discountType.toLowerCase().includes('percent')) {
                discountAmount = basePrice * (discountValue / 100);
            } else if (offer.discountType.toLowerCase().includes('flat')) {
                discountAmount = discountValue;
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
            appliedOffer: appliedOffer,
            savings: basePrice - bestPrice
        };
    }
}

module.exports = MakeMyTripProvider;
