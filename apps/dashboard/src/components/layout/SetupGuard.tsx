'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  setupComplete: boolean;
  children: React.ReactNode;
}

/**
 * Client component that redirects to /setup if the first-run wizard
 * has not been completed. Rendered inside server layouts that pass
 * the setup_complete flag down from the DB.
 */
export function SetupGuard({ setupComplete, children }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!setupComplete) {
      router.replace('/setup');
    }
  }, [setupComplete, router]);

  if (!setupComplete) return null;

  return <>{children}</>;
}
