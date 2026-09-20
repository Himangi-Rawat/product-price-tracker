const supabase = require('../db/supabaseClient');
const { openBrowserPage } = require('./browser');
const { runWithRetries } = require('./retryRunner');
const { parsePrice } = require('./validator');

async function saveAttemptLogs(trackedProductId, attempts) {
    const now = Date.now();

  let cursor = now;
  const withTimestamps = [...attempts].reverse().map((a) => {
    const attemptedAt = new Date(cursor).toISOString();
    cursor -= a.durationMs;
    return { ...a, attemptedAt };
  }).reverse();

  const rows = withTimestamps.map((a) => ({
    tracked_product_id: trackedProductId,
    status: a.status,
    attempt_number: a.attemptNumber,
    error_message: a.errorMessage,
    duration_ms: a.durationMs,
    attempted_at: a.attemptedAt,
  }));

  const { error } = await supabase.from('scrape_logs').insert(rows);
  if (error) {
    console.error(`Failed to write scrape_logs for tracked_product_id=${trackedProductId}:`, error.message);
  }
}

async function savePriceHistory(trackedProductId, data) {
  const mrp = data.mrpRawText ? parsePrice(data.mrpRawText) : null;
  const discountMatch = data.discountRawText ? data.discountRawText.match(/\d+/) : null;

  const { error } = await supabase.from('price_history').insert({
    tracked_product_id: trackedProductId,
    price: data.price,
    mrp: mrp,
    discount_percent: discountMatch ? parseFloat(discountMatch[0]) : null,
    stock_count: data.stockCount,
    stock_raw_text: data.stockRawText,
  });

  if (error) {
    throw new Error(`Failed to write price_history: ${error.message}`);
  }
}

async function scrapeAndSaveOne({ page, trackedProduct }) {
  const { success, data, attempts } = await runWithRetries({
    page,
    productId: trackedProduct.product_id,
    expectedName: trackedProduct.name,
  });

  await saveAttemptLogs(trackedProduct.id, attempts);

  if (success) {
    await savePriceHistory(trackedProduct.id, data);
  }

  return {
    trackedProductId: trackedProduct.id,
    productId: trackedProduct.product_id,
    name: trackedProduct.name,
    success,
    attemptCount: attempts.length,
    finalError: success ? null : attempts[attempts.length - 1]?.errorMessage || 'Unknown failure',
  };
}

async function scrapeAllActiveProducts() {
  const { data: trackedProducts, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('is_active', true);

  if (error) {
    throw new Error(`Could not load tracked products: ${error.message}`);
  }

  if (!trackedProducts || trackedProducts.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  const { browser, page } = await openBrowserPage({ headed: false });
  const results = [];

  try {
    for (const trackedProduct of trackedProducts) {
      try {
        const result = await scrapeAndSaveOne({ page, trackedProduct });
        results.push(result);
      } catch (err) {
        console.error(`Unexpected error scraping tracked_product_id=${trackedProduct.id}:`, err.message);
        results.push({
          trackedProductId: trackedProduct.id,
          productId: trackedProduct.product_id,
          name: trackedProduct.name,
          success: false,
          attemptCount: 0,
          finalError: err.message,
        });
      }
    }
  } finally {
    await browser.close();
  }

  const succeeded = results.filter((r) => r.success).length;

  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}

async function scrapeSingleTrackedProduct(trackedProductId) {
  const { data: trackedProduct, error } = await supabase
    .from('tracked_products')
    .select('*')
    .eq('id', trackedProductId)
    .single();

  if (error || !trackedProduct) {
    throw new Error('Tracked product not found');
  }

  const { browser, page } = await openBrowserPage({ headed: false });
  try {
    return await scrapeAndSaveOne({ page, trackedProduct });
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeAllActiveProducts, scrapeSingleTrackedProduct };