import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

const TABS = [
  { label: 'All', key: 'all' },
  { label: 'Needs Review', key: 'needs_review' },
  { label: 'Forms Complete', key: 'forms_complete' },
  { label: 'Pending Decision', key: 'pending_decision' },
  { label: 'Approved', key: 'approved' },
  { label: 'Rejected', key: 'rejected' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
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

function rowBgClass(applicant) {
  if (applicant.decision === 'approved') return 'bg-green-50';
  if (applicant.decision === 'rejected') return 'bg-red-50';
  if (applicant.eligibility_status === 'needs_review') return 'bg-yellow-50';
  if (applicant.eligibility_status === 'eligible' && applicant.decision === 'pending') return 'bg-blue-50';
  return 'bg-white';
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

  // Tab filter
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

  // Forms complete toggle (independent of tab)
  if (formsCompleteOnly) {
    result = result.filter((a) => a.forms_complete);
  }

  // Date range filter — compare in local time to match what the UI displays
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

  // Search
  if (search && search.trim()) {
    result = result.filter((a) => matchesSearch(a, search.trim()));
  }

  return result;
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
        const statsData = await statsRes.json();
        const applicantsData = await applicantsRes.json();
        setStats(statsData);
        setApplicants(applicantsData);
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">LOGOS Admissions</h1>
            <p className="text-xs text-gray-500">Admissions Management</p>
          </div>
          {stats && (
            <div className="flex gap-6 flex-wrap">
              <StatBox label="Total" value={stats.total} colorClass="text-gray-700" />
              <StatBox label="Forms Complete" value={stats.forms_complete} colorClass="text-gray-700" />
              <StatBox label="Needs Review" value={stats.needs_review} colorClass="text-yellow-600" />
              <StatBox label="Approved" value={stats.approved} colorClass="text-green-600" />
              <StatBox label="Rejected" value={stats.rejected} colorClass="text-red-600" />
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-0 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-4 py-3 text-sm border-b-2 transition-none ${
                  isActive
                    ? 'border-blue-600 text-gray-900 font-bold bg-white'
                    : 'border-transparent text-gray-500 hover:underline'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + Date + Forms Complete Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search bar */}
          <div className="relative flex items-center">
            <svg className="absolute left-2.5 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, program…"
              className="pl-8 pr-8 py-1.5 border border-gray-300 rounded text-sm text-gray-700 w-64 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="w-px h-5 bg-gray-200" />

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-blue-400"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formsCompleteOnly}
              onChange={(e) => setFormsCompleteOnly(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-600 font-medium">Forms complete only</span>
          </label>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Program</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Level</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Forms</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Eligibility</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">AI Rec</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Decision</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No applicants found.
                  </td>
                </tr>
              ) : (
                filtered.map((applicant) => (
                  <tr
                    key={applicant.id}
                    onClick={() => navigate(`/applicants/${applicant.id}`)}
                    className={`border-b border-gray-100 cursor-pointer hover:brightness-95 ${rowBgClass(applicant)}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {applicant.full_name || '(no name)'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      <span title={applicant.email}>{applicant.email || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">
                      <span title={applicant.program_applied}>{truncate(applicant.program_applied, 30)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {applicant.program_level ? (
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                          {applicant.program_level}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {countForms(applicant)} / 3
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={applicant.eligibility_status} type="eligibility" />
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {applicant.ai_recommendation ? capitalize(applicant.ai_recommendation) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={applicant.decision} type="decision" />
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(applicant.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, colorClass }) {
  return (
    <div className="text-center min-w-[60px]">
      <div className={`text-2xl font-bold ${colorClass}`}>{value ?? '—'}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
