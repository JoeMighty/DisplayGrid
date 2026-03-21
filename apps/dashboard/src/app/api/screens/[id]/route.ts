import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, screens } from '@/lib/db';
import { eq, and, ne } from 'drizzle-orm';
import { generateScreenToken } from '@/lib/tokens';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  const { name, zoneId, resolutionW, resolutionH, refreshRate, rotation, panelGridCols, panelGridRows, colourProfile, customToken, regenerateToken } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const update: Record<string, unknown> = {
    name:          name.trim(),
    zoneId:        zoneId ?? null,
    resolutionW,
    resolutionH,
    refreshRate,
    rotation,
    panelGridCols,
    panelGridRows,
    colourProfile,
  };

  if (regenerateToken) {
    update.token = generateScreenToken();
  } else if (customToken?.trim()) {
    const t = customToken.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9\-_]{0,48}[a-z0-9]$/.test(t) && !/^[a-z0-9]$/.test(t)) {
      return NextResponse.json({ error: 'Token must be 2–50 characters: letters, numbers, hyphens, underscores.' }, { status: 400 });
    }
    const existing = await db.select({ id: screens.id }).from(screens)
      .where(and(eq(screens.token, t), ne(screens.id, id))).get();
    if (existing) return NextResponse.json({ error: 'That token is already in use.' }, { status: 409 });
    update.token = t;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(screens).set(update as any).where(eq(screens.id, id)).returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id);
  await db.delete(screens).where(eq(screens.id, id));
  return NextResponse.json({ ok: true });
}
