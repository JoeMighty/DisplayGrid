import type { NextAuthConfig } from 'next-auth';
import type { UserRole } from '@displaygrid/shared';

/**
 * Edge-compatible auth config — no Node.js-only imports (no db, no bcrypt).
 * Used by middleware. The full auth (with Credentials provider) is in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role: UserRole }).role;
      return token;
    },
    session({ session, token }) {
      (session.user as { role?: UserRole }).role = token.role as UserRole;
      return session;
    },
  },
  providers: [],
};
