import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes — always allowed
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/api/screens/by-token') ||
    pathname.startsWith('/api/client-config') ||
    pathname.startsWith('/api/screen-session') ||
    pathname.startsWith('/api/verify-kiosk-pin') ||
    pathname.match(/^\/api\/assets\/\d+\/file$/) !== null;

  if (isPublic) return NextResponse.next();

  // Not authenticated → redirect to login
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
