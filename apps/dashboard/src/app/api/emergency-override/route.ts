import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, emergencyOverride } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const rows = await db.select().from(emergencyOverride)
    .where(eq(emergencyOverride.isActive, true))
    .all();

  const active = rows.filter(r => !r.activeTo || r.activeTo > now);
  return NextResponse.json(active[0] ?? null);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, assetId, activeMinutes } = await req.json();

  // Deactivate any existing override
  await db.update(emergencyOverride).set({ isActive: false }).where(eq(emergencyOverride.isActive, true));

  const activeTo = activeMinutes ? new Date(Date.now() + activeMinutes * 60_000) : null;

  const [override] = await db.insert(emergencyOverride).values({
    message:  message ?? null,
    assetId:  assetId  ?? null,
    activeTo: activeTo ?? undefined,
    isActive: true,
  }).returning();

  return NextResponse.json(override, { status: 201 });
}

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.update(emergencyOverride).set({ isActive: false }).where(eq(emergencyOverride.isActive, true));
  return new NextResponse(null, { status: 204 });
}
