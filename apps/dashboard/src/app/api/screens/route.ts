import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, screens, zones } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { generateScreenToken } from '@/lib/tokens';
import { DEFAULT_RESOLUTION_W, DEFAULT_RESOLUTION_H, DEFAULT_REFRESH_RATE } from '@displaygrid/shared';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id:            screens.id,
      name:          screens.name,
      token:         screens.token,
      zoneId:        screens.zoneId,
      zoneName:      zones.name,
      resolutionW:   screens.resolutionW,
      resolutionH:   screens.resolutionH,
      refreshRate:   screens.refreshRate,
      rotation:      screens.rotation,
      panelGridCols: screens.panelGridCols,
      panelGridRows: screens.panelGridRows,
      colourProfile: screens.colourProfile,
      createdAt:     screens.createdAt,
    })
    .from(screens)
    .leftJoin(zones, eq(screens.zoneId, zones.id))
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, zoneId, resolutionW, resolutionH, refreshRate, rotation, panelGridCols, panelGridRows, colourProfile } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const token = generateScreenToken();

  const [screen] = await db.insert(screens).values({
    name:          name.trim(),
    zoneId:        zoneId ?? null,
    resolutionW:   resolutionW   ?? DEFAULT_RESOLUTION_W,
    resolutionH:   resolutionH   ?? DEFAULT_RESOLUTION_H,
    refreshRate:   refreshRate   ?? DEFAULT_REFRESH_RATE,
    rotation:      rotation      ?? 0,
    panelGridCols: panelGridCols ?? 1,
    panelGridRows: panelGridRows ?? 1,
    colourProfile: colourProfile ?? 'srgb',
    token,
  }).returning();

  return NextResponse.json(screen, { status: 201 });
}
