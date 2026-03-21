'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Asset {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  type: 'image' | 'video' | 'pdf' | 'html' | 'url';
  sizeBytes: number | null;
  uploadedAt: string | null;
}

function formatBytes(b: number | null) {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function AssetThumb({ asset }: { asset: Asset }) {
  const src = `/api/assets/${asset.id}/file`;
  if (asset.type === 'image') {
    return <img src={src} alt={asset.originalName} className="w-full h-full object-cover" />;
  }
  if (asset.type === 'video') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-800">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      </svg>
    </div>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const src = `/api/assets/${asset.id}/file`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-100 truncate">{asset.originalName}</p>
            <p className="text-xs text-gray-500">{formatBytes(asset.sizeBytes)} · {asset.mimeType}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center" style={{ maxHeight: 'calc(90vh - 64px)' }}>
          {asset.type === 'image' && (
            <img
              src={src}
              alt={asset.originalName}
              className="max-w-full object-contain"
              style={{ maxHeight: 'calc(90vh - 64px)' }}
            />
          )}
          {asset.type === 'video' && (
            <video
              src={src}
              controls
              autoPlay
              className="max-w-full"
              style={{ maxHeight: 'calc(90vh - 64px)' }}
            />
          )}
          {asset.type === 'pdf' && (
            <iframe
              src={src}
              className="w-full"
              style={{ height: 'calc(90vh - 64px)' }}
              title={asset.originalName}
            />
          )}
          {(asset.type === 'html' || asset.type === 'url') && (
            <div className="p-8 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <p className="text-sm text-gray-500">Preview not available for this asset type.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Asset card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, onPreview, onDelete, deleting }: {
  asset: Asset; onPreview: () => void; onDelete: () => void; deleting: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group">
      <div
        className="relative aspect-video bg-gray-800 overflow-hidden cursor-pointer"
        onClick={onPreview}
      >
        <AssetThumb asset={asset} />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button
            onClick={e => { e.stopPropagation(); onPreview(); }}
            className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-white transition"
            title="Preview"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            disabled={deleting}
            className="p-2 bg-red-600/80 hover:bg-red-500 rounded-lg text-white transition disabled:opacity-40"
            title="Delete"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
        <span className="absolute top-2 left-2 text-xs px-1.5 py-0.5 bg-black/60 text-gray-300 rounded capitalize">
          {asset.type}
        </span>
      </div>
      <div className="p-3">
        <p className="text-xs font-medium text-gray-200 truncate" title={asset.originalName}>{asset.originalName}</p>
        <p className="text-xs text-gray-600 mt-0.5">{formatBytes(asset.sizeBytes)}</p>
      </div>
    </div>
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition mb-6 ${
        dragging ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
      </svg>
      <p className="text-sm font-medium text-gray-400 mb-1">Drop files here or click to browse</p>
      <p className="text-xs text-gray-600">Images (JPEG, PNG, WebP, GIF), Videos (MP4, WebM), PDF</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/mp4,video/webm,video/ogg,application/pdf"
        className="hidden"
        onChange={e => { if (e.target.files?.length) onFiles(e.target.files); }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const [assetList, setAssetList] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [_uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [preview, setPreview] = useState<Asset | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/assets');
    setAssetList(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleFiles(files: FileList) {
    setUploading(true);
    const msgs: string[] = [];
    for (const file of Array.from(files)) {
      msgs.push(`Uploading ${file.name}…`);
      setUploadProgress([...msgs]);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/assets', { method: 'POST', body: fd });
      if (res.ok) {
        msgs[msgs.length - 1] = `✓ ${file.name}`;
      } else {
        const d = await res.json();
        msgs[msgs.length - 1] = `✗ ${file.name}: ${d.error ?? 'failed'}`;
      }
      setUploadProgress([...msgs]);
    }
    setUploading(false);
    setTimeout(() => setUploadProgress([]), 3000);
    load();
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this asset? Any slides using it will lose their content.')) return;
    setDeleting(id);
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    setDeleting(null);
    if (preview?.id === id) setPreview(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Assets</h1>
          <p className="text-sm text-gray-400">Upload and manage images, videos, and PDFs.</p>
        </div>
        <span className="text-sm text-gray-500">{assetList.length} asset{assetList.length !== 1 ? 's' : ''}</span>
      </div>

      <DropZone onFiles={handleFiles} />

      {uploadProgress.length > 0 && (
        <div className="mb-4 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1">
          {uploadProgress.map((msg, i) => (
            <p key={i} className={`text-xs ${msg.startsWith('✓') ? 'text-green-400' : msg.startsWith('✗') ? 'text-red-400' : 'text-gray-400'}`}>{msg}</p>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-600">
          <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Loading…
        </div>
      ) : assetList.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No assets yet. Upload some files above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {assetList.map(a => (
            <AssetCard
              key={a.id}
              asset={a}
              onPreview={() => setPreview(a)}
              onDelete={() => handleDelete(a.id)}
              deleting={deleting === a.id}
            />
          ))}
        </div>
      )}

      {preview && (
        <PreviewModal asset={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
