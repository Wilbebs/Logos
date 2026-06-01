/**
 * AcceptanceLetterPage  /applicants/:id/acceptance
 *
 * Gmail-style compose header (From / To / Subject) wrapping a rendered
 * email body. The email body contains:
 *   1. Editable preamble text  (will become a template)
 *   2. Embedded Word document shell  (the letter itself, .docx attachment)
 *   3. Editable sign-off text  (will become a template)
 *
 * Flow:
 *  1. Load applicant data, pre-fill header + preamble + sign-off defaults.
 *  2. "Generate Letter" → Gemini drafts the letter body inside the doc shell.
 *  3. User edits freely — preamble, doc, sign-off are all contentEditable.
 *  4. "Send Letter" → backend sends email (preamble+signoff as email text)
 *     with the letter as a .docx attachment.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdmissionTimeline from '../components/AdmissionTimeline.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── Editable plain-text block (preamble / sign-off) ──────────────────────────
function EditableBlock({ value, onChange, placeholder, disabled, minHeight = '60px' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerText !== value) {
      el.innerText = value || '';
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onInput={e => onChange(e.currentTarget.innerText)}
      spellCheck
      data-placeholder={placeholder}
      style={{
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '13.5px',
        lineHeight: '1.7',
        color: value ? '#374151' : '#9ca3af',
        outline: 'none',
        minHeight,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
      onFocus={e => { if (!value) e.currentTarget.style.color = '#374151'; }}
      onBlur={e => { if (!e.currentTarget.innerText.trim()) e.currentTarget.style.color = '#9ca3af'; }}
    />
  );
}

// ── Word document shell ───────────────────────────────────────────────────────
// White paper page embedded inside the email body — mimics a Word doc.
function DocShell({ value, onChange, placeholder, disabled }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const current = el.innerText;
    if (current !== value) {
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
    // Gray canvas — Word's "behind the paper" area
    <div className="bg-gray-200 px-4 sm:px-8 py-6 sm:py-8">
      {/* Paper sheet — responsive width, max 640px */}
      <div
        className="mx-auto bg-white shadow-xl relative"
        style={{ maxWidth: '640px', width: '100%', minHeight: '820px', padding: '72px 64px' }}
      >
        {/* Placeholder */}
        {!value && !disabled && (
          <p className="absolute pointer-events-none select-none" style={{
            top: '72px', left: '64px', right: '64px',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '12pt', lineHeight: '1.8', color: '#bbb',
          }}>
            {placeholder || 'Click Generate Letter or start typing…'}
          </p>
        )}
        {/* Editable letter body */}
        <div
          ref={ref}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={e => onChange(e.currentTarget.innerText)}
          spellCheck
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '12pt',
            lineHeight: '1.8',
            color: '#1a1a1a',
            outline: 'none',
            minHeight: '680px',
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

  // Email envelope fields
  const [from,    setFrom]    = useState('admissions@logos.edu');
  const [to,      setTo]      = useState('');
  const [subject, setSubject] = useState('');

  // Email body sections (all editable)
  const [preamble, setPreamble] = useState('');
  const [body,     setBody]     = useState('');
  const [signoff,  setSignoff]  = useState('');

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
        setPreamble(
          `Dear ${data.full_name || 'Applicant'},\n\n` +
          `Please find your official acceptance letter from LOGOS Christian University attached below. ` +
          `We are delighted to welcome you into our community of scholars and ministers of the Gospel.`
        );
        setSignoff(
          `Should you have any questions regarding your acceptance or the enrollment process, ` +
          `please do not hesitate to reach out to our admissions office.\n\n` +
          `Blessings,\nLOGOS Admissions Office\nadmissions@logos.edu`
        );
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
        body: JSON.stringify({ from, to, subject, body, emailPreamble: preamble, emailSignoff: signoff }),
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
            <button onClick={() => navigate(`/applicants/${id}`)}
              className="w-full text-white text-sm font-semibold py-2.5 rounded"
              style={{ backgroundColor: '#7B2D3E' }}>
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
    <div className="min-h-screen bg-gray-50 pb-20 flex flex-col">

      {/* Top nav — breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Dashboard
        </button>
        <span className="text-gray-300 text-sm">›</span>
        <button
          onClick={() => navigate(`/applicants/${id}`)}
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors truncate max-w-[160px]"
          title={applicant?.full_name}
        >
          {applicant?.full_name || 'Applicant'}
        </button>
        <span className="text-gray-300 text-sm">›</span>
        <span className="text-sm font-semibold text-gray-700">Acceptance Letter</span>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-0.5 rounded-full">
            Approved
          </span>
          {applicant?.program_applied && (
            <span className="hidden sm:inline text-xs text-gray-400 truncate max-w-[200px]">
              {applicant.program_applied}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 gap-4">

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
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-50 transition-colors"
              style={{
                backgroundColor: generating ? '#f9fafb' : '#fdf2f3',
                borderColor: '#e8c4c9',
                color: '#7B2D3E',
              }}
            >
              {generating ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-t-transparent rounded-full"
                    style={{ borderColor: '#7B2D3E', borderTopColor: 'transparent' }} />
                  Generating...
                </>
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

          {/* ── Email body: preamble → doc → sign-off ── */}
          <div className="border-t border-gray-100 bg-gray-50">

            {/* Rendered email body wrapper */}
            <div
              className="mx-auto my-6 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
              style={{ maxWidth: '760px' }}
            >
              {/* Email header stripe — brand maroon */}
              <div className="px-8 py-4 flex items-center gap-3" style={{ backgroundColor: '#7B2D3E' }}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">L</div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">LOGOS Christian University</p>
                  <p className="text-xs" style={{ color: '#f0c4cc' }}>Office of Admissions · admissions@logos.edu</p>
                </div>
              </div>

              {/* Preamble — editable email intro text */}
              <div className="px-8 pt-6 pb-4">
                <EditableBlock
                  value={preamble}
                  onChange={setPreamble}
                  disabled={generating}
                  placeholder="Write an email introduction here…"
                  minHeight="72px"
                />
              </div>

              {/* Document attachment label */}
              <div className="px-8 pb-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded px-2.5 py-1">
                  <span>📄</span>
                  <span className="font-medium">
                    Acceptance_Letter_{(applicant?.full_name || 'Applicant').replace(/\s+/g, '_')}.docx
                  </span>
                  <span className="text-gray-400 ml-1">· attached</span>
                </div>
              </div>

              {/* Embedded document shell */}
              <DocShell
                value={body}
                onChange={setBody}
                disabled={generating}
                placeholder="Click Generate Letter or start typing your acceptance letter…"
              />

              {/* Sign-off — editable closing text */}
              <div className="px-8 py-6 border-t border-gray-100">
                <EditableBlock
                  value={signoff}
                  onChange={setSignoff}
                  disabled={generating}
                  placeholder="Write a closing message here…"
                  minHeight="60px"
                />
              </div>
            </div>
          </div>

          {/* Send bar */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>📄</span>
              <span className="hidden sm:inline">Word document (.docx) will be auto-attached on send</span>
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
                className="flex items-center gap-2 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#7B2D3E' }}
                onMouseEnter={e => { if (!sending && body.trim()) e.currentTarget.style.backgroundColor = '#6a2535'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#7B2D3E'; }}
              >
                {sending ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </>
                ) : (
                  <>✉ Send Letter</>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Sticky admission timeline */}
      {applicant && <AdmissionTimeline applicantId={id} activeStep={1} />}
    </div>
  );
}
