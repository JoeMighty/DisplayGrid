'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Step {
  n: number;
  title: string;
  desc: string;
  cta: string;
  href: string;
  check: () => Promise<boolean>;
}

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Create your first zone',
    desc: 'Zones group screens by location — for example "Reception" or "Conference Room".',
    cta: 'Go to Zones',
    href: '/zones',
    check: async () => { const r = await fetch('/api/zones'); const d = await r.json(); return d.length > 0; },
  },
  {
    n: 2,
    title: 'Add a screen',
    desc: 'Register a display screen and assign it to a zone. You\'ll get a unique token to pair the display client.',
    cta: 'Go to Screens',
    href: '/screens',
    check: async () => { const r = await fetch('/api/screens'); const d = await r.json(); return d.length > 0; },
  },
  {
    n: 3,
    title: 'Upload your first asset',
    desc: 'Upload an image, video, or PDF to the asset library. DisplayGrid auto-converts images to WebP.',
    cta: 'Go to Assets',
    href: '/assets',
    check: async () => { const r = await fetch('/api/assets'); const d = await r.json(); return d.length > 0; },
  },
  {
    n: 4,
    title: 'Build a playlist',
    desc: 'Create a playlist for your screen and add slides. Drag to reorder, set duration and transition.',
    cta: 'Go to Playlists',
    href: '/playlists',
    check: async () => { const r = await fetch('/api/playlists'); const d = await r.json(); return d.length > 0; },
  },
  {
    n: 5,
    title: 'Pair the display client',
    desc: 'Open the display client URL on your screen device and enter the screen token from the Screens page.',
    cta: 'Open display client',
    href: 'http://localhost:5173',
    check: async () => false, // Manual step — user marks complete
  },
];

const STORAGE_KEY = 'dg_tutorial_dismissed';

export default function TutorialWizard() {
  const [dismissed, setDismissed]   = useState(true); // start hidden, check on mount
  const [completed, setCompleted]   = useState<number[]>([]);
  const [checking,  setChecking]    = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setDismissed(false);
    checkAll();
  }, []);

  async function checkAll() {
    setChecking(true);
    const results = await Promise.all(STEPS.map(s => s.check().catch(() => false)));
    setCompleted(STEPS.filter((_, i) => results[i]).map(s => s.n));
    setChecking(false);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }

  if (dismissed) return null;

  const nextStep = STEPS.find(s => !completed.includes(s.n)) ?? null;
  const allDone  = completed.length === STEPS.length;

  return (
    <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-5 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-blue-300 mb-0.5">Getting started</h2>
          <p className="text-xs text-blue-400/70">{completed.length} of {STEPS.length} steps complete</p>
        </div>
        <button onClick={dismiss} className="text-blue-500/50 hover:text-blue-400 transition text-xs">Dismiss</button>
      </div>

      <div className="space-y-2 mb-4">
        {STEPS.map(step => {
          const done = completed.includes(step.n);
          return (
            <div key={step.n} className={`flex items-center gap-3 rounded-lg p-2.5 transition ${nextStep?.n === step.n ? 'bg-blue-900/30' : ''}`}>
              <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition ${done ? 'bg-green-500/20 text-green-400' : nextStep?.n === step.n ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-600'}`}>
                {done
                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : step.n
                }
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${done ? 'text-gray-500 line-through' : nextStep?.n === step.n ? 'text-gray-200' : 'text-gray-500'}`}>{step.title}</p>
                {nextStep?.n === step.n && <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>}
              </div>
              {nextStep?.n === step.n && (
                <Link href={step.href} className="shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition">
                  {step.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {allDone ? (
        <div className="text-center py-2">
          <p className="text-sm font-semibold text-green-400 mb-1">All steps complete!</p>
          <p className="text-xs text-gray-500 mb-3">Your DisplayGrid instance is fully set up.</p>
          <button onClick={dismiss} className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition">Dismiss</button>
        </div>
      ) : (
        <button onClick={checkAll} disabled={checking} className="text-xs text-blue-500 hover:text-blue-400 transition disabled:opacity-50">
          {checking ? 'Checking…' : 'Refresh progress'}
        </button>
      )}
    </div>
  );
}
