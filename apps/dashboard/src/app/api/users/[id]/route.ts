import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sessionRole = (session.user as { role?: string })?.role;
  if (sessionRole !== 'super_admin' && sessionRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const id = parseInt(params.id);
  const { role, password } = await req.json();

  const updates: Record<string, string> = {};

  if (role) {
    const validRoles = ['super_admin', 'admin', 'operator', 'viewer'];
    if (!validRoles.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    if (role === 'super_admin' && sessionRole !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can assign super admin role' }, { status: 403 });
    }
    updates.role = role;
  }

  if (password?.trim()) {
    updates.passwordHash = await bcrypt.hash(password.trim(), 12);
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  await db.update(users).set(updates).where(eq(users.id, id));
  const updated = await db.select({ id: users.id, username: users.username, role: users.role, createdAt: users.createdAt })
    .from(users).where(eq(users.id, id)).get();

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sessionRole = (session.user as { role?: string })?.role;
  if (sessionRole !== 'super_admin') {
    return NextResponse.json({ error: 'Only super admins can delete users' }, { status: 403 });
  }

  const id = parseInt(params.id);
  const sessionUserId = parseInt((session.user as { id?: string })?.id ?? '0');

  if (id === sessionUserId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ success: true });
}
