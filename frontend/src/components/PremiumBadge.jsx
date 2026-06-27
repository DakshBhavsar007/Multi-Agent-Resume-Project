import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PremiumBadge({ tooltip = 'Available on Enterprise plan', children }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = '/#pricing';
  };

  return (
    <div 
      className="premium-lock-wrapper cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]" 
      onClick={handleClick}
      style={{ position: 'relative', display: 'inline-block', width: '100%' }}
    >
      <div className="premium-lock-overlay" style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(3px)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}>
        <div style={{
          background: '#111111',
          color: '#fff',
          borderRadius: '20px',
          padding: '5px 16px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          boxShadow: '0 4px 12px rgba(17, 17, 17, 0.25)',
        }}>
          Enterprise
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: '#4b5563', textAlign: 'center', maxWidth: '160px', fontWeight: 600 }}>
          {tooltip}
        </p>
      </div>
      <div style={{ opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
    </div>
  );
}
