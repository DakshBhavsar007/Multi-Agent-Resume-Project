import React from 'react';

export default function PremiumBadge({ tooltip = 'Available on Premium plan', children }) {
  return (
    <div className="premium-lock-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <div className="premium-lock-overlay" style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(2px)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        cursor: 'not-allowed',
      }}>
        <div style={{
          background: 'linear-gradient(135deg,#f59e0b,#d97706)',
          color: '#fff',
          borderRadius: '20px',
          padding: '4px 14px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          boxShadow: '0 2px 8px rgba(245,158,11,0.35)',
        }}>
          👑 Premium
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', textAlign: 'center', maxWidth: '160px' }}>
          {tooltip}
        </p>
      </div>
      <div style={{ opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
    </div>
  );
}
