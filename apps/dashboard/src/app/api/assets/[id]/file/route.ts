import { NextRequest, NextResponse } from 'next/server';
import { db, assets } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { readFile } from 'fs/promises';

// Public endpoint — no auth required so display clients can fetch assets directly
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!asset) return new NextResponse('Not found', { status: 404 });

  try {
    const buf = await readFile(asset.path);
    return new NextResponse(buf, {
      headers: {
        'Content-Type':  asset.mimeType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new NextResponse('File not found on disk', { status: 404 });
  }
}
