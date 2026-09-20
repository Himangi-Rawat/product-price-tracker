function parsePrice(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const value = parseFloat(cleaned);
  if (Number.isNaN(value) || value <= 0) return null;
  return value;
}

function parseStock(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { stockCount: null, stockRawText: null };
  }
  const match = rawText.match(/\d+/);
  const stockCount = match ? parseInt(match[0], 10) : null;
  return { stockCount, stockRawText: rawText.trim() };
}

function validateScrapeResult({ productId, pageProductName, expectedName, priceRawText, stockRawText }) {
  if (!productId) {
    return { valid: false, reason: 'No product id was passed into the scraper' };
  }
  if (!pageProductName || pageProductName.trim().length < 2) {
    return { valid: false, reason: 'Product name was not found on the page - possibly a broken/empty page load' };
  }
  const price = parsePrice(priceRawText);
  if (price === null) {
    return { valid: false, reason: `Price could not be parsed from page text: "${priceRawText}"` };
  }
  const { stockCount, stockRawText: cleanStockText } = parseStock(stockRawText);
  return {
    valid: true,
    data: { price, stockCount, stockRawText: cleanStockText },
  };
}

module.exports = { parsePrice, parseStock, validateScrapeResult };