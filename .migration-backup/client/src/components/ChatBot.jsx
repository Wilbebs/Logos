import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Render assistant message content with ✓/✗ checklist lines colored.
// Handles both "✓ label" on one line AND Gemini splitting symbol / label across two lines.
function MessageContent({ text }) {
  // Pre-process: merge a lone ✓ or ✗ line with the following line
  const raw = text.split('\n');
  const lines = [];
  for (let i = 0; i < raw.length; i++) {
    const trimmed = raw[i].trim();
    if ((trimmed === '✓' || trimmed === '✗') && i + 1 < raw.length) {
      lines.push(trimmed + ' ' + raw[i + 1].trim());
      i++; // skip the next line since we merged it
    } else {
      lines.push(raw[i]);
    }
  }

  return (
    <span>
      {lines.map((line, i) => {
        const t       = line.trimStart();
        const isCheck = t.startsWith('✓');
        const isCross = t.startsWith('✗');
        const isLast  = i === lines.length - 1;
        const label   = t.slice(1).trimStart();

        if (isCheck) {
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>✓</span>
              <span style={{ color: '#374151' }}>{label}</span>
              {!isLast && '\n'}
            </span>
          );
        }
        if (isCross) {
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
              <span style={{ fontWeight: 700, color: '#ef4444', flexShrink: 0 }}>✗</span>
              <span style={{ color: '#b91c1c', fontWeight: 500 }}>{label}</span>
              {!isLast && '\n'}
            </span>
          );
        }
        return <span key={i}>{line}{!isLast && '\n'}</span>;
      })}
    </span>
  );
}

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * ChatBot
 * A floating chat widget mounted globally in App.jsx.
 * Has access to the backend /api/chat endpoint which can query Supabase and
 * navigate the app (future). For now it sends messages and streams responses.
 */
export default function ChatBot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your admissions assistant. You can ask me things like:\n• \"Show me Fernando Mendes's application\"\n• \"How many applicants need review?\"\n• \"Is Maria eligible for the Master's program?\"",
    },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);

      const reply = data.reply || data.message || '(No response)';
      const action = data.action || null; // future: { type: 'navigate', path: '/applicants/123' }

      setMessages(prev => [...prev, { role: 'assistant', content: reply, action }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}`, isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* ── Floating button ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center text-2xl transition-transform active:scale-95"
        aria-label="Open admissions assistant"
      >
        {open ? '✕' : '✦'}
      </button>

      {/* ── Chat panel ──────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col shadow-2xl rounded-xl overflow-hidden border border-gray-200 bg-white">

          {/* Header */}
          <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Admissions Assistant</p>
              <p className="text-xs text-blue-200">Ask about any applicant or stat</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white text-lg">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : msg.isError
                      ? 'bg-red-50 border border-red-200 text-red-700 rounded-bl-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {msg.role === 'assistant' && !msg.isError
                    ? <MessageContent text={msg.content} />
                    : msg.content}
                  {msg.action?.type === 'navigate' && msg.action.path && (
                    <Link
                      to={msg.action.path}
                      className="block mt-2 text-xs font-medium text-blue-600 underline hover:text-blue-800"
                    >
                      Open Application →
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 text-gray-400 text-sm px-3 py-2 rounded-lg rounded-bl-none flex items-center gap-1.5">
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full" />
                  Thinking…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Ask anything…"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm rounded font-medium"
            >
              Send
            </button>
          </div>

          {/* Footer note */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              AI assistant — verify important info in the dashboard
            </p>
          </div>
        </div>
      )}
    </>
  );
}
