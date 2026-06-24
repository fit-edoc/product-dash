'use client';

import { Product } from '../services/api';

interface ProductCardProps {
  product: Product;
  highlightNew?: boolean;
}

export default function ProductCard({ product, highlightNew = false }: ProductCardProps) {
  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: '#f87171' };
    if (stock <= 5) return { label: `Low Stock (${stock})`, color: '#fbbf24' };
    return { label: `In Stock (${stock})`, color: '#34d399' };
  };

  const stockStatus = getStockStatus(product.stock);
  const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.price);
  
  const dateObj = new Date(product.updatedAt || product.createdAt);
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate if the product is fresh (created in the last 15 minutes) or highlighted
  const minutesSinceCreation = (Date.now() - dateObj.getTime()) / (1000 * 60);
  const isNewlyCreated = highlightNew || minutesSinceCreation < 15;

  return (
    <div className="glass-card" style={{ 
      padding: '1.5rem', 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      height: '100%',
      position: 'relative',
      border: isNewlyCreated ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid var(--border-glass)',
      boxShadow: isNewlyCreated ? '0 0 15px rgba(6, 182, 212, 0.15)' : 'none'
    }}>
      {/* Category, Version & New Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            background: 'rgba(6, 182, 212, 0.1)', 
            border: '1px solid rgba(6, 182, 212, 0.2)',
            color: 'var(--accent-cyan)',
            padding: '0.2rem 0.6rem',
            borderRadius: '12px',
            fontWeight: 500
          }}>
            {product.category}
          </span>
          {isNewlyCreated && (
            <span style={{ 
              fontSize: '0.7rem', 
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              padding: '0.15rem 0.5rem',
              borderRadius: '10px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              animation: 'pulse-green 1.5s infinite',
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              NEW
            </span>
          )}
        </div>
        <span style={{ 
          fontSize: '0.75rem', 
          background: 'rgba(139, 92, 246, 0.1)', 
          border: '1px solid rgba(139, 92, 246, 0.2)',
          color: 'var(--accent-purple)',
          padding: '0.2rem 0.6rem',
          borderRadius: '12px',
          fontWeight: 600
        }}>
          v{product.version}
        </span>
      </div>

      {/* Main details */}
      <div style={{ flexGrow: 1, marginBottom: '1.2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: '0.4rem' }}>
          {product.name}
        </h3>
        <p style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)', 
          lineHeight: '1.4',
          minHeight: '40px',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '0.8rem'
        }}>
          {product.description || 'No description provided.'}
        </p>
        
        {/* Price & Stock info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'auto' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
            {formattedPrice}
          </div>
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 500, 
            color: stockStatus.color 
          }}>
            {stockStatus.label}
          </span>
        </div>
      </div>

      {/* Footer Meta */}
      <div style={{ 
        borderTop: '1px solid var(--border-glass)', 
        paddingTop: '0.8rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.6rem'
      }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Updated: {formattedDate}
        </span>
      </div>
    </div>
  );
}
