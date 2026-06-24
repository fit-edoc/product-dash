'use client';

import { useState, useEffect } from 'react';
import api, { CacheMetrics } from '../services/api';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<CacheMetrics>({
    status: 'Connecting...',
    hitRate: '0.00%',
    hits: 0,
    misses: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [pollingActive, setPollingActive] = useState<boolean>(true);

  const fetchMetrics = async () => {
    try {
      const data = await api.getCacheMetrics();
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching cache metrics:', err);
      setMetrics((prev) => ({ ...prev, status: 'Redis disconnected' }));
      setError('Failed to fetch cache telemetry');
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!pollingActive) return;

    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, [pollingActive]);

  const isConnected = metrics.status && metrics.status.toLowerCase().includes('connected');

  // Helper for CSS var names
  const varStyle = (name: string) => `var(--${name})`;

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: varStyle('text-secondary'), textTransform: 'uppercase', letterSpacing: '0.1em' }}>System Status</span>
          <h2 style={{ fontSize: '1.5rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            Upstash Cache Dashboard
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
          <span className={isConnected ? 'indicator-active' : 'indicator-inactive'}></span>
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: isConnected ? '#34d399' : '#f87171' }}>
            {metrics.status}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '1rem', background: 'rgba(244,63,94,0.08)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(244,63,94,0.15)' }}>
          ⚠️ {error}. Verify that the backend server is running on port 5000.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        {/* Hit Rate Card */}
        <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '4px', width: '100%', background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-cyan))' }}></div>
          <span style={{ fontSize: '0.8rem', color: varStyle('text-secondary') }}>Cache Hit Rate</span>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.4rem 0', color: '#fff', textShadow: '0 0 10px rgba(6,182,212,0.3)' }}>
            {metrics.hitRate}
          </div>
          <div style={{ fontSize: '0.75rem', color: varStyle('text-muted') }}>Efficiency of product queries</div>
        </div>

        {/* Hits Card */}
        <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: varStyle('text-secondary') }}>Cache Hits</span>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.4rem 0', color: 'var(--accent-emerald)' }}>
            {metrics.hits}
          </div>
          <div style={{ fontSize: '0.75rem', color: varStyle('text-muted') }}>Served from Upstash Redis</div>
        </div>

        {/* Misses Card */}
        <div className="glass-card" style={{ padding: '1.2rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: varStyle('text-secondary') }}>Cache Misses</span>
          <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.4rem 0', color: 'var(--accent-rose)' }}>
            {metrics.misses}
          </div>
          <div style={{ fontSize: '0.75rem', color: varStyle('text-muted') }}>Fetched from MongoDB</div>
        </div>

        {/* Polling Control Card */}
        <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: varStyle('text-secondary'), textAlign: 'center' }}>Telemetry Stream</span>
          <button 
            onClick={() => setPollingActive(!pollingActive)}
            className="btn btn-secondary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}
          >
            {pollingActive ? 'Pause Stream' : 'Resume Stream'}
          </button>
        </div>
      </div>
    </div>
  );
}
