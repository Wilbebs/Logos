/**
 * AcceptanceLetterPage  /applicants/:id/acceptance
 *
 * Gmail-style header (From / To / Subject) with a Word-document shell
 * as the body. The document area looks like a real letter page — white
 * paper, drop shadow, serif font, margins — so what you see is close to
 * what the .docx attachment will look like.
 *
 * Flow:
 *  1. Load applicant data, pre-fill fields.
 *  2. "Generate Letter" → Gemini drafts the body.
 *  3. User edits in the document shell (contentEditable).
 *  4. "Send Letter" → backend sends email with .docx attached.
 */
import React, { useState, useEffect, useRef } from 'react';
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

// ── Word document shell ───────────────────────────────────────────────────────
// Looks like a sheet of paper in a Word processor window.
// Uses contentEditable so it feels like typing in a doc.
function DocShell({ value, onChange, placeholder, disabled }) {
  const ref = useRef(null);

  // Sync external value into the div (e.g. after generation)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Only overwrite if content actually changed to avoid caret jump on every keystroke
    const current = el.innerText;
    if (current !== value) {
      el.innerText = value || '';
      // Move caret to end
      const range = document.createRange();
      const sel   = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [value]);

  function handleInput(e) {
    onChange(e.currentTarget.innerText);
  }

  return (
    // Gray canvas — like Word's "behind the paper" area
    <div className="bg-gray-200 px-6 py-8 overflow-y-auto" style={{ minHeight: '600px' }}>
      {/* Paper sheet */}
      <div
        className="mx-auto bg-white shadow-xl relative"
        style={{
          width: '680px',
          minHeight: '880px',
          padding: '80px 96px',
        }}
      >
        {/* Placeholder */}
        {!value && !disabled && (
          <p
            className="absolute pointer-events-none select-none"
            style={{
              top: '80px', left: '96px',
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '12pt',
              lineHeight: '1.8',
              color: '#bbb',
            }}
          >
            {placeholder || 'Click Generate Letter or start typing…'}
          </p>
        )}

        {/* Editable body */}
        <div
          ref={ref}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={handleInput}
          spellCheck
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '12pt',
            lineHeight: '1.8',
            color: '#1a1a1a',
            outline: 'none',
            minHeight: '720px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        />
      </div>
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

  // ── Loading / error ─────────────────────────────────────────────────────────
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

  // ── Success ─────────────────────────────────────────────────────────────────
  if (sendResult?.success) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto text-3xl font-bold text-green-600">✓</div>
          <h2 className="text-xl font-bold text-gray-800">Letter Sent!</h2>
          <p className="text-sm text-gray-600">
            The acceptance letter was sent to <span className="font-medium">{to}</span> with a Word document attached.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button onClick={() => navigate(`/applicants/${id}`)} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded">
              Back to Application
            </button>
            <button onClick={() => navigate('/')} className="w-full border border-gray-300 text-gray-600 hover:border-gray-400 text-sm font-medium py-2.5 rounded">
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
          <button onClick={() => setSendResult(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded">
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
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Back
        </button>
        <p className="text-xs text-gray-400">LOGOS Admissions — Acceptance Letter</p>
      </div>

      <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-6 py-6 gap-4">

        {/* Timeline */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5 shrink-0">
          <Timeline active={1} />
        </div>

        {/* Applicant chip */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <p className="text-sm font-bold text-gray-800">{applicant?.full_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{applicant?.program_applied} · {applicant?.email}</p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full">Approved</span>
        </div>

        {/* Email compose card */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">

          {/* Card header */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
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
                <><span className="animate-spin inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" /> Generating...</>
              ) : (
                <>{body ? '↺ Regenerate Letter' : '✦ Generate Letter'}</>
              )}
            </button>
          </div>

          {genError && (
            <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600 shrink-0">{genError}</div>
          )}

          {/* Gmail-style address fields */}
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
                placeholder="Congratulations! Acceptance to LOGOS University" />
            </div>
          </div>

          {/* ── Word document shell ── */}
          <div className="border-t border-gray-100">
            <DocShell
              value={body}
              onChange={setBody}
              disabled={generating}
              placeholder="Click Generate Letter or start typing your acceptance letter..."
            />
          </div>

          {/* Send bar */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>📄</span>
              <span>Word document (.docx) will be auto-attached on send</span>
            </div>
            <div className="flex items-center gap-3">
              {sendError && <p className="text-xs text-red-600">{sendError}</p>}
              <button onClick={() => navigate(`/applicants/${id}`)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-2">
                Cancel
              </button>
              <button
                onClick={sendLetter}
                disabled={sending || !body.trim()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {sending ? (
                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Sending...</>
                ) : (
                  <>✉ Send Letter</>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
