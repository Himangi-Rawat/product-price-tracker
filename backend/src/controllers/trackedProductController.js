const trackedProductService = require('../services/trackedProductService');
const { scrapeSingleTrackedProduct } = require('../scrapers/scraperService');

async function createTrackedProduct(req, res) {
  const { id, slug, name, brand, category } = req.body || {};

  if (!id || !name) {
    return res.status(400).json({ error: 'Request body must include at least "id" and "name" of the product to track' });
  }

  try {
    const trackedProduct = await trackedProductService.trackProduct({ id, slug, name, brand, category });
    return res.status(201).json(trackedProduct);
  } catch (err) {
    console.error('Failed to track product:', err.message);
    return res.status(500).json({ error: 'Could not save tracked product', detail: err.message });
  }
}

async function listTrackedProducts(req, res) {
  try {
    const products = await trackedProductService.listTrackedProductsWithLatestStatus();
    return res.status(200).json(products);
  } catch (err) {
    console.error('Failed to list tracked products:', err.message);
    return res.status(500).json({ error: 'Could not load tracked products', detail: err.message });
  }
}

async function getTrackedProduct(req, res) {
  const trackedProduct = await trackedProductService.getTrackedProductById(req.params.id);
  if (!trackedProduct) {
    return res.status(404).json({ error: 'Tracked product not found' });
  }
  return res.status(200).json(trackedProduct);
}

async function getHistory(req, res) {
  try {
    const history = await trackedProductService.getPriceHistory(req.params.id);
    return res.status(200).json(history);
  } catch (err) {
    return res.status(500).json({ error: 'Could not load price history', detail: err.message });
  }
}

async function getLogs(req, res) {
  try {
    const logs = await trackedProductService.getScrapeLogs(req.params.id);
    return res.status(200).json(logs);
  } catch (err) {
    return res.status(500).json({ error: 'Could not load scrape logs', detail: err.message });
  }
}

async function manualScrape(req, res) {
  const trackedProduct = await trackedProductService.getTrackedProductById(req.params.id);
  if (!trackedProduct) {
    return res.status(404).json({ error: 'Tracked product not found' });
  }

  try {
    const result = await scrapeSingleTrackedProduct(req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    console.error('Manual scrape failed:', err.message);
    return res.status(500).json({ error: 'Scrape failed to run', detail: err.message });
  }
}

module.exports = {
  createTrackedProduct,
  listTrackedProducts,
  getTrackedProduct,
  getHistory,
  getLogs,
  manualScrape,
};