import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db, users } from '@displaygrid/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { UserRole } from '@displaygrid/shared';
import { authConfig } from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await db
          .select()
          .from(users)
          .where(eq(users.username, credentials.username as string))
          .get();

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;

        return { id: String(user.id), name: user.username, role: user.role as UserRole };
      },
    }),
  ],
});
