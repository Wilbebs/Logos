import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * AcceptanceLetter
 * Shown on the ApplicantDetail page only when decision === 'approved'.
 * Lets an admin generate an AI-drafted acceptance letter from a template,
 * preview it, and (future) send or download it.
 */
export default function AcceptanceLetter({ applicant }) {
  const [status, setStatus]   = useState('idle');   // idle | generating | ready | error
  const [letter, setLetter]   = useState('');
  const [error, setError]     = useState('');
  const [copied, setCopied]   = useState(false);

  async function handleGenerate() {
    setStatus('generating');
    setError('');
    setLetter('');
    try {
      const res = await fetch(`${API_URL}/api/applicants/${applicant.id}/acceptance-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
      setLetter(data.letter || '');
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'Failed to generate letter.');
      setStatus('error');
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-700">Acceptance Letter</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            AI-drafted from template — review before sending.
          </p>
        </div>
        {/* Status pill */}
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
          Approved
        </span>
      </div>

      {/* Generate button (idle / error) */}
      {(status === 'idle' || status === 'error') && (
        <button
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded border-2 border-dashed border-blue-300 text-blue-600 text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          <span>✦</span>
          Generate Acceptance Letter
        </button>
      )}

      {/* Generating state */}
      {status === 'generating' && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
          Drafting letter…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
          {error}
        </div>
      )}

      {/* Letter preview */}
      {status === 'ready' && letter && (
        <div className="mt-3 space-y-3">
          <textarea
            value={letter}
            onChange={e => setLetter(e.target.value)}
            rows={12}
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:border-blue-400 font-mono"
          />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-1.5 px-3 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {copied ? '✓ Copied' : 'Copy Text'}
            </button>

            {/* Future: download as PDF */}
            <button
              disabled
              title="PDF export — coming soon"
              className="flex-1 py-1.5 px-3 text-sm rounded border border-gray-200 text-gray-400 cursor-not-allowed"
            >
              Download PDF
            </button>

            {/* Future: send via email */}
            <button
              disabled
              title="Send via email — coming soon"
              className="flex-1 py-1.5 px-3 text-sm rounded border border-gray-200 text-gray-400 cursor-not-allowed"
            >
              Send Email
            </button>
          </div>

          <button
            onClick={handleGenerate}
            className="text-xs text-blue-500 hover:underline"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
