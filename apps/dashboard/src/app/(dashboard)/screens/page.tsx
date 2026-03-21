'use client';

import { useState, useEffect, useCallback } from 'react';

interface Zone { id: number; name: string; }
interface Screen {
  id: number; name: string; token: string;
  zoneId: number | null; zoneName: string | null;
  resolutionW: number; resolutionH: number;
  refreshRate: number; rotation: number;
  panelGridCols: number; panelGridRows: number;
  colourProfile: string;
  lastSeen: number | null;
  currentSlideId: number | null;
  clientIp: string | null;
}
interface Region {
  id: number; screenId: number; name: string;
  x: number; y: number; width: number; height: number;
  playlistId: number | null; sortOrder: number; playlistName: string | null;
}
interface Playlist { id: number; name: string; screenId: number; screenName: string | null; }

// ─── Status helpers ──────────────────────────────────────────────────────────

type StatusLevel = 'online' | 'idle' | 'offline' | 'never';

function getStatus(lastSeen: number | null): { level: StatusLevel; label: string } {
  if (!lastSeen) return { level: 'never', label: 'Never connected' };
  const ago = Math.floor(Date.now() / 1000) - lastSeen;
  if (ago < 90)   return { level: 'online',  label: 'Online' };
  if (ago < 600)  return { level: 'idle',    label: `Idle ${Math.round(ago / 60)}m ago` };
  if (ago < 3600) return { level: 'offline', label: `Offline ${Math.round(ago / 60)}m ago` };
  const h = Math.round(ago / 3600);
  if (h < 24)     return { level: 'offline', label: `Offline ${h}h ago` };
  return { level: 'offline', label: 'Offline' };
}

const STATUS_DOT: Record<StatusLevel, string> = {
  online:  'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]',
  idle:    'bg-yellow-400',
  offline: 'bg-gray-600',
  never:   'bg-gray-700',
};

const STATUS_TEXT: Record<StatusLevel, string> = {
  online:  'text-green-400',
  idle:    'text-yellow-400',
  offline: 'text-gray-500',
  never:   'text-gray-600',
};

// ─── Shared UI ───────────────────────────────────────────────────────────────

