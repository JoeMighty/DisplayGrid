import { useState, useEffect, useCallback, useRef } from 'react';
import SlidePlayer, { type Slide } from './SlidePlayer';
import KioskLock from './KioskLock';
import { useWS } from './useWS';
import { HEARTBEAT_INTERVAL_MS, FALLBACK_POLL_MS, DEFAULT_KIOSK_KEY_COMBO, KIOSK_COMBO_HOLD_MS } from '@displaygrid/shared';

const API_BASE    = import.meta.env.VITE_API_BASE    ?? '';
const WS_BASE     = import.meta.env.VITE_WS_BASE     ?? 'ws://localhost:3001';
const SCREEN_TOKEN = import.meta.env.VITE_SCREEN_TOKEN ?? '';

type AppState = 'setup' | 'loading' | 'playing' | 'error';

interface PlaylistMsg { type: 'playlist'; slides: Slide[]; override: OverrideMsg | null; }
interface AckMsg      { type: 'ack'; }
interface OverrideMsg { message: string | null; asset_id: number | null; }

const CACHE_KEY = `dg_slides_${SCREEN_TOKEN}`;

function saveCache(slides: Slide[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(slides)); } catch {}
}
function loadCache(): Slide[] {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]'); } catch { return []; }
}

export default function App() {
  const [state,      setState]      = useState<AppState>(SCREEN_TOKEN ? 'loading' : 'setup');
  const [slides,     setSlides]     = useState<Slide[]>(() => loadCache());
  const [override,   setOverride]   = useState<OverrideMsg | null>(null);
  const [kioskLock,  setKioskLock]  = useState(false);
  const [token,      setToken]      = useState(SCREEN_TOKEN);
  const [tokenInput, setTokenInput] = useState('');
  const currentSlideId              = useRef<number | null>(null);
  const keyHoldTimer                = useRef<ReturnType<typeof setTimeout>>();
  const keysDown                    = useRef(new Set<string>());

  // --- WebSocket ---
  const wsUrl = token ? `${WS_BASE}?token=${encodeURIComponent(token)}&version=1.0.0` : null;

  const handleMsg = useCallback((data: unknown) => {
    const msg = data as PlaylistMsg | AckMsg;
    if (msg.type === 'playlist') {
      setSlides(msg.slides);
      saveCache(msg.slides);
      setOverride(msg.override);
      setState('playing');
    }
  }, []);

  const { send } = useWS(wsUrl, handleMsg);

  // --- Heartbeat ---
  useEffect(() => {
    if (!token) return;
    const t = setInterval(() => {
      send({ type: 'heartbeat', slideId: currentSlideId.current });
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(t);
  }, [token, send]);

  // --- Fallback REST poll (when WS is disconnected) ---
  useEffect(() => {
    if (!token || state !== 'playing') return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/screen-session?token=${encodeURIComponent(token)}`);
        if (!res.ok) return;
      } catch {}
    }, FALLBACK_POLL_MS);
    return () => clearInterval(t);
  }, [token, state]);

  // --- Initial load from REST if WS hasn't connected yet ---
  useEffect(() => {
    if (!token) return;
    const t = setTimeout(async () => {
      if (state !== 'loading') return;
      // Still loading after 3s — try REST heartbeat to establish session
      try {
        await fetch(`${API_BASE}/api/screen-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, version: '1.0.0' }),
        });
        if (slides.length > 0) setState('playing');
      } catch {}
    }, 3000);
    return () => clearTimeout(t);
  }, [token, state]); // eslint-disable-line

  // --- Kiosk key combo detection ---
  useEffect(() => {
    const combo = DEFAULT_KIOSK_KEY_COMBO.toLowerCase().split('+');

    function checkCombo() {
      const held = [...keysDown.current].map(k => k.toLowerCase());
      return combo.every(k => held.includes(k));
    }

    function onKeyDown(e: KeyboardEvent) {
      keysDown.current.add(e.key.toLowerCase());
      if (checkCombo()) {
        keyHoldTimer.current = setTimeout(() => setKioskLock(true), KIOSK_COMBO_HOLD_MS);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      keysDown.current.delete(e.key.toLowerCase());
      clearTimeout(keyHoldTimer.current);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };
  }, []);

  // --- Setup screen ---
  if (state === 'setup') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%', background: '#000', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px', width: '100%' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1rem', display: 'block' }}>
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <h1 style={{ color: '#f3f4f6', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>DisplayGrid</h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Enter your screen token to start</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); setToken(tokenInput.trim()); setState('loading'); }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              autoFocus
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="Screen token"
              style={{
                padding: '0.625rem 0.75rem', background: '#1f2937',
                border: '1px solid #374151', borderRadius: '0.5rem',
                color: '#f3f4f6', fontSize: '0.875rem', outline: 'none', fontFamily: 'monospace',
              }}
            />
            <button
              type="submit"
              disabled={!tokenInput.trim()}
              style={{
                padding: '0.625rem', background: '#3b82f6', border: 'none',
                borderRadius: '0.5rem', color: '#fff', fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
                opacity: tokenInput.trim() ? 1 : 0.5,
              }}
            >
              Connect
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%', background: '#000', gap: '1rem',
        fontFamily: 'system-ui, sans-serif', color: '#4b5563',
      }}>
        <svg style={{ animation: 'spin 1s linear infinite' }} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '0.875rem' }}>Connecting to DisplayGrid…</p>
      </div>
    );
  }

  // Emergency override — show a full-screen message
  if (override) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#7f1d1d', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#fef2f2' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 1.5rem', display: 'block' }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <h1 style={{ fontSize: 'min(5vw, 4rem)', fontWeight: 700, margin: '0 0 1rem' }}>
            {override.message ?? 'Emergency Override Active'}
          </h1>
          <p style={{ fontSize: 'min(2vw, 1.25rem)', color: '#fca5a5' }}>Please follow the instructions of building staff.</p>
        </div>
        {kioskLock && <KioskLock apiBase={API_BASE} onUnlock={() => setKioskLock(false)} />}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#000' }}>
      <SlidePlayer
        slides={slides}
        onSlideChange={id => { currentSlideId.current = id; }}
      />
      {kioskLock && (
        <KioskLock apiBase={API_BASE} onUnlock={() => setKioskLock(false)} />
      )}
    </div>
  );
}
