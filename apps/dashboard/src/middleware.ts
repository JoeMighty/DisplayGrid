import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // API endpoints that authenticate themselves (session OR Bearer API token).
  // The middleware must not redirect these to /login, or token clients (which
  // carry no session cookie) would get an HTML redirect instead of JSON.
  const isTokenApi =
    pathname === '/api/emergency-override' ||
    pathname === '/api/screens' ||
    pathname === '/api/playlists';
  if (isTokenApi) return NextResponse.next();

  // Public routes — always allowed
  const isPublic =
    pathname.startsWith('/login') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/display') ||
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
