'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Screen { id: number; name: string; }
interface Playlist {
  id: number; name: string; screenId: number; isActive: boolean;
  slideCount: number; screenName: string | null;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

function NewPlaylistModal({ screens, onSave, onClose }: { screens: Screen[]; onSave: () => void; onClose: () => void }) {
  const [name, setName]       = useState('Default');
  const [screenId, setScreenId] = useState<string>(screens[0]?.id?.toString() ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!screenId) { setError('Select a screen'); return; }
    setLoading(true);
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screenId: parseInt(screenId), name }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return; }
    onSave();
  }

  return (
    <Modal title="New Playlist" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Screen</label>
          {screens.length === 0 ? (
            <p className="text-sm text-amber-400">No screens found. Add a screen first.</p>
          ) : (
            <select value={screenId} onChange={e => setScreenId(e.target.value)} className={inputCls + ' cursor-pointer'}>
              {screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition">Cancel</button>
          <button type="submit" disabled={loading || screens.length === 0} className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
            {loading ? 'Creating…' : 'Create playlist'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [screens, setScreens]     = useState<Screen[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [pl, sc] = await Promise.all([
      fetch('/api/playlists').then(r => r.json()),
      fetch('/api/screens').then(r => r.json()),
    ]);
    setPlaylists(pl);
    setScreens(sc);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: number) {
    if (!confirm('Delete this playlist and all its slides?')) return;
    setDeleting(id);
    await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
    setDeleting(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Playlists</h1>
          <p className="text-sm text-gray-400">Build slide sequences for your screens.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Playlist
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-600">
          <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Loading…
        </div>
      ) : playlists.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl py-16 flex flex-col items-center justify-center text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          <p className="text-sm font-medium text-gray-400 mb-1">No playlists yet</p>
          <p className="text-xs text-gray-600 mb-4">Create a playlist and assign slides to it.</p>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">Create your first playlist</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{p.screenName ?? <span className="italic text-gray-600">No screen</span>}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/playlists/${p.id}`} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition" title="Edit slides">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </Link>
                  <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-40">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">{p.slideCount} slide{p.slideCount !== 1 ? 's' : ''}</span>
                {p.isActive && <span className="text-xs px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full">Active</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewPlaylistModal
          screens={screens}
          onSave={() => { setShowModal(false); load(); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
