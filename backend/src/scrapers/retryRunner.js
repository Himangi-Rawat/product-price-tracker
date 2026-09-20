const env = require('../config/env');
const { scrapeProductOnce } = require('./priceScraper');
const { validateScrapeResult } = require('./validator');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithRetries({ page, productId, expectedName }) {
  const attempts = [];

  for (let attemptNumber = 1; attemptNumber <= env.SCRAPE_MAX_ATTEMPTS; attemptNumber++) {
    const startedAt = Date.now();
    console.log(`  [product ${productId}] attempt ${attemptNumber}/${env.SCRAPE_MAX_ATTEMPTS}: navigating and waiting for price...`);

    try {
      const raw = await scrapeProductOnce({ page, productId });
      const result = validateScrapeResult({
        productId,
        pageProductName: raw.pageProductName,
        expectedName,
        priceRawText: raw.priceRawText,
        stockRawText: raw.stockRawText,
      });

      const durationMs = Date.now() - startedAt;

      if (result.valid) {
        attempts.push({ attemptNumber, status: 'success', errorMessage: null, durationMs });
        console.log(`  [product ${productId}] attempt ${attemptNumber} SUCCEEDED in ${durationMs}ms - price ${result.data.price}`);
        return {
          success: true,
          data: {
            ...result.data,
            mrpRawText: raw.mrpRawText,
            discountRawText: raw.discountRawText,
          },
          attempts,
        };
      }

      attempts.push({ attemptNumber, status: 'failed', errorMessage: result.reason, durationMs });
      console.log(`  [product ${productId}] attempt ${attemptNumber} FAILED (invalid data): ${result.reason}`);
        } catch (err) {
      const durationMs = Date.now() - startedAt;

      try {
        const fs = require('fs');
        if (!fs.existsSync('debug-screenshots')) fs.mkdirSync('debug-screenshots');
        await page.screenshot({ path: `debug-screenshots/product-${productId}-attempt-${attemptNumber}.png` });
      } catch (screenshotErr) {
        console.log(`  [product ${productId}] (could not take debug screenshot: ${screenshotErr.message})`);
      }

      attempts.push({
        attemptNumber,
        status: 'failed',
        errorMessage: err.message || String(err),
        durationMs,
      });
      console.log(`  [product ${productId}] attempt ${attemptNumber} FAILED (error): ${err.message || err}`);
    }

    const isLastAttempt = attemptNumber === env.SCRAPE_MAX_ATTEMPTS;
    if (!isLastAttempt) {
      const delay = env.SCRAPE_RETRY_BASE_DELAY_MS * attemptNumber;
      console.log(`  [product ${productId}] waiting ${delay}ms before retrying...`);
      await sleep(delay);
    }
  }

  console.log(`  [product ${productId}] gave up after ${env.SCRAPE_MAX_ATTEMPTS} attempts.`);
  return { success: false, data: null, attempts };
}

module.exports = { runWithRetries };