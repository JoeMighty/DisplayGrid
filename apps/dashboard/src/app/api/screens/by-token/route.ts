/**
 * Public endpoint — display clients use this to verify their token
 * and get their screen config on first boot.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, screens, zones, playlists, slides, assets, emergencyOverride } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const [screen] = await db
    .select({ id: screens.id, name: screens.name, token: screens.token, resolutionW: screens.resolutionW, resolutionH: screens.resolutionH, refreshRate: screens.refreshRate, rotation: screens.rotation, panelGridCols: screens.panelGridCols, panelGridRows: screens.panelGridRows, colourProfile: screens.colourProfile, zoneId: screens.zoneId, zoneName: zones.name })
    .from(screens)
    .leftJoin(zones, eq(screens.zoneId, zones.id))
    .where(eq(screens.token, token))
    .limit(1);

  if (!screen) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

  // Load active playlist + slides
  const [playlist] = await db.select().from(playlists).where(eq(playlists.screenId, screen.id)).limit(1);
  const slideRows = playlist
    ? await db.select({ id: slides.id, playlistId: slides.playlistId, assetId: slides.assetId, contentType: slides.contentType, content: slides.content, durationSeconds: slides.durationSeconds, transition: slides.transition, sortOrder: slides.sortOrder, enabled: slides.enabled, asset_filename: assets.filename, asset_mime_type: assets.mimeType, asset_type: assets.type })
        .from(slides)
        .leftJoin(assets, eq(slides.assetId, assets.id))
        .where(eq(slides.playlistId, playlist.id))
        .orderBy(slides.sortOrder)
        .all()
    : [];

  // Active emergency override
  const now = new Date();
  const [override] = await db.select().from(emergencyOverride)
    .where(eq(emergencyOverride.isActive, true))
    .limit(1);
  const activeOverride = override && (!override.activeTo || override.activeTo > now) ? override : null;

  return NextResponse.json({ screen, playlist: playlist ?? null, slides: slideRows, override: activeOverride });
}
