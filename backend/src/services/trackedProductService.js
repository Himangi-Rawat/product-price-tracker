const supabase = require('../db/supabaseClient');

async function trackProduct(product) {
  const { data, error } = await supabase
    .from('tracked_products')
    .upsert(
      {
        product_id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        category: product.category,
        product_url: `/product/${product.id}`,
        is_active: true,
      },
      { onConflict: 'product_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Could not save tracked product: ${error.message}`);
  }

  return data;
}

async function listTrackedProductsWithLatestStatus() {
  const { data: trackedProducts, error } = await supabase
    .from('tracked_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Could not load tracked products: ${error.message}`);
  }

  if (!trackedProducts || trackedProducts.length === 0) return [];

  const ids = trackedProducts.map((p) => p.id);

  const [{ data: latestPrices }, { data: latestLogs }] = await Promise.all([
    supabase
      .from('price_history')
      .select('*')
      .in('tracked_product_id', ids)
      .order('scraped_at', { ascending: false }),
    supabase
      .from('scrape_logs')
      .select('*')
      .in('tracked_product_id', ids)
      .order('attempted_at', { ascending: false }),
  ]);

  const latestPriceByProduct = new Map();
  for (const row of latestPrices || []) {
    if (!latestPriceByProduct.has(row.tracked_product_id)) {
      latestPriceByProduct.set(row.tracked_product_id, row);
    }
  }

  const latestLogByProduct = new Map();
  for (const row of latestLogs || []) {
    if (!latestLogByProduct.has(row.tracked_product_id)) {
      latestLogByProduct.set(row.tracked_product_id, row);
    }
  }

  return trackedProducts.map((p) => ({
    ...p,
    latestPrice: latestPriceByProduct.get(p.id) || null,
    latestScrape: latestLogByProduct.get(p.id) || null,
  }));
}

async function getTrackedProductById(id) {
  const { data, error } = await supabase.from('tracked_products').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

async function getPriceHistory(trackedProductId) {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('tracked_product_id', trackedProductId)
    .order('scraped_at', { ascending: true });

  if (error) {
    throw new Error(`Could not load price history: ${error.message}`);
  }
  return data;
}

async function getScrapeLogs(trackedProductId) {
  const { data, error } = await supabase
    .from('scrape_logs')
    .select('*')
    .eq('tracked_product_id', trackedProductId)
    .order('attempted_at', { ascending: false });

  if (error) {
    throw new Error(`Could not load scrape logs: ${error.message}`);
  }
  return data;
}

module.exports = {
  trackProduct,
  listTrackedProductsWithLatestStatus,
  getTrackedProductById,
  getPriceHistory,
  getScrapeLogs,
};
