import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listTokens, createToken, revokeToken } from '@/lib/api-token';

// Token management is session-only and admin-only — you can't mint API tokens
// with an API token.
function canManage(role?: string) {
  return role === 'super_admin' || role === 'admin';
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage((session.user as { role?: string })?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(await listTokens());
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage((session.user as { role?: string })?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { name } = await req.json();
  const { token, summary } = await createToken(String(name ?? ''));
  // token is the plaintext, returned exactly once
  return NextResponse.json({ token, ...summary }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManage((session.user as { role?: string })?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await revokeToken(id);
  return new NextResponse(null, { status: 204 });
}
