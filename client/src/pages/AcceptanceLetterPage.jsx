/**
 * AcceptanceLetterPage  /applicants/:id/acceptance
 *
 * Gmail-style compose UI for sending a formal acceptance letter.
 * 1. Loads applicant data.
 * 2. "Generate Letter" calls the backend for an AI-drafted letter.
 * 3. User edits From / To / Subject / Body freely.
 * 4. "Send" posts the final version — backend attaches a .docx and sends via Resend.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── Timeline ──────────────────────────────────────────────────────────────────
function Timeline({ active }) {
  const steps = ['Application', 'Acceptance Letter'];
  return (
    <div className="flex items-center text-xs">
      {steps.map((step, i) => {
        const done    = i < active;
        const current = i === active;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                done    ? 'bg-green-600 text-white'
                : current ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                : 'bg-gray-200 text-gray-500'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`mt-1 font-medium ${
                done ? 'text-green-700' : current ? 'text-blue-700' : 'text-gray-400'
              }`}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mb-4 ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AcceptanceLetterPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [applicant, setApplicant] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [loadErr,   setLoadErr]   = useState('');

  // Compose fields
  const [from,    setFrom]    = useState('admissions@logos.edu');
  const [to,      setTo]      = useState('');
  const [subject, setSubject] = useState('');
  const [body,    setBody]    = useState('');

  // UI state
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState('');
  const [sending,    setSending]    = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError,  setSendError]  = useState('');

  // Load applicant
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`${API_URL}/api/applicants/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setApplicant(data);
        setTo(data.email || '');
        setSubject('Congratulations! Acceptance to ' + (data.program_applied || 'LOGOS University'));
      } catch (err) {
        setLoadErr(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function generateLetter() {
    setGenerating(true);
    setGenError('');
    try {
      const res  = await fetch(`${API_URL}/api/applicants/${id}/acceptance/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setSubject(data.subject || subject);
      setBody(data.body || '');
    } catch (err) {
      setGenError(err.message || 'Failed to generate letter');
    } finally {
      setGenerating(false);
    }
  }

  async function sendLetter() {
    if (!body.trim()) { setSendError('Letter body cannot be empty.'); return; }
    if (!to.trim())   { setSendError('Recipient email is required.'); return; }
    setSending(true);
    setSendError('');
    setSendResult(null);
    try {
      const res  = await fetch(`${API_URL}/api/applicants/${id}/acceptance/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, body }),
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

  // ── States ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  if (loadErr) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <p className="text-red-600">{loadErr}</p>
      </div>
    );
  }

  if (sendResult?.success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto text-3xl text-green-600 font-bold">
            &#10003;
          </div>
          <h2 className="text-xl font-bold text-gray-800">Letter Sent!</h2>
          <p className="text-sm text-gray-600">
            The acceptance letter was sent to{' '}
            <span className="font-medium">{to}</span> with a Word document attached.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => navigate(`/applicants/${id}`)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded"
            >
              Back to Application
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full border border-gray-300 text-gray-600 hover:border-gray-400 text-sm font-medium py-2.5 rounded"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (sendResult && !sendResult.success && sendResult.blocked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto text-3xl">&#9888;</div>
          <h2 className="text-xl font-bold text-gray-800">Email Blocked</h2>
          <p className="text-sm text-gray-600">{sendResult.message}</p>
          <button
            onClick={() => setSendResult(null)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded"
          >
            Back to Compose
          </button>
        </div>
      </div>
    );
  }

  // ── Compose UI ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100">

      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(`/applicants/${id}`)}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          &larr; Back to Application
        </button>
        <p className="text-xs text-gray-400">LOGOS Admissions</p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
          <Timeline active={1} />
        </div>

        {/* Applicant chip */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">{applicant?.full_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {applicant?.program_applied} &middot; {applicant?.email}
            </p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">
            Approved
          </span>
        </div>

        {/* Compose panel */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

          {/* Panel header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Compose Acceptance Letter</h2>
              <p className="text-xs text-gray-400 mt-0.5">Edit any field freely before sending</p>
            </div>
            <button
              onClick={generateLetter}
              disabled={generating}
              className="flex items-center gap-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                  Generating...
                </>
              ) : (
                <>{body ? 'Regenerate Letter' : '✦ Generate Letter'}</>
              )}
            </button>
          </div>

          {genError && (
            <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600">
              {genError}
            </div>
          )}

          {/* Gmail-style field rows */}
          <div className="divide-y divide-gray-100">

            {/* From */}
            <div className="flex items-center px-6 py-3 gap-4 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-semibold text-gray-400 w-14 shrink-0 uppercase tracking-wide">From</span>
              <input
                type="email"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none"
                placeholder="admissions@logos.edu"
              />
            </div>

            {/* To */}
            <div className="flex items-center px-6 py-3 gap-4 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-semibold text-gray-400 w-14 shrink-0 uppercase tracking-wide">To</span>
              <input
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none"
                placeholder="applicant@email.com"
              />
            </div>

            {/* Subject */}
            <div className="flex items-center px-6 py-3 gap-4 hover:bg-gray-50 transition-colors">
              <span className="text-xs font-semibold text-gray-400 w-14 shrink-0 uppercase tracking-wide">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="flex-1 text-sm text-gray-800 bg-transparent focus:outline-none font-medium"
                placeholder="Congratulations! Acceptance to LOGOS University"
              />
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 border-t border-gray-100 min-h-64">
            {!body && !generating && (
              <div className="flex flex-col items-center justify-center py-10 text-center pointer-events-none">
                <p className="text-2xl mb-2 text-gray-300">&#9998;</p>
                <p className="text-sm font-medium text-gray-400">No letter yet</p>
                <p className="text-xs text-gray-300 mt-1">
                  Click <span className="font-semibold text-blue-500">Generate Letter</span> for an AI draft, or type below
                </p>
              </div>
            )}
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={body ? 20 : 3}
              placeholder={body ? '' : 'Type your letter here...'}
              className="w-full text-sm text-gray-800 bg-transparent resize-none focus:outline-none leading-relaxed placeholder-gray-300"
              style={{ fontFamily: 'Georgia, serif' }}
            />
          </div>

          {/* Footer / send bar */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>&#128196;</span>
              <span>A Word document (.docx) will be auto-attached on send</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {sendError && (
                <p className="text-xs text-red-600">{sendError}</p>
              )}
              <button
                onClick={() => navigate(`/applicants/${id}`)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-2"
              >
                Cancel
              </button>
              <button
                onClick={sendLetter}
                disabled={sending || !body.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {sending ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </>
                ) : (
                  <>&#9993; Send Letter</>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
