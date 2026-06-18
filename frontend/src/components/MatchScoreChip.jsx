import React from 'react';

/**
 * MatchScoreChip
 * Displays a colored percentage badge based on match score.
 * Green ≥ 80 | Yellow 60–79 | Gray < 60
 */
export default function MatchScoreChip({ score, size = 'md' }) {
  if (score === null || score === undefined) return null;

  const pct = Math.round(score);
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#94a3b8';
  const bg   = pct >= 80 ? '#dcfce7' : pct >= 60 ? '#fef3c7' : '#f1f5f9';

  const sizes = {
    sm: { fontSize: '11px', padding: '2px 8px', borderRadius: '10px' },
    md: { fontSize: '12px', padding: '3px 10px', borderRadius: '12px' },
    lg: { fontSize: '14px', padding: '4px 14px', borderRadius: '14px' },
  };

  return (
    <span style={{
      ...sizes[size],
      background: bg,
      color,
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      border: `1.5px solid ${color}30`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, display: 'inline-block' }} />
      {pct}% Match
    </span>
  );
}
