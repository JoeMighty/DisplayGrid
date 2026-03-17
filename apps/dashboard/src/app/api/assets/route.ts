import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, assets } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), '../../data/uploads'));

const MIME_TYPE_MAP: Record<string, 'image' | 'video' | 'pdf'> = {
  'image/jpeg': 'image',
  'image/png':  'image',
  'image/gif':  'image',
  'image/webp': 'image',
  'image/avif': 'image',
  'video/mp4':  'video',
  'video/webm': 'video',
  'video/ogg':  'video',
  'application/pdf': 'pdf',
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.select().from(assets).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const mimeType = file.type;
  const assetType = MIME_TYPE_MAP[mimeType];
  if (!assetType) return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 });

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext     = path.extname(file.name) || '.bin';
  const stem    = crypto.randomBytes(12).toString('hex');
  const buffer  = Buffer.from(await file.arrayBuffer());

  let finalBuffer = buffer;
  let finalMime   = mimeType;
  let filename    = `${stem}${ext}`;

  if (assetType === 'image') {
    const quality  = parseInt(await getSetting('image_quality')  ?? '90');
    const format   = (await getSetting('image_format')           ?? 'webp') as 'webp' | 'jpeg' | 'png' | 'avif';
    const maxWidth = parseInt(await getSetting('image_max_width') ?? '3840');
    const maxHeight= parseInt(await getSetting('image_max_height')?? '2160');

    const sharpFormats = { webp: 'webp', jpeg: 'jpeg', jpg: 'jpeg', png: 'png', avif: 'avif' } as const;
    const outFormat = sharpFormats[format] ?? 'webp';

    finalBuffer = await sharp(buffer)
      .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
      [outFormat]({ quality })
      .toBuffer();

    finalMime = `image/${outFormat}`;
    filename  = `${stem}.${outFormat}`;
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  await writeFile(filePath, finalBuffer);

  const [asset] = await db.insert(assets).values({
    filename,
    originalName: file.name,
    mimeType:     finalMime,
    type:         assetType,
    path:         filePath,
    sizeBytes:    finalBuffer.length,
  }).returning();

  return NextResponse.json(asset, { status: 201 });
}
