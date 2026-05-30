import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge.jsx';
import FormChecklist from '../components/FormChecklist.jsx';
import AIRecommendation from '../components/AIRecommendation.jsx';
import LeadProfile from '../components/LeadProfile.jsx';
import FileAttachments from '../components/FileAttachments.jsx';
import AcceptanceLetter from '../components/AcceptanceLetter.jsx';
import AdmissionTimeline from '../components/AdmissionTimeline.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
  });
}

// ── Raw form data accordion ────────────────────────────────────────────────────
function FormAccordion({ forms }) {
  const [openIndexes, setOpenIndexes] = useState([]);

  function toggle(index) {
    setOpenIndexes(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  }

  if (!forms || forms.length === 0) {
    return <p className="text-sm text-gray-500">No form submissions yet.</p>;
  }

  return (
    <div className="space-y-2">
      {forms.map((form, index) => {
        const isOpen = openIndexes.includes(index);
        const entries = Object.entries(form.raw_data || {});
        return (
          <div key={form.id || index} className="border border-gray-200 rounded">
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 text-left"
            >
              <span>Form {form.form_number ?? index + 1} — submitted {formatDate(form.submitted_at)}</span>
              <span className="ml-2 text-gray-400 font-bold">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="px-4 py-3">
                {entries.length === 0 ? (
                  <p className="text-sm text-gray-500">No data available.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <tbody>
                      {entries.map(([key, value]) => (
                        <tr key={key} className="border-b border-gray-100 last:border-0">
                          <td className="py-1.5 pr-4 font-medium text-gray-500 align-top w-1/3 break-all">{key}</td>
                          <td className="py-1.5 text-gray-800 align-top break-all">
                            {value === null || value === undefined
                              ? '—'
                              : typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Decision panel ────────────────────────────────────────────────────────────
function DecisionPanel({ applicant, onDecisionSubmitted }) {
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [notes, setNotes] = useState('');
  const [decisionBy, setDecisionBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [revoking, setRevoking] = useState(false);

  const isPending = applicant.decision === 'pending' || !applicant.decision;
  const notesRequired = selectedDecision === 'rejected' || selectedDecision === 'info_requested';
  const showSuggestion = selectedDecision === 'info_requested';

  async function handleGenerateSuggestion() {
    setSuggestionError('');
    setSuggestionLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/applicants/${applicant.id}/suggest-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
      setNotes(prev => {
        const suggestion = data.suggestion || '';
        return prev ? `${prev}\n\n${suggestion}` : suggestion;
      });
    } catch (err) {
      setSuggestionError(err.message || 'Failed to generate suggestion.');
    } finally {
      setSuggestionLoading(false);
    }
  }

  async function handleSubmit() {
    setError('');
    if (!selectedDecision) { setError('Please select a decision.'); return; }
    if (notesRequired && !notes.trim()) { setError('Notes are required for rejection or info request.'); return; }
    if (!decisionBy.trim()) { setError('Please enter your name.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/applicants/${applicant.id}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: selectedDecision,
          decision_notes: notes.trim() || null,
          decision_by: decisionBy.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      setSubmitted(true);
      if (onDecisionSubmitted) onDecisionSubmitted();
    } catch (err) {
      setError(err.message || 'Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isPending || submitted) {
    const displayDecision = submitted ? selectedDecision : applicant.decision;
    const displayNotes = submitted ? notes : applicant.decision_notes;

    async function handleRevoke() {
      if (!window.confirm('Revoke this decision and return to pending?')) return;
      setRevoking(true);
      try {
        await fetch(`${API_URL}/api/applicants/${applicant.id}/decision`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision: 'pending', decision_notes: null, decision_by: null }),
        });
        if (onDecisionSubmitted) onDecisionSubmitted();
      } finally {
        setRevoking(false);
      }
    }

    return (
      <div className="border border-gray-200 rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">Decision</h3>
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
            title="Revoke decision and return to pending"
          >
            {revoking ? 'Revoking…' : 'Revoke'}
          </button>
        </div>
        {submitted && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
            Decision recorded.
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-600 font-medium">Decision:</span>
          <StatusBadge status={displayDecision} type="decision" />
        </div>
        {displayNotes && (
          <p className="text-sm text-gray-600 mt-2"><span className="font-medium">Notes: </span>{displayNotes}</p>
        )}
        {applicant.decision_by && (
          <p className="text-sm text-gray-500 mt-1"><span className="font-medium">By: </span>{applicant.decision_by}</p>
        )}
        {applicant.decision_at && (
          <p className="text-sm text-gray-500 mt-1"><span className="font-medium">On: </span>{formatDate(applicant.decision_at)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Decision</h3>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { val: 'approved', label: 'Approve', active: 'border-green-600 bg-green-50 text-green-700', hover: 'hover:border-green-400' },
          { val: 'rejected', label: 'Reject', active: 'border-red-600 bg-red-50 text-red-700', hover: 'hover:border-red-400' },
          { val: 'info_requested', label: 'Request Info', active: 'border-yellow-500 bg-yellow-50 text-yellow-700', hover: 'hover:border-yellow-400' },
        ].map(({ val, label, active, hover }) => (
          <button
            key={val}
            onClick={() => setSelectedDecision(val)}
            className={`px-4 py-2 text-sm rounded border-2 font-medium ${
              selectedDecision === val ? active : `border-gray-200 text-gray-600 ${hover}`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-600">
            Notes{notesRequired ? ' (required)' : ''}
          </label>
          {showSuggestion && (
            <button
              type="button"
              onClick={handleGenerateSuggestion}
              disabled={suggestionLoading}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:text-blue-300 font-medium"
              title="AI will draft a message explaining what the applicant needs to provide"
            >
              {suggestionLoading ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full" />
                  Generating…
                </>
              ) : (
                <>✦ Generate Suggestion</>
              )}
            </button>
          )}
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400"
          placeholder={showSuggestion ? 'Click "Generate Suggestion" for an AI-drafted message, or type your own…' : 'Enter notes…'}
        />
        {suggestionError && (
          <p className="mt-1 text-xs text-red-600">{suggestionError}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">Your name</label>
        <input
          type="text"
          value={decisionBy}
          onChange={e => setDecisionBy(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400"
          placeholder="Full name"
        />
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2 px-4 rounded"
      >
        {submitting ? 'Submitting…' : 'Submit Decision'}
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ApplicantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [applicant, setApplicant] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadApplicant() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/applicants/${id}`);
      if (!res.ok) throw new Error(`Failed to load applicant: ${res.status}`);
      const data = await res.json();
      const { forms: formsData, ...applicantData } = data;
      setApplicant(applicantData);
      setForms(formsData || []);
    } catch (err) {
      setError(err.message || 'Failed to load applicant.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadApplicant(); }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
      </div>
    );
  }

  if (!applicant) return null;

  const isApproved = applicant.decision === 'approved';

  return (
    <div className={`min-h-screen bg-gray-100 p-6 ${isApproved ? 'pb-20' : ''}`}>
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="mb-5 text-sm text-blue-600 hover:underline flex items-center gap-1"
      >
        ← Back to Dashboard
      </button>

      {/* ── Lead Profile (full width) ── */}
      <div className="mb-6">
        <LeadProfile applicant={applicant} forms={forms} />
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT — Form data + Files */}
        <div className="flex-[3] space-y-6">

          {/* Form completion */}
          <div className="bg-white border border-gray-200 rounded p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Form Completion</h3>
            <FormChecklist applicant={applicant} />
          </div>

          {/* Raw form data — compact backup; all fields are shown in LeadProfile above */}
          <div className="bg-white border border-gray-200 rounded p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-1">Raw Form Data</h3>
            <p className="text-xs text-gray-400 mb-4">Unprocessed data exactly as received from MachForm.</p>
            <FormAccordion forms={forms} />
          </div>

          {/* Files */}
          <div className="bg-white border border-gray-200 rounded p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-1">Files & Documents</h3>
            <p className="text-xs text-gray-400 mb-4">
              Transcripts, diplomas, and any supporting documents for this applicant.
            </p>
            <FileAttachments applicantId={applicant.id} />
          </div>
        </div>

        {/* RIGHT — Eligibility + AI + Decision */}
        <div className="flex-[2] space-y-6">

          {/* Eligibility */}
          <div className="bg-white border border-gray-200 rounded p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Eligibility Status</h3>
            <StatusBadge status={applicant.eligibility_status} type="eligibility" large />
          </div>

          {/* AI Review */}
          <AIRecommendation applicant={applicant} />

          {/* Decision */}
          <DecisionPanel applicant={applicant} onDecisionSubmitted={loadApplicant} />

          {/* Acceptance Letter — only shown after approval */}
          {isApproved && (
            <AcceptanceLetter applicant={applicant} />
          )}
        </div>
      </div>

      {/* Sticky admission progress timeline — only when approved */}
      {isApproved && (
        <AdmissionTimeline applicantId={applicant.id} activeStep={0} />
      )}
    </div>
  );
}
