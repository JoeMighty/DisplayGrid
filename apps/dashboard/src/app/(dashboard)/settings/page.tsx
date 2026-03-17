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
    </div>
  );
}
