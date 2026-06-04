/**
 * DecisionEmailPage  /applicants/:id/rejection-email
 *                   /applicants/:id/info-request-email
 *
 * Simple email compose page for rejection and info-request decisions.
 * No Word doc shell — just an email with From/To/Subject + editable body.
 * Gemini drafts the body based on the applicant's situation and decision notes.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── Config by type ────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  rejection: {
    label:          'Rejection Email',
    headerColor:    '#7B2D3E',
    headerBg:       '#fdf6f7',
    accentClass:    'border-red-300 bg-red-50',
    badgeClass:     'bg-red-100 text-red-700',
    badge:          'Rejected',
    placeholder:    'Click "Generate Email" to draft a compassionate rejection, or write your own…',
    successMessage: 'Rejection email sent.',
  },
  info_request: {
    label:          'Information Request Email',
    headerColor:    '#92740a',
    headerBg:       '#fffdf0',
    accentClass:    'border-yellow-300 bg-yellow-50',
    badgeClass:     'bg-yellow-100 text-yellow-700',
    badge:          'Info Requested',
    placeholder:    'Click "Generate Email" to draft an information request, or write your own…',
    successMessage: 'Information request email sent.',
  },
};

// ── Editable email body ───────────────────────────────────────────────────────
function EmailBody({ value, onChange, placeholder, disabled }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerText !== value) {
      el.innerText = value || '';
      const range = document.createRange();
      const sel   = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [value]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 min-h-64">
      {!value && !disabled && (
        <p className="pointer-events-none select-none text-sm text-gray-300 absolute"
           style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
          {placeholder}
        </p>
      )}
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={e => onChange(e.currentTarget.innerText)}
        spellCheck
        style={{
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '14px',
          lineHeight: '1.75',
          color: '#1a1a1a',
          outline: 'none',
          minHeight: '200px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DecisionEmailPage() {
  const { id, type } = useParams();   // type = 'rejection' | 'info-request'
  const navigate     = useNavigate();

  // Normalise URL param → internal key
  const emailType = type === 'info-request' ? 'info_request' : 'rejection';
  const cfg = TYPE_CONFIG[emailType] || TYPE_CONFIG.rejection;

  const [applicant,   setApplicant]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [loadErr,     setLoadErr]     = useState('');

  const [from,    setFrom]    = useState('admissions@logos.edu');
  const [to,      setTo]      = useState('');
  const [subject, setSubject] = useState('');
  const [body,    setBody]    = useState('');

  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState('');
  const [sending,    setSending]    = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError,  setSendError]  = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`${API_URL}/api/applicants/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setApplicant(data);
        setTo(data.email || '');
      } catch (err) {
        setLoadErr(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function generateEmail() {
    setGenerating(true);
    setGenError('');
    try {
      const res  = await fetch(`${API_URL}/api/applicants/${id}/decision-email/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: emailType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setSubject(data.subject || subject);
      setBody(data.body || '');
    } catch (err) {
      setGenError(err.message || 'Failed to generate email');
    } finally {
      setGenerating(false);
    }
  }

  async function sendEmail() {
    if (!body.trim()) { setSendError('Email body cannot be empty.'); return; }
    if (!to.trim())   { setSendError('Recipient email is required.'); return; }
    setSending(true);
    setSendError('');
    setSendResult(null);
    try {
      const res  = await fetch(`${API_URL}/api/applicants/${id}/decision-email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: emailType, from, to, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Send failed');
      setSendResult(data);
    } catch (err) {
      setSendError(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  // ── Loading / error ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500">Loading…</p>
    </div>
  );
  if (loadErr) return (
    <div className="min-h-screen bg-gray-100 p-6">
      <p className="text-red-600">{loadErr}</p>
    </div>
  );

  // ── Success ─────────────────────────────────────────────────────────────────
  if (sendResult?.success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto text-3xl font-bold text-green-600">✓</div>
          <h2 className="text-xl font-bold text-gray-800">Email Sent</h2>
          <p className="text-sm text-gray-600">{cfg.successMessage} Sent to <span className="font-medium">{to}</span>.</p>
          <div className="flex flex-col gap-2 pt-2">
            <button onClick={() => navigate(`/applicants/${id}`)}
              className="w-full text-white text-sm font-semibold py-2.5 rounded"
              style={{ backgroundColor: '#7B2D3E' }}>
              Back to Application
            </button>
            <button onClick={() => navigate('/')}
              className="w-full border border-gray-300 text-gray-600 hover:border-gray-400 text-sm font-medium py-2.5 rounded">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Blocked ─────────────────────────────────────────────────────────────────
  if (sendResult && !sendResult.success && sendResult.blocked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto text-3xl">⚠</div>
          <h2 className="text-xl font-bold text-gray-800">Email Blocked</h2>
          <p className="text-sm text-gray-600">{sendResult.message}</p>
          <button onClick={() => setSendResult(null)}
            className="w-full text-white text-sm font-semibold py-2.5 rounded"
            style={{ backgroundColor: '#7B2D3E' }}>
            Back to Compose
          </button>
        </div>
      </div>
    );
  }

  // ── Compose ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <button onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          ← Back
        </button>
        <p className="text-xs text-gray-400">LOGOS Admissions — {cfg.label}</p>
      </div>

      <div className="flex flex-col flex-1 max-w-4xl mx-auto w-full px-6 py-6 gap-4">

        {/* Applicant chip */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-bold text-gray-800">{applicant?.full_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{applicant?.program_applied} · {applicant?.email}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badgeClass}`}>
            {cfg.badge}
          </span>
        </div>

        {/* Compose card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">

          {/* Header */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-sm font-bold text-gray-800">{cfg.label}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Edit any field before sending</p>
            </div>
            <button
              onClick={generateEmail}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <><span className="animate-spin inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" /> Generating…</>
              ) : (
                <>{body ? '↺ Regenerate' : '✦ Generate Email'}</>
              )}
            </button>
          </div>

          {genError && (
            <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600 shrink-0">{genError}</div>
          )}

          {/* Address fields */}
          <div className="divide-y divide-gray-100 shrink-0">
            <div className="flex items-center px-6 py-2.5 gap-4 hover:bg-gray-50">
              <span className="text-xs font-semibold text-gray-400 w-16 shrink-0 uppercase tracking-wide">From</span>
              <input type="email" value={from} onChange={e => setFrom(e.target.value)}
                className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none"
                placeholder="admissions@logos.edu" />
            </div>
            <div className="flex items-center px-6 py-2.5 gap-4 hover:bg-gray-50">
              <span className="text-xs font-semibold text-gray-400 w-16 shrink-0 uppercase tracking-wide">To</span>
              <input type="email" value={to} onChange={e => setTo(e.target.value)}
                className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none"
                placeholder="applicant@email.com" />
            </div>
            <div className="flex items-center px-6 py-2.5 gap-4 hover:bg-gray-50">
              <span className="text-xs font-semibold text-gray-400 w-16 shrink-0 uppercase tracking-wide">Subject</span>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none font-medium"
                placeholder={emailType === 'rejection'
                  ? 'Your Application to LOGOS Christian University'
                  : 'Additional Information Needed — Your LOGOS Application'} />
            </div>
          </div>

          {/* Email body */}
          <div className="px-6 py-4 border-t border-gray-100 relative">
            <EmailBody
              value={body}
              onChange={setBody}
              disabled={generating}
              placeholder={cfg.placeholder}
            />
          </div>

          {/* Send bar */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 shrink-0">
            <p className="text-xs text-gray-400">This email will be sent directly to the applicant.</p>
            <div className="flex items-center gap-3">
              {sendError && <p className="text-xs text-red-600">{sendError}</p>}
              <button onClick={() => navigate(`/applicants/${id}`)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-2">
                Cancel
              </button>
              <button
                onClick={sendEmail}
                disabled={sending || !body.trim()}
                className="flex items-center gap-2 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-40"
                style={{ backgroundColor: '#7B2D3E' }}
              >
                {sending ? (
                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Sending…</>
                ) : (
                  <>✉ Send Email</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
