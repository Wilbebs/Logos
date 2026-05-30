import React from 'react';

const ELIGIBILITY_STYLES = {
  pending:      { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  eligible:     { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
  ineligible:   { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
  needs_review: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
};

const DECISION_STYLES = {
  pending:       { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  approved:      { bg: '#15803D', text: '#FFFFFF', border: '#15803D' },
  rejected:      { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
  info_requested:{ bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
};

function formatLabel(status) {
  if (!status) return '—';
  if (status === 'info_requested') return 'Info Requested';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status, type = 'eligibility', large = false }) {
  const styleMap = type === 'decision' ? DECISION_STYLES : ELIGIBILITY_STYLES;
  const s = styleMap[status] || { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };

  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        display: 'inline-block',
        fontWeight: 600,
        borderRadius: '9999px',
        fontSize: large ? '0.875rem' : '0.75rem',
        padding: large ? '4px 12px' : '2px 8px',
      }}
    >
      {formatLabel(status)}
    </span>
  );
}
