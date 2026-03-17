import { NextRequest, NextResponse } from 'next/server';
import { getSetting } from '@/lib/settings';

// Public — called by display clients
export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  if (!pin) return NextResponse.json({ error: 'pin required' }, { status: 400 });

  const stored = await getSetting('kiosk_pin');
  if (!stored) return NextResponse.json({ error: 'No PIN configured' }, { status: 403 });
  if (String(pin) !== stored) return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });

  return NextResponse.json({ ok: true });
}
