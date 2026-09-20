const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (data && data.error) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  search: (query) => request(`/api/search?q=${encodeURIComponent(query)}`),
  trackProduct: (product) =>
    request('/api/tracked-products', { method: 'POST', body: JSON.stringify(product) }),
  listTrackedProducts: () => request('/api/tracked-products'),
  getTrackedProduct: (id) => request(`/api/tracked-products/${id}`),
  getHistory: (id) => request(`/api/tracked-products/${id}/history`),
  getLogs: (id) => request(`/api/tracked-products/${id}/logs`),
  scrapeNow: (id) => request(`/api/tracked-products/${id}/scrape`, { method: 'POST' }),
};