const { searchProducts } = require('../services/catalogServices');

async function search(req, res) {
  const query = req.query.q;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query param "q" is required, e.g. /api/search?q=watch' });
  }

  try {
    const results = await searchProducts(query);
    return res.status(200).json({ query, count: results.length, items: results });
  } catch (err) {
    console.error('Search failed:', err.message);
    return res.status(502).json({ error: 'Could not reach the mock store to search products', detail: err.message });
  }
}

module.exports = { search };