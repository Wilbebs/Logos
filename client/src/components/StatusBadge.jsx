import React from 'react';

const ELIGIBILITY_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  eligible: 'bg-blue-100 text-blue-700',
  ineligible: 'bg-red-100 text-red-700',
  needs_review: 'bg-yellow-100 text-yellow-800',
};

const DECISION_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  info_requested: 'bg-yellow-100 text-yellow-800',
};

function formatLabel(status) {
  if (!status) return '—';
  if (status === 'info_requested') return 'Info Requested';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StatusBadge({ status, type = 'eligibility', large = false }) {
  const colorMap = type === 'decision' ? DECISION_COLORS : ELIGIBILITY_COLORS;
  const colorClass = colorMap[status] || 'bg-gray-100 text-gray-600';

  const sizeClass = large
    ? 'text-sm px-3 py-1 rounded-full font-semibold'
    : 'text-xs px-2 py-0.5 rounded-full';

  return (
    <span className={`inline-block font-medium ${sizeClass} ${colorClass}`}>
      {formatLabel(status)}
    </span>
  );
}
