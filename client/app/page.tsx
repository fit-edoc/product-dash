'use client';

import { useState, useEffect, useRef } from 'react';
import api, { Product } from '../services/api';
import Dashboard from '../components/Dashboard';
import ProductCard from '../components/ProductCard';

export default function Home() {
  // Catalog List States
  const [products, setProducts] = useState<Product[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [categories] = useState<string[]>(['Electronics', 'Clothing', 'Books', 'Home & Kitchen', 'Sports & Outdoors']);
  const [filterNewOnly, setFilterNewOnly] = useState<boolean>(false);

  // Live Sync States
  const [newCountAlert, setNewCountAlert] = useState<number>(0);
  
  // UI States
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [backendUrlInput, setBackendUrlInput] = useState<string>('');
  const [lastResponseInfo, setLastResponseInfo] = useState<{
    cacheStatus: string;
    dbExecutionTimeMs: number | null;
  }>({
    cacheStatus: 'UNKNOWN',
    dbExecutionTimeMs: null
  });

  // Keep a ref of the product IDs we currently display, for fast lookup in background sync
  const productIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    productIdsRef.current = new Set(products.map((p) => p._id));
  }, [products]);

  // Initial load
  useEffect(() => {
    setBackendUrlInput(api.getBaseUrl());
    fetchProducts(true);
  }, []);

  // Background polling loop for automatic new product checking
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        // Fetch first page of products (using no cursor) to check if any new products exist
        const response = await api.getProducts({
          limit: 10,
          category: category, // respect the currently selected category filter
          name: search
        });

        if (response.items && response.items.length > 0) {
          // Filter out items we already have in our list
          const newItems = response.items.filter(
            (item) => !productIdsRef.current.has(item._id)
          );

          if (newItems.length > 0) {
            // Prepend new items to our list!
            setProducts((prev) => {
              // Ensure no duplicate items get added
              const filteredPrev = prev.filter(
                (p) => !newItems.some((n) => n._id === p._id)
              );
              return [...newItems, ...filteredPrev];
            });

            // Set a temporary alert for the user
            setNewCountAlert((prev) => prev + newItems.length);
            setTimeout(() => {
              setNewCountAlert(0);
            }, 6000);
          }
        }
      } catch (err) {
        console.error('Background sync failed:', err);
      }
    }, 5000); // check every 5 seconds

    return () => clearInterval(pollInterval);
  }, [category, search]);

  // Fetch products (initial or append)
  const fetchProducts = async (isInitial = true, cursorVal: string | null = null, filterOverride: { search?: string; category?: string } = {}) => {
    setLoading(true);
    try {
      const activeSearch = filterOverride.hasOwnProperty('search') ? filterOverride.search! : search;
      const activeCategory = filterOverride.hasOwnProperty('category') ? filterOverride.category! : category;

      const response = await api.getProducts({
        limit: 9,
        cursor: isInitial ? null : (cursorVal || nextCursor),
        category: activeCategory,
        name: activeSearch
      });

      if (isInitial) {
        setProducts(response.items || []);
      } else {
        setProducts((prev) => {
          // Avoid appending duplicates
          const currentIds = new Set(prev.map((p) => p._id));
          const uniques = (response.items || []).filter((item) => !currentIds.has(item._id));
          return [...prev, ...uniques];
        });
      }

      setNextCursor(response.pagination?.nextCursor || null);
      setHasMore(response.pagination?.hasMore || false);
      
      setLastResponseInfo({
        cacheStatus: response.cacheStatus || 'MISS',
        dbExecutionTimeMs: response.dbExecutionTimeMs || null
      });
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(true, null);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    fetchProducts(true, null, { category: cat });
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setFilterNewOnly(false);
    fetchProducts(true, null, { search: '', category: '' });
  };

  const handleUpdateBackendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    api.setBaseUrl(backendUrlInput);
    setShowConfig(false);
    fetchProducts(true);
  };

  // Filter products locally for "New Only" (defined as created within the last 24 hours)
  const getFilteredProducts = () => {
    if (!filterNewOnly) return products;
    
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return products.filter((p) => {
      const createdTime = new Date(p.createdAt).getTime();
      return createdTime >= oneDayAgo;
    });
  };

  const displayedProducts = getFilteredProducts();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <header className="glass-panel" style={{
        borderRadius: '0 0 var(--border-radius-lg) var(--border-radius-lg)',
        padding: '1.2rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '1.2rem',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(139, 92, 246, 0.3)'
          }}>
            ⚡
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, background: 'linear-gradient(90deg, #fff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              NEO-SHOWCASE
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>MERN + Upstash Redis Real-time Telemetry</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{
            fontSize: '0.75rem',
            color: '#34d399',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <span className="indicator-active" style={{ width: '6px', height: '6px', animationDuration: '1s' }}></span>
            Live Updates Active
          </span>
          <button 
            onClick={() => setShowConfig(!showConfig)} 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', borderRadius: '50%', width: '38px', height: '38px', justifyContent: 'center' }}
            title="Configure Backend Connection"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem 3rem 1.5rem' }}>
        
        {/* Live background addition alert */}
        {newCountAlert > 0 && (
          <div className="glass-panel" style={{
            padding: '0.8rem 1.2rem',
            marginBottom: '1.5rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--border-radius-sm)',
            color: '#a7f3d0',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'pulse-green 2s infinite'
          }}>
            <span>✨ <b>{newCountAlert} new product(s)</b> just added to the database and automatically loaded in the feed!</span>
            <button onClick={() => setNewCountAlert(0)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>&times;</button>
          </div>
        )}

        {/* Backend URL Config Dialog */}
        {showConfig && (
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.8rem', color: '#fff' }}>Configure API Target</h3>
            <form onSubmit={handleUpdateBackendUrl} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Backend Endpoint URL</label>
                <input 
                  type="url" 
                  value={backendUrlInput}
                  onChange={(e) => setBackendUrlInput(e.target.value)}
                  className="form-input" 
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary">Save & Connect</button>
                <button type="button" onClick={() => setShowConfig(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Telemetry Hub */}
        <div style={{ marginBottom: '2rem' }}>
          <Dashboard />
        </div>

        {/* Last Query Telemetry Stats */}
        <div className="glass-panel" style={{ 
          padding: '0.8rem 1.5rem', 
          marginBottom: '2rem', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Last Query Cache Status:</span>
            <span style={{ 
              fontWeight: 600, 
              color: lastResponseInfo.cacheStatus === 'HIT' ? 'var(--accent-cyan)' : 'var(--accent-amber)',
              background: lastResponseInfo.cacheStatus === 'HIT' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              border: `1px solid ${lastResponseInfo.cacheStatus === 'HIT' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
            }}>
              {lastResponseInfo.cacheStatus === 'HIT' ? '⚡ UPSTASH CACHE HIT' : '🗄️ DATABASE MISS'}
            </span>
          </div>

          {lastResponseInfo.dbExecutionTimeMs !== null && (
            <div style={{ color: 'var(--text-secondary)' }}>
              Backend DB Fetch Latency: <span style={{ fontWeight: 600, color: '#fff' }}>{lastResponseInfo.dbExecutionTimeMs}ms</span>
            </div>
          )}
        </div>

        {/* Product Catalog Heading */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>Product Showcase</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Displaying high-performance catalog. Polling database for updates live.</p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ flex: 2, minWidth: '220px' }}>
              <input 
                type="text" 
                placeholder="Search products by name..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input" 
              />
            </div>
            
            {/* Category Select */}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <select 
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="form-select"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Filter: NEW toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.5rem' }}>
              <input 
                type="checkbox" 
                id="filterNew" 
                checked={filterNewOnly}
                onChange={(e) => setFilterNewOnly(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
              />
              <label htmlFor="filterNew" style={{ fontSize: '0.9rem', color: '#fff', cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>
                ✨ New Arrivals Only
              </label>
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
              <button type="submit" className="btn btn-primary">Search</button>
              {(search || category || filterNewOnly) && (
                <button type="button" onClick={handleResetFilters} className="btn btn-secondary">Reset</button>
              )}
            </div>
          </form>
        </div>

        {/* Product Cards Grid */}
        {displayedProducts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
            <h3>No Products Found</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {filterNewOnly ? 'No products were added in the last 24 hours.' : 'Try resetting your search query or categories.'}
            </p>
          </div>
        ) : (
          <div>
            {filterNewOnly && (
              <p style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '1rem' }}>
                💡 Showing {displayedProducts.length} product(s) added in the last 24 hours.
              </p>
            )}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem',
              marginBottom: '2.5rem'
            }}>
              {displayedProducts.map((product) => (
                <ProductCard 
                  key={product._id} 
                  product={product} 
                />
              ))}
            </div>

            {/* Load More Pagination (Only show if not filtering new arrivals locally) */}
            {hasMore && !filterNewOnly && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button 
                  onClick={() => fetchProducts(false)} 
                  disabled={loading}
                  className="btn btn-secondary"
                  style={{ minWidth: '180px', justifyContent: 'center' }}
                >
                  {loading ? 'Loading...' : 'Load More Products ⬇️'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border-glass)', 
        padding: '2rem', 
        textAlign: 'center', 
        fontSize: '0.8rem', 
        color: 'var(--text-muted)',
        marginTop: 'auto'
      }}>
        Neo-Showcase Platform &copy; 2026. Made with ❤️ using Next.js & Upstash Redis.
      </footer>
    </div>
  );
}
