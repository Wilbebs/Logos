import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar } from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

// Brand colors
const primary = '#7B2335';
const secondary = '#1B3272';
const hover = '#FDF5F5';
const textDark = '#1B2340';

const TABS = [
  { label: 'All',              key: 'all' },
  { label: 'Needs Review',     key: 'needs_review' },
  { label: 'Forms Complete',   key: 'forms_complete' },
  { label: 'Pending Decision', key: 'pending_decision' },
  { label: 'Approved',         key: 'approved' },
  { label: 'Rejected',         key: 'rejected' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function countForms(applicant) {
  let count = 0;
  if (applicant.form1_submitted_at) count++;
  if (applicant.form2_submitted_at) count++;
  if (applicant.form3_submitted_at) count++;
  return count;
}

function truncate(str, max) {
  if (!str) return '—';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function capitalize(str) {
  if (!str) return '—';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function matchesSearch(applicant, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (applicant.full_name || '').toLowerCase().includes(q) ||
    (applicant.email || '').toLowerCase().includes(q) ||
    (applicant.program_applied || '').toLowerCase().includes(q) ||
    (applicant.program_level || '').toLowerCase().includes(q)
  );
}

function applyFilters(applicants, activeFilter, dateFrom, dateTo, formsCompleteOnly, search) {
  let result = applicants;

  switch (activeFilter) {
    case 'needs_review':
      result = result.filter((a) => a.eligibility_status === 'needs_review');
      break;
    case 'forms_complete':
      result = result.filter((a) => a.forms_complete);
      break;
    case 'pending_decision':
      result = result.filter((a) => a.decision === 'pending');
      break;
    case 'approved':
      result = result.filter((a) => a.decision === 'approved');
      break;
    case 'rejected':
      result = result.filter((a) => a.decision === 'rejected');
      break;
    default:
      break;
  }

  if (formsCompleteOnly) result = result.filter((a) => a.forms_complete);

  if (dateFrom) {
    result = result.filter((a) => {
      if (!a.created_at) return false;
      return new Date(a.created_at).toLocaleDateString('en-CA') >= dateFrom;
    });
  }
  if (dateTo) {
    result = result.filter((a) => {
      if (!a.created_at) return false;
      return new Date(a.created_at).toLocaleDateString('en-CA') <= dateTo;
    });
  }
  if (search && search.trim()) {
    result = result.filter((a) => matchesSearch(a, search.trim()));
  }

  return result;
}

function tabCount(applicants, key) {
  switch (key) {
    case 'all':              return applicants.length;
    case 'needs_review':     return applicants.filter((a) => a.eligibility_status === 'needs_review').length;
    case 'forms_complete':   return applicants.filter((a) => a.forms_complete).length;
    case 'pending_decision': return applicants.filter((a) => a.decision === 'pending').length;
    case 'approved':         return applicants.filter((a) => a.decision === 'approved').length;
    case 'rejected':         return applicants.filter((a) => a.decision === 'rejected').length;
    default:                 return 0;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [applicants, setApplicants] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formsCompleteOnly, setFormsCompleteOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const statusMenuRef = useRef(null);
  const dateMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) setShowStatusMenu(false);
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target)) setShowDateFilter(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [statsRes, applicantsRes] = await Promise.all([
          fetch(`${API_URL}/api/applicants/stats`),
          fetch(`${API_URL}/api/applicants`),
        ]);
        if (!statsRes.ok) throw new Error(`Stats fetch failed: ${statsRes.status}`);
        if (!applicantsRes.ok) throw new Error(`Applicants fetch failed: ${applicantsRes.status}`);
        setStats(await statsRes.json());
        setApplicants(await applicantsRes.json());
      } catch (err) {
        setError(err.message || 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = applyFilters(applicants, activeFilter, dateFrom, dateTo, formsCompleteOnly, search);
  const hasActiveFilters = dateFrom || dateTo || formsCompleteOnly || search;

  function clearFilters() {
    setDateFrom('');
    setDateTo('');
    setFormsCompleteOnly(false);
    setSearch('');
  }

  const STAT_CARDS = stats
    ? [
        { label: 'Total',          value: stats.total,          filterKey: 'all',            color: secondary },
        { label: 'Needs Review',   value: stats.needs_review,   filterKey: 'needs_review',   color: secondary },
        { label: 'Forms Complete', value: stats.forms_complete, filterKey: 'forms_complete', color: secondary },
        { label: 'Approved',       value: stats.approved,       filterKey: 'approved',       color: '#16a34a' },
        { label: 'Rejected',       value: stats.rejected,       filterKey: 'rejected',       color: '#dc2626' },
      ]
    : [];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#F8F8FB', color: textDark }}>

      {/* Top header — title + inline stat chips */}
      <header className="px-6 py-3 flex items-center justify-between gap-4 border-b border-gray-200 bg-white flex-shrink-0 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold leading-tight" style={{ color: secondary }}>Admissions Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage and review university applications</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {loading && !stats
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-24 h-8 rounded-lg border border-gray-200 bg-gray-100 animate-pulse" />
              ))
            : STAT_CARDS.map(({ label, value, filterKey, color }) => (
                <button
                  key={label}
                  onClick={() => setActiveFilter(filterKey)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor: activeFilter === filterKey ? color : '#e5e7eb',
                    backgroundColor: activeFilter === filterKey ? color + '10' : '#fff',
                  }}
                >
                  <span className="text-base font-bold" style={{ color }}>{value ?? '—'}</span>
                  <span className="text-gray-500">{label}</span>
                </button>
              ))}
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto px-8 py-7">

        {/* Error */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Toolbar — search + collapsible status filter + date popover + forms checkbox */}
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50/60 flex items-center gap-2 flex-wrap">

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, program…"
                className="pl-9 pr-7 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 w-64 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none">
                  ×
                </button>
              )}
            </div>

            {/* Status dropdown */}
            <div className="relative" ref={statusMenuRef}>
              <button
                onClick={() => setShowStatusMenu((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                style={{
                  borderColor: activeFilter !== 'all' ? primary : '#d1d5db',
                  color: activeFilter !== 'all' ? primary : '#374151',
                }}
              >
                {TABS.find((t) => t.key === activeFilter)?.label || 'All'}
                <span className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  {loading ? '…' : tabCount(applicants, activeFilter)}
                </span>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {showStatusMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[190px]">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => { setActiveFilter(tab.key); setShowStatusMenu(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50"
                      style={{ color: activeFilter === tab.key ? primary : '#374151', fontWeight: activeFilter === tab.key ? 600 : 400 }}
                    >
                      {tab.label}
                      <span className="text-xs text-gray-400 ml-4">{loading ? '…' : tabCount(applicants, tab.key)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date range popover */}
            <div className="relative" ref={dateMenuRef}>
              <button
                onClick={() => setShowDateFilter((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                style={{ borderColor: (dateFrom || dateTo) ? primary : '#d1d5db', color: (dateFrom || dateTo) ? primary : '#374151' }}
              >
                <Calendar size={14} />
                {dateFrom || dateTo ? `${dateFrom || '…'} – ${dateTo || '…'}` : 'Date range'}
                {(dateFrom || dateTo)
                  ? <span onClick={(e) => { e.stopPropagation(); setDateFrom(''); setDateTo(''); }}
                      className="ml-1 text-gray-400 hover:text-gray-700 leading-none">×</span>
                  : <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
                }
              </button>
              {showDateFilter && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 space-y-2" style={{ minWidth: '200px' }}>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-8 shrink-0">From</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-8 shrink-0">To</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Forms complete */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={formsCompleteOnly} onChange={(e) => setFormsCompleteOnly(e.target.checked)}
                className="rounded border-gray-300" style={{ accentColor: primary }} />
              Forms complete
            </label>

            {/* Count + clear */}
            <div className="flex items-center gap-3 ml-auto">
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs hover:underline" style={{ color: primary }}>Clear all</button>
              )}
              <span className="text-xs text-gray-400">
                {loading ? '…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-gray-200 bg-gray-50/80">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Program</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Forms</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Eligibility</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Rec</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Decision</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">
                      Loading applicants…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">
                      No applicants match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((applicant) => {
                    const forms = countForms(applicant);
                    const formsLabel = `${forms}/3`;
                    const isHovered = hoveredRow === applicant.id;
                    const cellPy = isHovered ? '18px' : '14px';
                    return (
                      <tr
                        key={applicant.id}
                        onClick={() => navigate(`/applicants/${applicant.id}`)}
                        className="cursor-pointer"
                        style={{
                          backgroundColor: isHovered ? hover : '',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={() => setHoveredRow(applicant.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {/* Applicant */}
                        <td className="px-5 whitespace-nowrap" style={{ paddingTop: cellPy, paddingBottom: cellPy, transition: 'padding 0.15s ease' }}>
                          <div className="flex items-center gap-3">
                            <div
                              className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                              style={{ backgroundColor: primary }}
                            >
                              {getInitials(applicant.full_name)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {applicant.full_name || '(no name)'}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-[180px]">
                                {applicant.email || '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Program */}
                        <td className="px-5 text-gray-700 max-w-[200px]" style={{ paddingTop: cellPy, paddingBottom: cellPy, transition: 'padding 0.15s ease' }}>
                          <span title={applicant.program_applied}>
                            {truncate(applicant.program_applied, 32)}
                          </span>
                        </td>

                        {/* Level */}
                        <td className="px-5 whitespace-nowrap" style={{ paddingTop: cellPy, paddingBottom: cellPy, transition: 'padding 0.15s ease' }}>
                          {applicant.program_level ? (
                            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full font-medium">
                              {applicant.program_level}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        {/* Forms */}
                        <td className="px-5 whitespace-nowrap" style={{ paddingTop: cellPy, paddingBottom: cellPy, transition: 'padding 0.15s ease' }}>
                          <div className="flex items-center gap-2 text-gray-700">
                            {formsLabel}
                            {forms === 3 && (
                              <div className="w-2 h-2 rounded-full bg-green-500" title="All forms submitted" />
                            )}
                          </div>
                        </td>

                        {/* Eligibility */}
                        <td className="px-5 whitespace-nowrap" style={{ paddingTop: cellPy, paddingBottom: cellPy, transition: 'padding 0.15s ease' }}>
                          <StatusBadge status={applicant.eligibility_status} type="eligibility" />
                        </td>

                        {/* AI Rec */}
                        <td className="px-5 whitespace-nowrap text-gray-600" style={{ paddingTop: cellPy, paddingBottom: cellPy, transition: 'padding 0.15s ease' }}>
                          {applicant.ai_recommendation ? capitalize(applicant.ai_recommendation) : '—'}
                        </td>

                        {/* Decision */}
                        <td className="px-5 whitespace-nowrap" style={{ paddingTop: cellPy, paddingBottom: cellPy, transition: 'padding 0.15s ease' }}>
                          <StatusBadge status={applicant.decision} type="decision" />
                        </td>

                        {/* Submitted */}
                        <td className="px-5 whitespace-nowrap text-gray-500 text-xs" style={{ paddingTop: cellPy, paddingBottom: cellPy, transition: 'padding 0.15s ease' }}>
                          {formatDate(applicant.created_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/60 text-xs text-gray-500">
              Showing {filtered.length} of {applicants.length} applicants
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