const RESOLUTION_PRESETS = [
  { label: '1920 × 1080 (FHD)', w: 1920, h: 1080 },
  { label: '3840 × 2160 (4K UHD)', w: 3840, h: 2160 },
  { label: '1280 × 720 (HD)', w: 1280, h: 720 },
  { label: '2560 × 1440 (QHD)', w: 2560, h: 1440 },
  { label: '1080 × 1920 (Portrait FHD)', w: 1080, h: 1920 },
  { label: '2160 × 3840 (Portrait 4K)', w: 2160, h: 3840 },
  { label: 'Custom', w: 0, h: 0 },
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6 my-auto">
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

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';
const selectCls = inputCls + ' cursor-pointer';

// ─── Screen form ─────────────────────────────────────────────────────────────

function ScreenFormModal({ screen, zones, onSave, onClose }: {
  screen?: Screen; zones: Zone[]; onSave: () => void; onClose: () => void;
}) {
  const [name, setName] = useState(screen?.name ?? '');
  const [zoneId, setZoneId] = useState<string>(screen?.zoneId?.toString() ?? '');
  const [resolutionW, setResolutionW] = useState(screen?.resolutionW ?? 1920);
  const [resolutionH, setResolutionH] = useState(screen?.resolutionH ?? 1080);
  const [customRes, setCustomRes] = useState(false);
  const [refreshRate, setRefreshRate] = useState(screen?.refreshRate ?? 60);
  const [rotation, setRotation] = useState(screen?.rotation ?? 0);
  const [panelGridCols, setPanelGridCols] = useState(screen?.panelGridCols ?? 1);
  const [panelGridRows, setPanelGridRows] = useState(screen?.panelGridRows ?? 1);
  const [colourProfile, setColourProfile] = useState(screen?.colourProfile ?? 'srgb');
  const [tokenMode, setTokenMode] = useState<'auto' | 'custom'>('auto');
  const [customToken, setCustomToken] = useState(screen?.token ?? '');
  const [regenerateToken, setRegenerateToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const match = RESOLUTION_PRESETS.find(p => p.w === resolutionW && p.h === resolutionH && p.w !== 0);
    setCustomRes(!match);
  }, []); // eslint-disable-line

  function handlePresetChange(val: string) {
    if (val === 'custom') { setCustomRes(true); return; }
    const preset = RESOLUTION_PRESETS.find(p => `${p.w}x${p.h}` === val);
    if (preset) { setResolutionW(preset.w); setResolutionH(preset.h); setCustomRes(false); }
  }

  const presetValue = customRes ? 'custom' : `${resolutionW}x${resolutionH}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const url = screen ? `/api/screens/${screen.id}` : '/api/screens';
    const method = screen ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, zoneId: zoneId ? parseInt(zoneId) : null,
        resolutionW, resolutionH, refreshRate, rotation,
        panelGridCols, panelGridRows, colourProfile,
        customToken: tokenMode === 'custom' ? customToken : undefined,
        regenerateToken: screen && regenerateToken ? true : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return; }
    onSave();
  }

  const isLEDWall = panelGridCols > 1 || panelGridRows > 1;

  return (
    <Modal title={screen ? 'Edit Screen' : 'New Screen'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldRow label="Name">
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Lobby Left" className={inputCls} />
        </FieldRow>

        {/* Token */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Screen Token
          </label>
          {screen ? (
            // Edit mode: show current token with change options
            <div className="space-y-2">
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                <code className="text-xs text-blue-300 font-mono flex-1 truncate">{customToken || screen.token}</code>
                <span className="text-xs text-gray-600 shrink-0">current</span>
              </div>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-gray-200">
                  <input type="radio" name="tokenMode" checked={!regenerateToken && tokenMode === 'auto'} onChange={() => { setRegenerateToken(false); setTokenMode('auto'); setCustomToken(screen.token); }} className="accent-blue-500" />
                  Keep current
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-gray-200">
                  <input type="radio" name="tokenMode" checked={!regenerateToken && tokenMode === 'custom'} onChange={() => { setRegenerateToken(false); setTokenMode('custom'); setCustomToken(''); }} className="accent-blue-500" />
                  Set custom
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-gray-200">
                  <input type="radio" name="tokenMode" checked={regenerateToken} onChange={() => { setRegenerateToken(true); setTokenMode('auto'); }} className="accent-blue-500" />
                  Regenerate
                </label>
              </div>
              {!regenerateToken && tokenMode === 'custom' && (
                <input value={customToken} onChange={e => setCustomToken(e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, ''))}
                  placeholder="e.g. lobby-left, reception, screen-1" className={inputCls} />
              )}
            </div>
          ) : (
            // Create mode: auto or custom
            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-gray-200">
                  <input type="radio" name="tokenMode" checked={tokenMode === 'auto'} onChange={() => setTokenMode('auto')} className="accent-blue-500" />
                  Auto-generate
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-gray-200">
                  <input type="radio" name="tokenMode" checked={tokenMode === 'custom'} onChange={() => setTokenMode('custom')} className="accent-blue-500" />
                  Custom token
                </label>
              </div>
              {tokenMode === 'auto' && (
                <p className="text-xs text-gray-600">A secure random token will be generated automatically.</p>
              )}
              {tokenMode === 'custom' && (
                <input value={customToken} onChange={e => setCustomToken(e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, ''))}
                  placeholder="e.g. lobby-left, reception, screen-1" className={inputCls} />
              )}
              {tokenMode === 'custom' && (
                <p className="text-xs text-gray-600">Letters, numbers, hyphens, underscores only. Min 2 characters.</p>
              )}
            </div>
          )}
        </div>

        <FieldRow label="Zone">
          <select value={zoneId} onChange={e => setZoneId(e.target.value)} className={selectCls}>
            <option value="">— Unassigned —</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </FieldRow>

        {/* Resolution */}
        <FieldRow label="Resolution">
          <select value={presetValue} onChange={e => handlePresetChange(e.target.value)} className={selectCls + ' mb-2'}>
            {RESOLUTION_PRESETS.map(p => (
              <option key={p.w + 'x' + p.h} value={p.w === 0 ? 'custom' : `${p.w}x${p.h}`}>{p.label}</option>
            ))}
          </select>
          {customRes && (
            <div className="flex gap-2 items-center">
              <input type="number" value={resolutionW} onChange={e => setResolutionW(+e.target.value)} min={1} placeholder="Width" className={inputCls} />
              <span className="text-gray-500 text-sm">×</span>
              <input type="number" value={resolutionH} onChange={e => setResolutionH(+e.target.value)} min={1} placeholder="Height" className={inputCls} />
            </div>
          )}
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Refresh Rate (Hz)">
            <select value={refreshRate} onChange={e => setRefreshRate(+e.target.value)} className={selectCls}>
              {[24, 30, 48, 50, 60, 75, 120, 144].map(r => <option key={r} value={r}>{r} Hz</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Rotation">
            <select value={rotation} onChange={e => setRotation(+e.target.value)} className={selectCls}>
              <option value={0}>0°</option>
              <option value={90}>90°</option>
              <option value={180}>180°</option>
              <option value={270}>270°</option>
            </select>
          </FieldRow>
        </div>

        <FieldRow label="Colour Profile">
          <select value={colourProfile} onChange={e => setColourProfile(e.target.value)} className={selectCls}>
            <option value="srgb">sRGB</option>
            <option value="display-p3">Display P3</option>
            <option value="rec2020">Rec. 2020</option>
          </select>
        </FieldRow>

        {/* LED Wall Panel Grid */}
        <div className="border border-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-300">LED Wall / Panel Grid</p>
            {isLEDWall && (
              <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded-full">
                {panelGridCols} × {panelGridRows} panels
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">Set to 1×1 for a single display. Increase for tiled LED wall configurations.</p>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Columns">
              <input type="number" value={panelGridCols} onChange={e => setPanelGridCols(Math.max(1, +e.target.value))} min={1} max={20} className={inputCls} />
            </FieldRow>
            <FieldRow label="Rows">
              <input type="number" value={panelGridRows} onChange={e => setPanelGridRows(Math.max(1, +e.target.value))} min={1} max={20} className={inputCls} />
            </FieldRow>
          </div>
          {isLEDWall && (
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: panelGridRows }).map((_, r) =>
                Array.from({ length: panelGridCols }).map((_, c) => (
                  <div key={`${r}-${c}`} style={{ width: `${Math.min(32, Math.floor(200 / panelGridCols))}px`, height: `${Math.min(20, Math.floor(120 / panelGridRows))}px` }}
                    className="bg-purple-500/20 border border-purple-500/40 rounded-sm" />
                ))
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
            {loading ? 'Saving…' : screen ? 'Save changes' : 'Add screen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Token modal ─────────────────────────────────────────────────────────────

function TokenModal({ screen, onClose }: { screen: Screen; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(screen.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal title="Screen Token" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">Use this token to pair the display client with <span className="text-gray-200 font-medium">{screen.name}</span>.</p>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between gap-3">
          <code className="text-xs text-blue-300 font-mono break-all">{screen.token}</code>
          <button onClick={copy} className="shrink-0 p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition">
            {copied
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            }
          </button>
        </div>
        <p className="text-xs text-gray-600">Keep this token secret. Anyone with it can pair a display to this screen.</p>
        <button onClick={onClose} className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition">Close</button>
      </div>
    </Modal>
  );
}

// ─── Layout regions modal ─────────────────────────────────────────────────────

const REGION_COLORS = [
  'rgba(59,130,246,0.45)',  // blue
  'rgba(168,85,247,0.45)',  // purple
  'rgba(16,185,129,0.45)',  // green
  'rgba(245,158,11,0.45)',  // amber
  'rgba(239,68,68,0.45)',   // red
  'rgba(6,182,212,0.45)',   // cyan
];
const REGION_BORDERS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#ef4444', '#06b2d4',
];

function RegionForm({ region, playlists, onSave, onClose }: {
  region?: Region; playlists: Playlist[]; onSave: (data: Omit<Region, 'id' | 'screenId' | 'playlistName'>) => Promise<void>; onClose: () => void;
}) {
  const [name,       setName]       = useState(region?.name ?? '');
  const [x,          setX]          = useState(String(region?.x ?? 0));
  const [y,          setY]          = useState(String(region?.y ?? 0));
  const [width,      setWidth]      = useState(String(region?.width ?? 100));
  const [height,     setHeight]     = useState(String(region?.height ?? 100));
  const [playlistId, setPlaylistId] = useState<string>(region?.playlistId?.toString() ?? '');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        x: parseFloat(x) || 0,
        y: parseFloat(y) || 0,
        width: parseFloat(width) || 100,
        height: parseFloat(height) || 100,
        playlistId: playlistId ? parseInt(playlistId) : null,
        sortOrder: region?.sortOrder ?? 0,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save region');
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-700 rounded-lg p-4 space-y-3 bg-gray-800/50">
      <p className="text-sm font-medium text-gray-200">{region ? 'Edit Region' : 'New Region'}</p>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Name</label>
        <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Main Content"
          className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">X (%)</label>
          <input type="number" value={x} onChange={e => setX(e.target.value)} min={0} max={100} step={0.1} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Y (%)</label>
          <input type="number" value={y} onChange={e => setY(e.target.value)} min={0} max={100} step={0.1} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Width (%)</label>
          <input type="number" value={width} onChange={e => setWidth(e.target.value)} min={1} max={100} step={0.1} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Height (%)</label>
          <input type="number" value={height} onChange={e => setHeight(e.target.value)} min={1} max={100} step={0.1} className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Playlist</label>
        <select value={playlistId} onChange={e => setPlaylistId(e.target.value)} className={selectCls}>
          <option value="">— None —</option>
          {playlists.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.screenName ? ` (${p.screenName})` : ''}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose}
          className="flex-1 py-1.5 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition">
          Cancel
        </button>
        <button type="submit" disabled={loading || !name.trim()}
          className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition">
          {loading ? 'Saving…' : region ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}

function LayoutModal({ screen, onClose }: { screen: Screen; onClose: () => void }) {
  const [regions,   setRegions]   = useState<Region[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<Region | 'add' | null>(null);
  const [deleting,  setDeleting]  = useState<number | null>(null);

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([
      fetch(`/api/screens/${screen.id}/regions`).then(res => res.json()),
      fetch('/api/playlists').then(res => res.json()),
    ]);
    setRegions(Array.isArray(r) ? r : []);
    setPlaylists(Array.isArray(p) ? p : []);
    setLoading(false);
  }, [screen.id]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: Omit<Region, 'id' | 'screenId' | 'playlistName'>) {
    if (typeof editing === 'string') {
      // editing === 'add'
      const res = await fetch(`/api/screens/${screen.id}/regions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, sortOrder: regions.length }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
    } else if (editing) {
      const res = await fetch(`/api/screens/${screen.id}/regions/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Failed'); }
    }
    setEditing(null);
    load();
  }

  async function handleDelete(regionId: number) {
    if (!confirm('Remove this region?')) return;
    setDeleting(regionId);
    await fetch(`/api/screens/${screen.id}/regions/${regionId}`, { method: 'DELETE' });
    setDeleting(null);
    load();
  }

  // Aspect ratio for preview: use screen's actual ratio
  const aspectRatio = screen.resolutionH > 0
    ? (screen.resolutionH / screen.resolutionW) * 100
    : 56.25;

  return (
    <Modal title={`Layout Regions: ${screen.name}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Visual preview */}
        <div style={{ width: '100%', paddingBottom: `${Math.min(aspectRatio, 70)}%`, position: 'relative', background: '#0f172a', borderRadius: '6px', border: '1px solid #1e293b', overflow: 'hidden' }}>
          {regions.map((r, i) => (
            <div key={r.id} style={{
              position: 'absolute',
              left: `${r.x}%`, top: `${r.y}%`,
              width: `${r.width}%`, height: `${r.height}%`,
              background: REGION_COLORS[i % REGION_COLORS.length],
              border: `1.5px solid ${REGION_BORDERS[i % REGION_BORDERS.length]}`,
              borderRadius: '2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <span style={{ fontSize: '9px', color: '#fff', textAlign: 'center', padding: '2px', pointerEvents: 'none', lineHeight: 1.2 }}>
                {r.name}
              </span>
            </div>
          ))}
          {regions.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: '#334155' }}>No regions — full-screen</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-600">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            Loading…
          </div>
        ) : (
          <>
            {/* Region list */}
            {regions.length > 0 && (
              <div className="space-y-2">
                {regions.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: REGION_BORDERS[i % REGION_BORDERS.length] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{r.name}</p>
                      <p className="text-xs text-gray-600">
                        {r.x}%, {r.y}% &nbsp;&middot;&nbsp; {r.width}% × {r.height}%
                        {r.playlistName && <span className="ml-1 text-gray-500"> &middot; {r.playlistName}</span>}
                      </p>
                    </div>
                    <button onClick={() => setEditing(r)} className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded transition">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                      className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition disabled:opacity-40">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline form for add/edit */}
            {editing !== null && (
              <RegionForm
                region={typeof editing === 'string' ? undefined : editing}
                playlists={playlists}
                onSave={handleSave}
                onClose={() => setEditing(null)}
              />
            )}

            {editing === null && (
              <button onClick={() => setEditing('add')}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed border-gray-700 hover:border-gray-600 text-gray-500 hover:text-gray-300 text-sm rounded-lg transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add region
              </button>
            )}

            {regions.length === 0 && editing === null && (
              <p className="text-xs text-gray-600 text-center -mt-1">
                No regions defined. The screen plays its playlist full-screen. Add regions to split the screen into independently controlled areas.
              </p>
            )}
          </>
        )}

        <button onClick={onClose}
          className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition">
          Close
        </button>
      </div>
    </Modal>
  );
}

