import { useState, useEffect, useRef } from 'react';

interface KioskLockProps {
  onUnlock: () => void;
  apiBase: string;
}

export default function KioskLock({ onUnlock, apiBase }: KioskLockProps) {
  const [pin, setPin]           = useState('');
  const [error, setError]       = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked]     = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!locked) return;
    let s = 30;
    setCountdown(s);
    const t = setInterval(() => {
      s -= 1;
      setCountdown(s);
      if (s <= 0) { clearInterval(t); setLocked(false); setAttempts(0); setError(''); }
    }, 1000);
    return () => clearInterval(t);
  }, [locked]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;

    const res = await fetch(`${apiBase}/api/verify-kiosk-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });

    if (res.ok) {
      onUnlock();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      if (newAttempts >= 3) {
        setLocked(true);
        setError('Too many attempts. Locked for 30 seconds.');
      } else {
        setError(`Incorrect PIN. ${3 - newAttempts} attempt${3 - newAttempts !== 1 ? 's' : ''} remaining.`);
      }
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: '#111827', border: '1px solid #1f2937', borderRadius: '1rem',
        padding: '2rem', width: '100%', maxWidth: '320px', textAlign: 'center',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 0.75rem' }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style={{ color: '#f3f4f6', fontSize: '1rem', fontWeight: 600, margin: 0 }}>DisplayGrid</p>
          <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem' }}>Enter PIN to exit kiosk mode</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
            disabled={locked}
            placeholder="••••••"
            style={{
              width: '100%', padding: '0.625rem 0.75rem',
              background: '#1f2937', border: '1px solid #374151',
              borderRadius: '0.5rem', color: '#f3f4f6',
              fontSize: '1.25rem', textAlign: 'center', letterSpacing: '0.5em',
              outline: 'none', marginBottom: '1rem',
            }}
          />

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {error} {locked && countdown > 0 ? `(${countdown}s)` : ''}
            </p>
          )}

          <button
            type="submit"
            disabled={locked || pin.length === 0}
            style={{
              width: '100%', padding: '0.625rem',
              background: locked ? '#374151' : '#3b82f6',
              border: 'none', borderRadius: '0.5rem',
              color: '#fff', fontSize: '0.875rem', fontWeight: 600,
              cursor: locked ? 'not-allowed' : 'pointer',
              opacity: pin.length === 0 ? 0.5 : 1,
            }}
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
