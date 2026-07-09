'use client';

import { useState, useEffect } from 'react';

const inputCls = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';
const selectCls = inputCls + ' cursor-pointer';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(d);
      setLoading(false);
    });
  }, []);

  function set(key: string, value: string) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-600">
      <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      Loading…
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 mb-1">Settings</h1>
        <p className="text-sm text-gray-400">Configure your DisplayGrid instance.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-xl">
        <Section title="General">
          <Field label="Application Name">
            <input value={settings.app_name ?? ''} onChange={e => set('app_name', e.target.value)} className={inputCls} placeholder="DisplayGrid" />
          </Field>
        </Section>

        <Section title="Image Compression">
          <Field label="Output Format" hint="Images uploaded to the asset library will be converted to this format.">
            <select value={settings.image_format ?? 'webp'} onChange={e => set('image_format', e.target.value)} className={selectCls}>
              <option value="webp">WebP (recommended)</option>
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="avif">AVIF</option>
            </select>
          </Field>
          <Field label={`Quality: ${settings.image_quality ?? 90}`} hint="Higher = better quality, larger file size.">
            <input
              type="range" min={10} max={100} step={5}
              value={settings.image_quality ?? 90}
              onChange={e => set('image_quality', e.target.value)}
              className="w-full accent-blue-500"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Max Width (px)">
              <input type="number" value={settings.image_max_width ?? 3840} onChange={e => set('image_max_width', e.target.value)} min={256} max={7680} className={inputCls} />
            </Field>
            <Field label="Max Height (px)">
              <input type="number" value={settings.image_max_height ?? 2160} onChange={e => set('image_max_height', e.target.value)} min={256} max={4320} className={inputCls} />
            </Field>
          </div>
        </Section>

        <Section title="Kiosk">
          <Field label="Exit PIN" hint="6-digit PIN to unlock the display client kiosk mode.">
            <input
              value={settings.kiosk_pin ?? ''}
              onChange={e => set('kiosk_pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="e.g. 123456"
              className={inputCls}
            />
          </Field>
          <Field label="Exit Key Combo" hint="Keyboard shortcut to show the PIN prompt.">
            <input value={settings.kiosk_key_combo ?? 'ctrl+shift+alt+d'} onChange={e => set('kiosk_key_combo', e.target.value)} className={inputCls} />
          </Field>
        </Section>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <span className="text-sm text-green-400">Saved!</span>}
        </div>
      </form>

      <div className="max-w-xl mt-4">
        <EmergencyTemplates />
      </div>

      <div className="max-w-xl mt-4">
        <ApiTokens />
      </div>
    </div>
  );
}

interface TokenSummary { id: string; name: string; createdAt: number; lastUsed: number | null; }

function ApiTokens() {
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [loading, setLoad]  = useState(true);
  const [name, setName]     = useState('');
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh]   = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/tokens');
    setTokens(res.ok ? await res.json() : []);
    setLoad(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch('/api/tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    setCreating(false);
    if (res.ok) { const d = await res.json(); setFresh(d.token); setName(''); load(); }
  }
  async function revoke(id: string) {
    if (!confirm('Revoke this token? Anything using it will stop working.')) return;
    await fetch(`/api/tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    load();
  }

  return (
    <Section title="API tokens">
      <p className="text-xs text-gray-600 -mt-1 mb-1">
        For automation — trigger the emergency override or read screen status from scripts, Home Assistant, or n8n.
        See the <a href="https://joemighty.github.io/DisplayGrid/api.html" target="_blank" rel="noopener" className="text-blue-400 hover:text-blue-300">API reference</a>.
      </p>

      {fresh && (
        <div className="rounded-lg border border-green-800/60 bg-green-950/30 p-3">
          <p className="text-xs text-green-300 mb-1.5">Copy this token now — it won’t be shown again.</p>
          <code className="block text-xs font-mono text-green-200 bg-black/40 rounded px-2 py-1.5 break-all select-all">{fresh}</code>
          <button onClick={() => setFresh(null)} className="text-xs text-gray-400 hover:text-gray-200 mt-2">Done</button>
        </div>
      )}

      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Token name (e.g. Home Assistant)" className={inputCls} />
        <button onClick={create} disabled={creating || !name.trim()} className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
          {creating ? 'Creating…' : 'Create'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : tokens.length === 0 ? (
        <p className="text-sm text-gray-600">No tokens yet.</p>
      ) : (
        <div className="divide-y divide-gray-800 border border-gray-800 rounded-lg">
          {tokens.map(t => (
            <div key={t.id} className="flex items-center justify-between px-3 py-2.5">
              <div>
                <div className="text-sm text-gray-200">{t.name}</div>
                <div className="text-xs text-gray-600">
                  Created {new Date(t.createdAt).toLocaleDateString()} · {t.lastUsed ? `last used ${new Date(t.lastUsed).toLocaleDateString()}` : 'never used'}
                </div>
              </div>
              <button onClick={() => revoke(t.id)} className="text-xs text-gray-500 hover:text-red-400 transition">Revoke</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

interface Template { id: string; label: string; message: string; }

function EmergencyTemplates() {
  const [items, setItems]   = useState<Template[]>([]);
  const [loading, setLoad]  = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    fetch('/api/emergency-override/templates')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setItems(d); setLoad(false); })
      .catch(() => setLoad(false));
  }, []);

  function update(i: number, patch: Partial<Template>) {
    setItems(list => list.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  }
  function remove(i: number) { setItems(list => list.filter((_, idx) => idx !== i)); }
  function add() { setItems(list => [...list, { id: `new${Date.now()}`, label: '', message: '' }]); }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/emergency-override/templates', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items.filter(t => t.label.trim() && t.message.trim())),
    });
    if (res.ok) setItems(await res.json());
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Section title="Emergency presets">
      <p className="text-xs text-gray-600 -mt-1 mb-1">One-tap messages for the emergency override on the Overview page.</p>
      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : (
        <div className="space-y-2">
          {items.map((t, i) => (
            <div key={t.id} className="flex gap-2 items-start">
              <input
                value={t.label} onChange={e => update(i, { label: e.target.value })}
                placeholder="Label" className={inputCls + ' w-40 shrink-0'} />
              <input
                value={t.message} onChange={e => update(i, { message: e.target.value })}
                placeholder="Message shown on screens" className={inputCls} />
              <button onClick={() => remove(i)} title="Remove"
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-800 transition">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-1">
            <button onClick={add} className="text-sm text-blue-400 hover:text-blue-300 transition">+ Add preset</button>
            <div className="flex-1" />
            <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
              {saving ? 'Saving…' : 'Save presets'}
            </button>
            {saved && <span className="text-sm text-green-400">Saved!</span>}
          </div>
        </div>
      )}
    </Section>
  );
}
