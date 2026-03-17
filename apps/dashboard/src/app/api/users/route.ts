import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role !== 'super_admin' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const all = await db
    .select({ id: users.id, username: users.username, role: users.role, createdAt: users.createdAt })
    .from(users)
    .all();

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as { role?: string })?.role;
  if (role !== 'super_admin' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { username, password, role: newRole } = await req.json();
  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const validRoles = ['super_admin', 'admin', 'operator', 'viewer'];
  if (!validRoles.includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Only super_admin can create super_admin accounts
  if (newRole === 'super_admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can create super admin accounts' }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const [user] = await db.insert(users).values({
      username: username.trim(),
      passwordHash,
      role: newRole,
    }).returning({ id: users.id, username: users.username, role: users.role, createdAt: users.createdAt });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }
}
