import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSetting, setSetting } from '@/lib/settings';

// Pre-set emergency messages, stored as JSON in the settings table (no schema
// migration needed). Each is { id, label, message }.
const SETTINGS_KEY = 'emergency_templates';

const DEFAULT_TEMPLATES = [
  { id: 'fire',     label: 'Fire evacuation', message: 'FIRE — Evacuate the building now. Use the nearest exit. Do not use lifts.' },
  { id: 'lockdown', label: 'Lockdown',        message: 'LOCKDOWN — Stay where you are, lock doors, and remain quiet until told otherwise.' },
  { id: 'shelter',  label: 'Shelter in place', message: 'Shelter in place. Move away from windows and await further instructions.' },
  { id: 'closure',  label: 'Closure',         message: 'This building is closed. Please make your way home safely.' },
  { id: 'weather',  label: 'Severe weather',  message: 'Severe weather warning in effect. Follow staff instructions and stay indoors.' },
];

function canEdit(role?: string) {
  return role === 'super_admin' || role === 'admin';
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const raw = await getSetting(SETTINGS_KEY);
  if (!raw) {
    await setSetting(SETTINGS_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    return NextResponse.json(DEFAULT_TEMPLATES);
  }
  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(DEFAULT_TEMPLATES);
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canEdit((session.user as { role?: string })?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  if (!Array.isArray(body)) return NextResponse.json({ error: 'Expected an array' }, { status: 400 });

  const cleaned = body
    .filter(t => t && typeof t.label === 'string' && typeof t.message === 'string')
    .map((t, i) => ({
      id:      typeof t.id === 'string' && t.id ? t.id : `t${i}_${Date.now()}`,
      label:   String(t.label).slice(0, 60).trim(),
      message: String(t.message).slice(0, 300).trim(),
    }))
    .filter(t => t.label && t.message);

  await setSetting(SETTINGS_KEY, JSON.stringify(cleaned));
  return NextResponse.json(cleaned);
}
