const puppeteer = require('puppeteer');

class BaseProvider {
    constructor() {
        if (this.constructor === BaseProvider) {
            throw new Error('Abstract class cannot be instantiated');
        }
        this.debug = process.env.DEBUG === 'true';
    }

    async initBrowser() {
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: { width: 1280, height: 800 },
            args: [
                '--start-maximized',
                '--disable-notifications',
                '--no-sandbox'
            ]
        });
        
        const page = await browser.newPage();
        page.setDefaultTimeout(30000);
        page.on('console', msg => console.log('Browser Console:', msg.text()));
        
        return { browser, page };
    }

    async takeScreenshot(page, name) {
        try {
            await page.screenshot({
                path: `${this.name.toLowerCase()}-${name}.png`,
                fullPage: true
            });
        } catch (error) {
            console.error(`Failed to take screenshot ${name}:`, error);
        }
    }

    async closeBrowser(browser, page) {
        if (!this.debug && browser) {
            console.log('Closing browser...');
            await page?.waitForTimeout(5000);
            await browser.close();
        }
    }

    async handleError(error, page) {
        console.error(`Error in ${this.name}:`, error);
        if (page) {
            await this.takeScreenshot(page, `error-${Date.now()}`);
        }
        return [];
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

    // Abstract methods that must be implemented by child classes
    async searchFlights(from, to, departDate, returnDate = null) {
        throw new Error('Method must be implemented');
    }

    async getOffers() {
        throw new Error('Method must be implemented');
    }
}

module.exports = BaseProvider;