// ─── Screen card ─────────────────────────────────────────────────────────────

function ScreenCard({ screen, onEdit, onDelete, onToken, onLayout, deleting }: {
  screen: Screen; onEdit: () => void; onDelete: () => void; onToken: () => void; onLayout: () => void; deleting: boolean;
}) {
  const isLEDWall = (screen.panelGridCols ?? 1) > 1 || (screen.panelGridRows ?? 1) > 1;
  const status = getStatus(screen.lastSeen);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-100 truncate">{screen.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {screen.zoneName ?? <span className="italic text-gray-600">Unassigned</span>}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToken} title="View token" className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          </button>
          <button onClick={onLayout} title="Manage layout regions" className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={onDelete} disabled={deleting} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-40">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status.level]}`} />
        <span className={`text-xs ${STATUS_TEXT[status.level]}`}>{status.label}</span>
        {screen.clientIp && status.level === 'online' && (
          <span className="text-xs text-gray-700 ml-auto font-mono">{screen.clientIp}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">
          {screen.resolutionW}×{screen.resolutionH}
        </span>
        <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">
          {screen.refreshRate} Hz
        </span>
        {screen.rotation !== 0 && (
          <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">
            {screen.rotation}°
          </span>
        )}
        {isLEDWall && (
          <span className="text-xs px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded-full">
            {screen.panelGridCols}×{screen.panelGridRows} panels
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScreensPage() {
  const [screens,     setScreens]     = useState<Screen[]>([]);
  const [zones,       setZones]       = useState<Zone[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modal,       setModal]       = useState<'create' | Screen | null>(null);
  const [tokenModal,  setTokenModal]  = useState<Screen | null>(null);
  const [layoutModal, setLayoutModal] = useState<Screen | null>(null);
  const [deleting,    setDeleting]    = useState<number | null>(null);

  const load = useCallback(async () => {
    const [s, z] = await Promise.all([
      fetch('/api/screens').then(r => r.json()),
      fetch('/api/zones').then(r => r.json()),
    ]);
    setScreens(s);
    setZones(z);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Poll every 30 s to keep status badges fresh
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function handleDelete(id: number) {
    if (!confirm('Delete this screen? This will also remove its playlists.')) return;
    setDeleting(id);
    await fetch(`/api/screens/${id}`, { method: 'DELETE' });
    setDeleting(null);
    load();
  }

  const onlineCount = screens.filter(s => getStatus(s.lastSeen).level === 'online').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Screens</h1>
          <p className="text-sm text-gray-400">
            Manage and configure your display screens.
            {screens.length > 0 && (
              <span className="ml-2">
                <span className="text-green-400 font-medium">{onlineCount}</span>
                <span className="text-gray-600"> / {screens.length} online</span>
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setModal('create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Screen
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-600">
          <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          Loading…
        </div>
      ) : screens.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl py-16 flex flex-col items-center justify-center text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <p className="text-sm font-medium text-gray-400 mb-1">No screens yet</p>
          <p className="text-xs text-gray-600 mb-4">Add a screen to start displaying content.</p>
          <button onClick={() => setModal('create')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition">Add your first screen</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {screens.map(s => (
            <ScreenCard
              key={s.id}
              screen={s}
              onEdit={() => setModal(s)}
              onDelete={() => handleDelete(s.id)}
              onToken={() => setTokenModal(s)}
              onLayout={() => setLayoutModal(s)}
              deleting={deleting === s.id}
            />
          ))}
        </div>
      )}

      {modal !== null && (
        <ScreenFormModal
          screen={modal === 'create' ? undefined : modal}
          zones={zones}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}

      {tokenModal && (
        <TokenModal screen={tokenModal} onClose={() => setTokenModal(null)} />
      )}

      {layoutModal && (
        <LayoutModal screen={layoutModal} onClose={() => setLayoutModal(null)} />
      )}
    </div>
  );
}
