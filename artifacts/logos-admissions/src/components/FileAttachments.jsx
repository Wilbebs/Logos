/**
 * FileAttachments
 *
 * Two-tab document hub for an applicant:
 *   Documents      — all uploaded files (transcripts, diplomas, generated letters…)
 *                    Each file row shows a subtle category badge.
 *   Communications — email log with subject, status, date, and expandable body
 */
import React, { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

// ── Helpers ───────────────────────────────────────────────────────────────────
const FILE_ICONS = {
  'application/pdf': '📄',
  'image/jpeg': '🖼', 'image/png': '🖼', 'image/gif': '🖼', 'image/webp': '🖼',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
};
function fileIcon(mime) { return FILE_ICONS[mime] || '📎'; }
function formatBytes(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(str) {
  if (!str) return '';
  return new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const STATUS_STYLES = {
  sent:    'bg-green-100 text-green-700',
  blocked: 'bg-yellow-100 text-yellow-700',
  failed:  'bg-red-100 text-red-700',
};
const EMAIL_LABELS = {
  form1_received:    'Form 1 Received',
  form2_received:    'Form 2 Received',
  form3_received:    'Form 3 Received',
  approved:          'Approval Notification',
  rejected:          'Rejection Notification',
  info_requested:    'Info Requested',
  acceptance_letter: 'Acceptance Letter',
};

const CATEGORY_LABELS = {
  applicant_documents: 'Applicant',
  admission_documents: 'Admission',
  other:               'Other',
};

function categoryFromPath(path) {
  if (!path) return 'other';
  return path.split('/')[2] || 'other';
}

// ── All-files list ────────────────────────────────────────────────────────────
function FileList({ files, onDelete, deletingId }) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-2xl mb-2">📂</p>
        <p className="text-sm text-gray-400">No documents uploaded yet.</p>
        <p className="text-xs text-gray-300 mt-1">Drag a file below or click to browse.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {files.map(f => {
        const cat = f.category || categoryFromPath(f.file_path);
        const catLabel = CATEGORY_LABELS[cat];
        return (
          <li key={f.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors">
            <span className="text-xl shrink-0">{fileIcon(f.file_type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate" title={f.file_name}>{f.file_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatBytes(f.file_size)}
                {f.uploaded_at && ` · ${formatDate(f.uploaded_at)}`}
                {f.uploaded_by && f.uploaded_by !== 'system' && ` · ${f.uploaded_by}`}
                {f.uploaded_by === 'system' && ' · Auto-generated'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {catLabel && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full hidden sm:inline">
                  {catLabel}
                </span>
              )}
              {f.file_url && (
                <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline font-medium">
                  Open
                </a>
              )}
              <button onClick={() => onDelete(f.id)} disabled={deletingId === f.id}
                className="text-xs text-red-400 hover:text-red-600 disabled:text-gray-300 transition-colors">
                {deletingId === f.id ? '…' : 'Delete'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Upload zone ───────────────────────────────────────────────────────────────
function UploadZone({ onUpload, uploading, uploadError }) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  function onDragOver(e) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }
  async function onDrop(e) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  }
  function onChange(e) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-2">
      <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer
          ${dragging ? 'border-[#7B2D3E] bg-red-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
        onClick={() => !uploading && fileInputRef.current?.click()}>
        <p className="text-sm text-gray-500 mb-1">
          {uploading ? 'Uploading…' : 'Drag a file here or click to browse'}
        </p>
        <p className="text-xs text-gray-400">PDF, Word, images — max 20 MB</p>
        <input ref={fileInputRef} type="file" className="hidden" disabled={uploading} onChange={onChange}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp" />
      </div>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
    </div>
  );
}

// ── Communications list ───────────────────────────────────────────────────────
function CommunicationsList({ applicantId }) {
  const [comms, setComms]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(`${API_URL}/api/applicants/${applicantId}/communications`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        setComms(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [applicantId]);

  if (loading) return <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>;
  if (error)   return <p className="text-sm text-red-500">{error}</p>;
  if (comms.length === 0) return (
    <div className="text-center py-8">
      <p className="text-2xl mb-2">✉</p>
      <p className="text-sm text-gray-400">No email communications yet.</p>
      <p className="text-xs text-gray-300 mt-1">Emails sent through the app appear here.</p>
    </div>
  );

  return (
    <ul className="space-y-2">
      {comms.map(c => (
        <li key={c.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
          >
            <span className="text-lg shrink-0">✉</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {c.subject || EMAIL_LABELS[c.email_type] || c.email_type}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {EMAIL_LABELS[c.email_type] || c.email_type}
                {c.to_address && ` → ${c.to_address}`}
                {c.created_at && ` · ${formatDateTime(c.created_at)}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'}`}>
                {c.status}
              </span>
              <span className="text-gray-400 text-xs">{expanded === c.id ? '▲' : '▼'}</span>
            </div>
          </button>
          {expanded === c.id && (
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
              {c.from_address && (
                <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">From:</span> {c.from_address}</p>
              )}
              {c.to_address && (
                <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">To:</span> {c.to_address}</p>
              )}
              {c.subject && (
                <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Subject:</span> {c.subject}</p>
              )}
              {c.body_text ? (
                <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded p-3 mt-2 font-sans leading-relaxed max-h-64 overflow-y-auto">
                  {c.body_text}
                </pre>
              ) : (
                <p className="text-xs text-gray-400 italic">No body content recorded for this email.</p>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'documents',      label: 'Documents',      icon: '📄' },
  { key: 'communications', label: 'Communications', icon: '✉'  },
];

export default function FileAttachments({ applicantId }) {
  const [activeTab,    setActiveTab]    = useState('documents');
  const [files,        setFiles]        = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [fileError,    setFileError]    = useState('');
  const [uploading,    setUploading]    = useState(false);
  const [uploadError,  setUploadError]  = useState('');
  const [deletingId,   setDeletingId]   = useState(null);

  async function loadFiles() {
    setLoadingFiles(true);
    setFileError('');
    try {
      const res  = await fetch(`${API_URL}/api/applicants/${applicantId}/files`);
      if (!res.ok) throw new Error('Failed to load files');
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setFileError(err.message);
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => { if (applicantId) loadFiles(); }, [applicantId]);

  async function handleUpload(file) {
    setUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'applicant_documents');
    try {
      const res = await fetch(`${API_URL}/api/applicants/${applicantId}/files`, {
        method: 'POST', body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      await loadFiles();
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId) {
    if (!window.confirm('Delete this file? This cannot be undone.')) return;
    setDeletingId(fileId);
    try {
      const res = await fetch(`${API_URL}/api/applicants/${applicantId}/files/${fileId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Delete failed'); }
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      setFileError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const totalFiles = files.length;

  return (
    <div className="space-y-4">
      {/* Two-tab bar */}
      <div className="flex gap-1 border-b border-gray-200 -mx-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-[#7B2D3E] text-[#7B2D3E]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.key === 'documents' && totalFiles > 0 && (
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key ? 'bg-red-50 text-[#7B2D3E]' : 'bg-gray-100 text-gray-500'
              }`}>
                {totalFiles}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'communications' ? (
        <CommunicationsList applicantId={applicantId} />
      ) : (
        <div className="space-y-4">
          <UploadZone
            onUpload={handleUpload}
            uploading={uploading}
            uploadError={uploadError}
          />
          {fileError && <p className="text-xs text-red-600">{fileError}</p>}
          {loadingFiles
            ? <p className="text-sm text-gray-400">Loading files…</p>
            : <FileList files={files} onDelete={handleDelete} deletingId={deletingId} />
          }
        </div>
      )}
    </div>
  );
}
