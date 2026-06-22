import React from 'react';

const STATUS_CONFIG = {
  applied:     { label: 'Applied',     bg: '#eff6ff', color: '#3b82f6', dot: '#3b82f6' },
  shortlisted: { label: 'Shortlisted', bg: '#f0fdf4', color: '#22c55e', dot: '#22c55e' },
  rejected:    { label: 'Not Selected',bg: '#fef2f2', color: '#ef4444', dot: '#ef4444' },
  hired:       { label: 'Hired',    bg: '#fffbeb', color: '#d97706', dot: '#f59e0b' },
};

export default function ApplicationStatusChip({ status, size = 'md' }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: '#f8fafc', color: '#64748b', dot: '#94a3b8' };
  const sizes = {
    sm: { fontSize: '11px', padding: '2px 8px' },
    md: { fontSize: '12px', padding: '3px 12px' },
    lg: { fontSize: '13px', padding: '4px 14px' },
  };
  return (
    <span style={{
      ...sizes[size],
      background: cfg.bg,
      color: cfg.color,
      borderRadius: '20px',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      border: `1px solid ${cfg.color}25`,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {cfg.label}
    </span>
  );
}
