'use client';
import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, FileText, X } from 'lucide-react';
import { getKbFiles, uploadKbFile, deleteKbFile } from '@/lib/api';

interface KbEntry {
  id: string;
  domain: string;
  country: string;
  original_name: string;
  uploaded_at: string;
  chunks: number;
}

type Toast = { type: 'success' | 'error'; message: string } | null;

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast) return null;
  return (
    <div
      className="fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-medium text-white"
      style={{ background: toast.type === 'success' ? '#4CAF50' : '#FF6B6B' }}
    >
      {toast.message}
    </div>
  );
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  // Upload form 
  const [domain, setDomain] = useState('');
  const [country, setCountry] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = () => {
    setLoading(true);
    getKbFiles()
      .then(res => setEntries(res.data))
      .finally(() => setLoading(false));
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setToast({ type: 'error', message: 'Only PDF files are allowed' });
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setToast({ type: 'error', message: 'File must be under 50 MB' });
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !domain.trim() || !country.trim()) {
      setToast({ type: 'error', message: 'Please fill in domain, country, and select a PDF' });
      return;
    }
    setUploading(true);
    try {
      const res = await uploadKbFile(selectedFile, domain.trim(), country.trim().toUpperCase());
      setEntries(prev => {
        const filtered = prev.filter(e => e.id !== res.data.id);
        return [res.data, ...filtered];
      });
      setSelectedFile(null);
      setDomain('');
      setCountry('');
      setToast({ type: 'success', message: `Indexed ${res.data.chunks} chunks for ${res.data.domain}` });
    } catch (err: any) {
      setToast({ type: 'error', message: err?.response?.data?.detail ?? 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (entry: KbEntry) => {
    if (!confirm(`Remove knowledge base for "${entry.domain} (${entry.country})"?`)) return;
    try {
      await deleteKbFile(entry.id);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      setToast({ type: 'success', message: 'KB_File removed' });
    } catch {
      setToast({ type: 'error', message: 'Failed to remove KB_File' });
    }
  };

  return (
    <>
      <ToastBanner toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold" style={{ color: '#1E2A4A' }}>Knowledge Base</h1>
      </div>
      <p className="text-gray-500 mb-6">Upload PDF documents per domain — they are indexed and used during requirement generation</p>

      {/* Upload card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1E2A4A' }}>Upload New Document</h2>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Domain + Country inputs */}
          <div className="flex gap-3 flex-1">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Domain</label>
              <input
                type="text"
                placeholder="e.g. Health"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-500 mb-1">Country Code</label>
              <input
                type="text"
                placeholder="JO"
                value={country}
                onChange={e => setCountry(e.target.value.toUpperCase())}
                maxLength={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 uppercase"
              />
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center px-4 py-5 cursor-pointer transition-all ${dragging ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {selectedFile ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: '#1E2A4A' }}>
                <FileText size={16} />
                <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={20} className="text-gray-400 mb-1" />
                <p className="text-xs text-gray-400 text-center">Click or drag & drop a PDF<br />Max 50 MB</p>
              </>
            )}
          </div>

          {/* Upload button */}
          <div className="flex items-end">
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !domain.trim() || !country.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#FF6B6B' }}
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {uploading ? 'Indexing…' : 'Upload & Index'}
            </button>
          </div>
        </div>
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#FF6B6B' }} />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          No documents uploaded yet
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Domain</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Country</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">File</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Chunks</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Uploaded</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id} className={i !== entries.length - 1 ? 'border-b border-gray-50' : ''}>
                  <td className="px-5 py-3.5 font-medium" style={{ color: '#1E2A4A' }}>{entry.domain}</td>
                  <td className="px-5 py-3.5">
                    <span className="px-2 py-0.5 rounded-lg text-xs font-semibold uppercase" style={{ background: '#1E2A4A12', color: '#1E2A4A' }}>
                      {entry.country}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-[200px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText size={13} className="flex-shrink-0 text-gray-400" />
                      <span className="truncate">{entry.original_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{entry.chunks}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {new Date(entry.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(entry)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
