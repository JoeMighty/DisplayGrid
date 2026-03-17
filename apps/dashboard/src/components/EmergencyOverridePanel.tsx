'use client';

import { useState, useEffect } from 'react';

interface Override {
  id: number;
  message: string | null;
  assetId: number | null;
  activeTo: string | null;
  isActive: boolean;
}

export default function EmergencyOverridePanel() {
  const [override, setOverride]   = useState<Override | null>(null);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(false);
  const [message, setMessage]     = useState('');
  const [minutes, setMinutes]     = useState('60');
  const [saving, setSaving]       = useState(false);

  async function load() {
    const res = await fetch('/api/emergency-override');
    setOverride(res.ok ? await res.json() : null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function activate() {
    setSaving(true);
    await fetch('/api/emergency-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message || null, activeMinutes: parseInt(minutes) || null }),
    });
    setSaving(false);
    setExpanded(false);
    setMessage('');
    load();
  }

  async function deactivate() {
    if (!confirm('Cancel the emergency override? All screens will resume normal playback.')) return;
    await fetch('/api/emergency-override', { method: 'DELETE' });
    load();
  }

  if (loading) return null;

  return (
    <div className={`rounded-xl border p-5 ${override ? 'bg-red-950/30 border-red-800/60' : 'bg-gray-900 border-gray-800'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${override ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-sm font-semibold text-gray-200">Emergency Override</span>
          {override && <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">ACTIVE</span>}
        </div>
        {override ? (
          <button onClick={deactivate} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-lg transition">
            Cancel override
          </button>
        ) : (
          <button onClick={() => setExpanded(e => !e)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition">
            {expanded ? 'Close' : 'Activate'}
          </button>
        )}
      </div>

      {override && (
        <div className="mt-3 text-sm text-red-300">
          {override.message && <p className="font-medium">{override.message}</p>}
          {override.activeTo && (
            <p className="text-xs text-red-400/70 mt-1">
              Expires {new Date(override.activeTo).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-red-400/70 mt-0.5">All screens are showing the override content.</p>
        </div>
      )}

      {!override && expanded && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Message (shown on screens)</label>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Building evacuation in progress"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Auto-expire after (minutes, 0 = never)</label>
            <input
              type="number"
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
              min={0}
              className="w-40 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
            />
          </div>
          <button
            onClick={activate}
            disabled={saving}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {saving ? 'Activating…' : '⚠ Activate emergency override'}
          </button>
        </div>
      )}

      {!override && !expanded && (
        <p className="text-xs text-gray-600 mt-2">Override normal playback on all connected screens instantly.</p>
      )}
    </div>
  );
}
