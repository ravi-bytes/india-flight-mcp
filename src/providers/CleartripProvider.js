const puppeteer = require('puppeteer');
const BaseProvider = require('./BaseProvider');

class CleartripProvider extends BaseProvider {
    constructor() {
        super();
        this.name = 'Cleartrip';
        this.baseUrl = 'https://www.cleartrip.com';
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
            
            // Wait for and handle any cookie consent popup
            try {
                console.log('Checking for cookie popup...');
                const cookiePopup = await page.$('[data-testid="accept-cookie-banner"]');
                if (cookiePopup) {
                    console.log('Found cookie popup, accepting...');
                    await cookiePopup.click();
                    await page.waitForTimeout(1000);
                }
            } catch (error) {
                console.log('No cookie popup found or already accepted');
            }

            console.log('Filling search form...');
            
            // Clear and fill origin
            console.log('Setting origin:', from);
            await page.waitForSelector('[data-testid="from-city"]', { visible: true });
            await page.click('[data-testid="from-city"]');
            await page.keyboard.type(from);
            await page.waitForTimeout(2000);
            await page.keyboard.press('Enter');
            
            // Clear and fill destination
            console.log('Setting destination:', to);
            await page.waitForSelector('[data-testid="to-city"]', { visible: true });
            await page.click('[data-testid="to-city"]');
            await page.keyboard.type(to);
            await page.waitForTimeout(2000);
            await page.keyboard.press('Enter');
            
            // Fill departure date
            console.log('Setting departure date:', departDate);
            await page.waitForSelector('[data-testid="depart-date"]', { visible: true });
            await page.click('[data-testid="depart-date"]');
            await page.keyboard.type(departDate);
            await page.keyboard.press('Enter');
            
            if (returnDate) {
                console.log('Setting return date:', returnDate);
                await page.waitForSelector('[data-testid="return-date"]', { visible: true });
                await page.click('[data-testid="return-date"]');
                await page.keyboard.type(returnDate);
                await page.keyboard.press('Enter');
            }
            
            await this.takeScreenshot(page, 'after-form');
            
            console.log('Submitting search...');
            await page.click('[data-testid="search-button"]');
            
            // Wait for results
            console.log('Waiting for results...');
            await page.waitForSelector('[data-testid="flight-cards"]', {
                timeout: 60000
            });
            
            await page.waitForTimeout(5000);
            await this.takeScreenshot(page, 'search-results');
            
            console.log('Extracting flight information...');
            const flights = await page.evaluate(() => {
                const flightCards = document.querySelectorAll('[data-testid="flight-cards"] > div');
                return Array.from(flightCards).map(card => {
                    try {
                        return {
                            airline: card.querySelector('[data-testid="airline-name"]')?.textContent?.trim(),
                            flightNumber: card.querySelector('[data-testid="flight-number"]')?.textContent?.trim(),
                            departureTime: card.querySelector('[data-testid="departure-time"]')?.textContent?.trim(),
                            arrivalTime: card.querySelector('[data-testid="arrival-time"]')?.textContent?.trim(),
                            duration: card.querySelector('[data-testid="duration"]')?.textContent?.trim(),
                            basePrice: parseFloat(
                                card.querySelector('[data-testid="price"]')
                                    ?.textContent
                                    ?.replace(/[^0-9.]/g, '')
                            ) || 0,
                            stops: card.querySelector('[data-testid="stops"]')?.textContent?.trim() || 'Direct'
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
            
            console.log(`Navigating to ${this.baseUrl}/offers`);
            await page.goto(`${this.baseUrl}/offers`, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            
            await page.waitForSelector('.offerCard');
            
            const offers = await page.evaluate(() => {
                const offerElements = document.querySelectorAll('.offerCard');
                return Array.from(offerElements).map(offer => ({
                    title: offer.querySelector('.offerTitle')?.textContent?.trim(),
                    code: offer.querySelector('.promoCode')?.textContent?.trim(),
                    description: offer.querySelector('.offerDescription')?.textContent?.trim(),
                    discountType: offer.querySelector('.discountType')?.textContent?.trim(),
                    discountValue: offer.querySelector('.discountValue')?.textContent?.trim(),
                    bankName: offer.querySelector('.bankName')?.textContent?.trim()
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

module.exports = CleartripProvider;
