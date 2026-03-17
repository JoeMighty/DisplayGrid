import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';
import { setSetting, isSetupComplete } from '@/lib/settings';
import { SETTING_SETUP_COMPLETE, SETTING_APP_NAME, SETTING_KIOSK_KEY_COMBO, DEFAULT_KIOSK_KEY_COMBO } from '@displaygrid/shared';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  // Guard: only runs if setup is not yet complete
  if (await isSetupComplete()) {
    return NextResponse.json({ error: 'Setup already complete' }, { status: 403 });
  }

  const body = await req.json();
  const { appName, username, password, kioskKeyCombo } = body;

  if (!appName || !username || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    username,
    passwordHash,
    role: 'super_admin',
  });

  await setSetting(SETTING_APP_NAME, appName);
  await setSetting(SETTING_KIOSK_KEY_COMBO, kioskKeyCombo ?? DEFAULT_KIOSK_KEY_COMBO);
  await setSetting(SETTING_SETUP_COMPLETE, '1');

  return NextResponse.json({ ok: true });
}
