const env = require('../config/env');

const PAGE_SIZE = 100;
const MAX_PAGES_TO_SCAN = 10;

async function fetchCatalogPage(page) {
  const url = `${env.MOCK_STORE_BASE_URL}/api/catalog?page=${page}&pageSize=${PAGE_SIZE}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  return response.json();
}

async function searchProducts(query) {
  const normalizedQuery = (query || '').trim().toLowerCase();
  if (!normalizedQuery) return [];

    const matches = [];
  const seenIds = new Set();
  let page = 1;
  let totalPages = 1;
    

  do {
    const data = await fetchCatalogPage(page);
    totalPages = data.pages || 1;

        for (const item of data.items || []) {
      const haystack = `${item.name} ${item.brand} ${item.category}`.toLowerCase();
      if (haystack.includes(normalizedQuery) && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        matches.push(item);
      }
    }

    page++;
  } while (page <= totalPages && page <= MAX_PAGES_TO_SCAN);

  return matches;
}

module.exports = { searchProducts, fetchCatalogPage };