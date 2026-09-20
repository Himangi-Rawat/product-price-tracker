const env = require('../config/env');

async function fetchLayoutClasses(page) {
  const response = await page.request.get(`${env.MOCK_STORE_BASE_URL}/api/layout`);

  if (!response.ok()) {
    throw new Error(`/api/layout returned ${response.status()}`);
  }

  const layout = await response.json();

  if (!layout || !layout.classes || !layout.classes.priceValue || !layout.classes.stock) {
    throw new Error('/api/layout response is missing expected class names');
  }

  return layout.classes;
}

module.exports = { fetchLayoutClasses };