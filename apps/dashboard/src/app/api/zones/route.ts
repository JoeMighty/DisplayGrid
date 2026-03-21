import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, zones } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const all = await db.select().from(zones).all();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const [zone] = await db.insert(zones).values({ name: name.trim(), description: description?.trim() || null }).returning();
  return NextResponse.json(zone, { status: 201 });
}
