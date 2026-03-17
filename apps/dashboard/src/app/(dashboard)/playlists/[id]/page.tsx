'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Asset { id: number; originalName: string; mimeType: string; type: string; filename: string; }
interface Slide {
  id: number; playlistId: number;
  assetId: number | null; contentType: string; content: string | null;
  durationSeconds: number; transition: string | null; sortOrder: number;
  scheduleJson: string | null; enabled: boolean;
  assetFilename?: string | null; assetOrigName?: string | null;
  assetMimeType?: string | null; assetType?: string | null;
}
interface Playlist { id: number; name: string; screenId: number; isActive: boolean; slides: Slide[]; }

const TRANSITIONS = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'zoom'];
const CONTENT_TYPES = [
  { value: 'asset',  label: 'Asset (image/video/PDF)' },
  { value: 'url',    label: 'Web URL' },
  { value: 'html',   label: 'Custom HTML' },
  { value: 'clock',  label: 'Clock widget' },
  { value: 'text',   label: 'Text overlay' },
];

const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

function SlideIcon({ contentType }: { contentType: string }) {
  if (contentType === 'asset') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  );
  if (contentType === 'url') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
  if (contentType === 'html') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  );
  if (contentType === 'clock') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    </svg>
  );
}

function SortableSlide({ slide, onEdit, onDelete, deleting }: {
  slide: Slide; onEdit: () => void; onDelete: () => void; deleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const label = slide.contentType === 'asset'
    ? (slide.assetOrigName ?? `Asset #${slide.assetId}`)
    : slide.contentType === 'url' ? (slide.content?.slice(0, 40) ?? 'URL')
    : slide.contentType === 'clock' ? 'Clock widget'
    : slide.contentType === 'text' ? (slide.content?.slice(0, 40) ?? 'Text')
    : 'HTML';

  return (
    <div ref={setNodeRef} style={style} className={`bg-gray-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${slide.enabled ? 'border-gray-800' : 'border-gray-800 opacity-50'}`}>
      <button {...attributes} {...listeners} className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing p-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
      </button>
      <span className="text-gray-500"><SlideIcon contentType={slide.contentType} /></span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 truncate">{label}</p>
        <p className="text-xs text-gray-600">{slide.durationSeconds}s · {slide.transition ?? 'none'}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button onClick={onDelete} disabled={deleting} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-40">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  );
}

function SlideModal({ slide, assets, playlistId, onSave, onClose }: {
  slide?: Slide; assets: Asset[]; playlistId: number; onSave: () => void; onClose: () => void;
}) {
  const [contentType, setContentType]     = useState(slide?.contentType ?? 'asset');
  const [assetId, setAssetId]             = useState<string>(slide?.assetId?.toString() ?? '');
  const [content, setContent]             = useState(slide?.content ?? '');
  const [durationSeconds, setDuration]    = useState(slide?.durationSeconds ?? 10);
  const [transition, setTransition]       = useState(slide?.transition ?? 'fade');
  const [enabled, setEnabled]             = useState(slide?.enabled ?? true);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const body = {
      contentType,
      assetId:         contentType === 'asset' && assetId ? parseInt(assetId) : null,
      content:         contentType !== 'asset' ? content : null,
      durationSeconds: Number(durationSeconds),
      transition,
      enabled,
      sortOrder:       slide?.sortOrder ?? 9999,
    };
    const url    = slide ? `/api/playlists/${playlistId}/slides/${slide.id}` : `/api/playlists/${playlistId}/slides`;
    const method = slide ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return; }
    onSave();
  }

  const filteredAssets = assets.filter(a =>
    contentType === 'asset' ? true : false
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6 my-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-100">{slide ? 'Edit Slide' : 'Add Slide'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Content Type</label>
            <select value={contentType} onChange={e => setContentType(e.target.value)} className={inputCls + ' cursor-pointer'}>
              {CONTENT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
            </select>
          </div>

          {contentType === 'asset' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Asset</label>
              {assets.length === 0 ? (
                <p className="text-sm text-amber-400">No assets uploaded yet.</p>
              ) : (
                <select value={assetId} onChange={e => setAssetId(e.target.value)} className={inputCls + ' cursor-pointer'}>
                  <option value="">— Select asset —</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.originalName}</option>)}
                </select>
              )}
            </div>
          )}

          {(contentType === 'url' || contentType === 'text') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {contentType === 'url' ? 'URL' : 'Text'}
              </label>
              <input value={content} onChange={e => setContent(e.target.value)} placeholder={contentType === 'url' ? 'https://…' : 'Enter text…'} className={inputCls} />
            </div>
          )}

          {contentType === 'html' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">HTML</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={5} placeholder="<h1>Hello</h1>" className={inputCls + ' resize-none font-mono text-xs'} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Duration (s)</label>
              <input type="number" value={durationSeconds} onChange={e => setDuration(+e.target.value)} min={1} max={3600} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Transition</label>
              <select value={transition} onChange={e => setTransition(e.target.value)} className={inputCls + ' cursor-pointer'}>
                {TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-blue-500" />
            <span className="text-sm text-gray-300">Enabled</span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
              {loading ? 'Saving…' : slide ? 'Save' : 'Add slide'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlaylistEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [assets,   setAssets]   = useState<Asset[]>([]);
  const [slides,   setSlides]   = useState<Slide[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<'add' | Slide | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [pl, as] = await Promise.all([
      fetch(`/api/playlists/${id}`).then(r => r.json()),
      fetch('/api/assets').then(r => r.json()),
    ]);
    setPlaylist(pl);
    setSlides(pl.slides ?? []);
    setAssets(as);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex(s => s.id === active.id);
    const newIndex = slides.findIndex(s => s.id === over.id);
    const newSlides = arrayMove(slides, oldIndex, newIndex);
    setSlides(newSlides);

    await fetch(`/api/playlists/${id}/slides`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newSlides.map(s => s.id) }),
    });
  }

  async function handleDeleteSlide(slideId: number) {
    if (!confirm('Remove this slide?')) return;
    setDeleting(slideId);
    await fetch(`/api/playlists/${id}/slides/${slideId}`, { method: 'DELETE' });
    setDeleting(null);
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-600">
      <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      Loading…
    </div>
  );

  if (!playlist) return <p className="text-red-400 text-sm">Playlist not found.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/playlists')} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">{playlist.name}</h1>
            <p className="text-sm text-gray-400">{slides.length} slide{slides.length !== 1 ? 's' : ''} · drag to reorder</p>
          </div>
        </div>
        <button onClick={() => setModal('add')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Slide
        </button>
      </div>

      {slides.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl py-16 flex flex-col items-center justify-center text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <p className="text-sm font-medium text-gray-400 mb-1">No slides yet</p>
          <p className="text-xs text-gray-600 mb-4">Add slides to build your playlist.</p>
          <button onClick={() => setModal('add')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">Add your first slide</button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {slides.map(slide => (
                <SortableSlide
                  key={slide.id}
                  slide={slide}
                  onEdit={() => setModal(slide)}
                  onDelete={() => handleDeleteSlide(slide.id)}
                  deleting={deleting === slide.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {modal !== null && (
        <SlideModal
          slide={modal === 'add' ? undefined : modal}
          assets={assets}
          playlistId={playlist.id}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
