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
        let browser;
        let page;
        
        try {
            console.log('Launching browser...');
            browser = await puppeteer.launch({
                headless: false,
                defaultViewport: { width: 1280, height: 800 },
                args: [
                    '--start-maximized',
                    '--disable-notifications',
                    '--no-sandbox'
                ]
            });
            
            page = await browser.newPage();
            
            // Set a reasonable timeout
            page.setDefaultTimeout(30000);
            
            // Enable console logging from the page
            page.on('console', msg => console.log('Browser Console:', msg.text()));
            
            console.log(`Navigating to ${this.baseUrl}`);
            await page.goto(`${this.baseUrl}/flights`, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            
            // Log the current URL
            console.log('Current URL:', page.url());
            
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
            
            // Take a screenshot before filling the form
            await page.screenshot({ path: 'before-form.png', fullPage: true });
            
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
            
            // Take a screenshot after filling the form
            await page.screenshot({ path: 'after-form.png', fullPage: true });
            
            console.log('Submitting search...');
            await page.click('[data-testid="search-button"]');
            
            // Wait for results with a more reliable selector
            console.log('Waiting for results...');
            await page.waitForSelector('[data-testid="flight-cards"]', {
                timeout: 60000 // Increase timeout for flight results
            });
            
            // Add a small delay to ensure all results are loaded
            await page.waitForTimeout(5000);
            
            // Take a screenshot of the results
            await page.screenshot({ path: 'search-results.png', fullPage: true });
            
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
            
            // In debug mode, keep the browser open for inspection
            if (this.debug) {
                console.log('Debug mode: keeping browser open for inspection');
                await page.waitForTimeout(30000); // Keep open for 30 seconds
            }
            
            return flights;
            
        } catch (error) {
            console.error(`Error searching flights on ${this.name}:`, error);
            // Take a screenshot on error for debugging
            if (page) {
                try {
                    await page.screenshot({
                        path: `error-${this.name}-${Date.now()}.png`,
                        fullPage: true
                    });
                } catch (screenshotError) {
                    console.error('Failed to take error screenshot:', screenshotError);
                }
            }
            return [];
        } finally {
            if (!this.debug && browser) {
                console.log('Closing browser...');
                await page.waitForTimeout(5000); // Wait 5 seconds before closing
                await browser.close();
            }
        }
    }

    async getOffers() {
        let browser;
        let page;
        
        try {
            console.log('Launching browser...');
            browser = await puppeteer.launch({
                headless: false,
                defaultViewport: { width: 1280, height: 800 },
                args: [
                    '--start-maximized',
                    '--disable-notifications',
                    '--no-sandbox'
                ]
            });
            
            page = await browser.newPage();
            
            console.log(`Navigating to ${this.baseUrl}/offers`);
            
            await page.goto(`${this.baseUrl}/offers`, {
                waitUntil: 'networkidle0',
                timeout: 60000
            });
            
            await page.waitForSelector('.offerCard');
            
            const offers = await page.evaluate(() => {
                const offerCards = document.querySelectorAll('.offerCard');
                return Array.from(offerCards).map(card => {
                    try {
                        return {
                            title: card.querySelector('.offer-title')?.textContent?.trim(),
                            code: card.querySelector('.offer-code')?.textContent?.trim(),
                            description: card.querySelector('.offer-description')?.textContent?.trim(),
                            discountType: card.querySelector('.discount-type')?.textContent?.trim(),
                            discountValue: card.querySelector('.discount-value')?.textContent?.trim(),
                            bankName: card.querySelector('.bank-name')?.textContent?.trim()
                        };
                    } catch (error) {
                        console.error('Error parsing offer card:', error);
                        return null;
                    }
                }).filter(offer => offer !== null);
            });

            console.log(`Found ${offers.length} offers`);
            
            // In debug mode, keep the browser open for inspection
            if (this.debug) {
                console.log('Debug mode: keeping browser open for inspection');
                await page.waitForTimeout(30000); // Keep open for 30 seconds
            }
            
            return offers;
            
        } catch (error) {
            console.error(`Error fetching offers from ${this.name}:`, error);
            // Take a screenshot on error for debugging
            if (page) {
                try {
                    await page.screenshot({
                        path: `error-${this.name}-${Date.now()}.png`,
                        fullPage: true
                    });
                } catch (screenshotError) {
                    console.error('Failed to take error screenshot:', screenshotError);
                }
            }
            return [];
        } finally {
            if (!this.debug && browser) {
                console.log('Closing browser...');
                await page.waitForTimeout(5000); // Wait 5 seconds before closing
                await browser.close();
            }
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
