import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSetting, setSetting } from '@/lib/settings';

const ALLOWED_KEYS = [
  'app_name',
  'image_quality',
  'image_format',
  'image_max_width',
  'image_max_height',
  'kiosk_pin',
  'kiosk_key_combo',
];

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const entries: Record<string, string | null> = {};
  for (const key of ALLOWED_KEYS) {
    entries[key] = await getSetting(key);
  }
  return NextResponse.json(entries);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_KEYS.includes(key) && typeof value === 'string') {
      await setSetting(key, value);
    }
  }
  return NextResponse.json({ ok: true });
}
