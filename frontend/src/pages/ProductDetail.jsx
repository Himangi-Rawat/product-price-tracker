import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function ProductDetail() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [productData, historyData, logsData] = await Promise.all([
        api.getTrackedProduct(id),
        api.getHistory(id),
        api.getLogs(id),
      ]);
      setProduct(productData);
      setHistory(historyData);
      setLogs(logsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  async function handleScrapeNow() {
    setScraping(true);
    setScrapeResult(null);
    try {
      const result = await api.scrapeNow(id);
      setScrapeResult(result);
      await loadAll();
    } catch (err) {
      setScrapeResult({ success: false, finalError: err.message });
    } finally {
      setScraping(false);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!product) return <p>Product not found.</p>;

  return (
    <div>
      <section className="section">
        <h2>{product.name}</h2>
        <p className="muted">
          {product.brand} - {product.category}
        </p>
        <p>
          <a href={`https://demo.inelabteamdev.com${product.product_url}`} target="_blank" rel="noreferrer">
            View on store
          </a>
        </p>

        <button onClick={handleScrapeNow} disabled={scraping}>
          {scraping ? 'Scraping... (this can take up to a couple of minutes)' : 'Scrape now'}
        </button>

        {scrapeResult && (
          <p className={scrapeResult.success ? 'success' : 'error'}>
            {scrapeResult.success
              ? `Success - price ${scrapeResult.data ? scrapeResult.data.price : ''}`
              : `Failed: ${scrapeResult.finalError}`}
          </p>
        )}
      </section>

      <section className="section">
        <h3>Price &amp; stock history</h3>
        {history.length === 0 && <p className="empty-state">No successful scrapes yet.</p>}
        {history.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Scraped at</th>
                <th>Price</th>
                <th>MRP</th>
                <th>Discount</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {history
                .slice()
                .reverse()
                .map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.scraped_at).toLocaleString()}</td>
                    <td>Rs. {row.price}</td>
                    <td>{row.mrp ? `Rs. ${row.mrp}` : '-'}</td>
                    <td>{row.discount_percent ? `${row.discount_percent}%` : '-'}</td>
                    <td>{row.stock_raw_text || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h3>Scrape log</h3>
        {logs.length === 0 && <p className="empty-state">No scrape attempts yet.</p>}
        {logs.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Attempted at</th>
                <th>Status</th>
                <th>Attempt #</th>
                <th>Duration</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.attempted_at).toLocaleString()}</td>
                  <td>
                    <span className={`status status-${log.status}`}>{log.status}</span>
                  </td>
                  <td>{log.attempt_number}</td>
                  <td>{log.duration_ms ? `${log.duration_ms}ms` : '-'}</td>
                  <td className="error-cell">{log.error_message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}