'use client';

import { useSession } from 'next-auth/react';
import type { UserRole } from '@displaygrid/shared';

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 4,
  admin:       3,
  operator:    2,
  viewer:      1,
};

interface RoleGuardProps {
  minRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGuard({ minRole, children, fallback = null }: RoleGuardProps) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: UserRole })?.role ?? 'viewer';
  if (ROLE_RANK[role] >= ROLE_RANK[minRole]) return <>{children}</>;
  return <>{fallback}</>;
}
