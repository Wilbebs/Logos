import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, Send } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

const primary   = '#7B2335';
const primaryDk = '#6A1B2A';
const navy      = '#1B3272';

function MessageContent({ text }) {
  const raw = text.split('\n');
  const lines = [];
  for (let i = 0; i < raw.length; i++) {
    const trimmed = raw[i].trim();
    if ((trimmed === '✓' || trimmed === '✗') && i + 1 < raw.length) {
      lines.push(trimmed + ' ' + raw[i + 1].trim());
      i++;
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
            <span key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <span style={{ fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>✓</span>
              <span style={{ color: '#374151' }}>{label}</span>
              {!isLast && '\n'}
            </span>
          );
        }
        if (isCross) {
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
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

export default function ChatBot() {
  const { t, lang } = useLanguage();
  const [open, setOpen]         = useState(false);
  const greeting = lang === 'es'
    ? "¡Hola! Soy tu asistente de admisiones. Puedes preguntarme:\n• \"Muéstrame la solicitud de Fernando Mendes\"\n• \"¿Cuántos solicitantes necesitan revisión?\"\n• \"¿Es María elegible para la Maestría?\""
    : "Hi! I'm your admissions assistant. You can ask me things like:\n• \"Show me Fernando Mendes's application\"\n• \"How many applicants need review?\"\n• \"Is Maria eligible for the Master's program?\"";
  const [messages, setMessages] = useState([{ role: 'assistant', content: greeting }]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

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
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          language: lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
      const reply  = data.reply || data.message || '(No response)';
      const action = data.action || null;
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ backgroundColor: open ? primaryDk : primary }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
        aria-label="Open admissions assistant"
      >
        {open
          ? <X size={20} />
          : <Sparkles size={20} />
        }
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col shadow-2xl rounded-2xl overflow-hidden"
          style={{ border: '1px solid #E5E7EB' }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ backgroundColor: primary }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t('chat.title')}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {t('chat.subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={15} className="text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96" style={{ backgroundColor: '#F8F8FB' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap"
                  style={
                    msg.role === 'user'
                      ? { backgroundColor: primary, color: '#fff', borderBottomRightRadius: 4 }
                      : msg.isError
                      ? { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', borderBottomLeftRadius: 4 }
                      : { backgroundColor: '#fff', border: '1px solid #E5E7EB', color: '#1B2340', borderBottomLeftRadius: 4 }
                  }
                >
                  {msg.role === 'assistant' && !msg.isError
                    ? <MessageContent text={msg.content} />
                    : msg.content}
                  {msg.action?.type === 'navigate' && msg.action.path && (
                    <Link
                      to={msg.action.path}
                      className="block mt-2 text-xs font-semibold underline"
                      style={{ color: navy }}
                    >
                      Open Application →
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="text-sm px-3.5 py-2.5 rounded-2xl flex items-center gap-2"
                  style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', color: '#9CA3AF', borderBottomLeftRadius: 4 }}
                >
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: primary, borderTopColor: 'transparent' }}
                  />
                  Thinking…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder={t('chat.placeholder')}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none transition-colors"
              style={{ maxHeight: 96 }}
              onFocus={e => e.target.style.borderColor = primary}
              onBlur={e => e.target.style.borderColor = '#D1D5DB'}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              style={{
                backgroundColor: loading || !input.trim() ? '#E5C5CB' : primary,
                color: '#fff',
              }}
            >
              <Send size={15} />
            </button>
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-white border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              {t('chat.disclaimer')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
