import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [trackedProducts, setTrackedProducts] = useState([]);
  const [loadingTracked, setLoadingTracked] = useState(true);
  const [trackedError, setTrackedError] = useState(null);

  async function loadTrackedProducts() {
    setLoadingTracked(true);
    setTrackedError(null);
    try {
      const data = await api.listTrackedProducts();
      setTrackedProducts(data);
    } catch (err) {
      setTrackedError(err.message);
    } finally {
      setLoadingTracked(false);
    }
  }

  useEffect(() => {
    loadTrackedProducts();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setSearchError(null);
    try {
      const data = await api.search(query);
      setResults(data.items);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleTrack(product) {
    try {
      await api.trackProduct(product);
      await loadTrackedProducts();
    } catch (err) {
      alert(`Could not track product: ${err.message}`);
    }
  }

  return (
    <div>
      <section className="section">
        <h2>Search products</h2>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name..."
          />
          <button type="submit" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchError && <p className="error">{searchError}</p>}

        {results.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Brand</th>
                <th>Category</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.brand}</td>
                  <td>{product.category}</td>
                  <td>
                    <button onClick={() => handleTrack(product)}>Track</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h2>Tracked products</h2>

        {loadingTracked && <p>Loading...</p>}
        {trackedError && <p className="error">{trackedError}</p>}

        {!loadingTracked && trackedProducts.length === 0 && (
          <p className="empty-state">Nothing tracked yet - search above and click Track on a product.</p>
        )}

        {trackedProducts.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Current price</th>
                <th>Stock</th>
                <th>Last scrape</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trackedProducts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/products/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.latestPrice ? `Rs. ${p.latestPrice.price}` : '-'}</td>
                  <td>{p.latestPrice ? p.latestPrice.stock_raw_text || '-' : '-'}</td>
                  <td>
                    {p.latestScrape ? (
                      <span className={`status status-${p.latestScrape.status}`}>
                        {p.latestScrape.status}
                      </span>
                    ) : (
                      'never scraped'
                    )}
                  </td>
                  <td>
                    <Link to={`/products/${p.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}