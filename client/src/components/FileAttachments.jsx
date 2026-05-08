import React, { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

const FILE_ICONS = {
  'application/pdf':    '📄',
  'image/jpeg':         '🖼',
  'image/png':          '🖼',
  'image/gif':          '🖼',
  'image/webp':         '🖼',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
};

function fileIcon(mimeType) {
  return FILE_ICONS[mimeType] || '📎';
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function FileAttachments({ applicantId }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [deleteId, setDeleteId] = useState(null); // id being deleted
  const fileInputRef = useRef(null);

  async function loadFiles() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/applicants/${applicantId}/files`);
      if (!res.ok) throw new Error(`Failed to load files: ${res.status}`);
      const data = await res.json();
      setFiles(data);
    } catch (err) {
      setError(err.message || 'Could not load files.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (applicantId) loadFiles();
  }, [applicantId]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/applicants/${applicantId}/files`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed: ${res.status}`);
      }
      await loadFiles();
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected after an error
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(fileId) {
    if (!window.confirm('Delete this file? This cannot be undone.')) return;
    setDeleteId(fileId);
    try {
      const res = await fetch(
        `${API_URL}/api/applicants/${applicantId}/files/${fileId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed: ${res.status}`);
      }
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      setError(err.message || 'Delete failed.');
    } finally {
      setDeleteId(null);
    }
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() {
    setDragging(false);
  }
  async function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    // Simulate a change event
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dt.files;
      await handleUpload({ target: { files: dt.files } });
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded p-5 text-center transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <p className="text-sm text-gray-500 mb-2">
          {uploading ? 'Uploading…' : 'Drag a file here or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mb-3">PDF, Word, images — max 20 MB</p>
        <label className={`inline-block cursor-pointer text-sm font-medium px-4 py-1.5 rounded border ${
          uploading
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
        }`}>
          {uploading ? 'Uploading…' : 'Choose File'}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
          />
        </label>
        {uploadError && (
          <p className="mt-2 text-xs text-red-600">{uploadError}</p>
        )}
      </div>

      {/* File list */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading files…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-gray-400">No files uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map(file => (
            <li
              key={file.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded bg-white"
            >
              {/* Icon */}
              <span className="text-xl shrink-0">{fileIcon(file.file_type)}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate" title={file.file_name}>
                  {file.file_name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatBytes(file.file_size)}
                  {file.uploaded_at && ` · ${formatDate(file.uploaded_at)}`}
                  {file.uploaded_by && ` · ${file.uploaded_by}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {file.file_url && (
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Open
                  </a>
                )}
                <button
                  onClick={() => handleDelete(file.id)}
                  disabled={deleteId === file.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:text-gray-300"
                >
                  {deleteId === file.id ? '…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
