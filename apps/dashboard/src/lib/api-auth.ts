import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { verifyApiToken } from '@/lib/api-token';

/**
 * Allow a request through if it carries a valid dashboard session OR a valid
 * API token (Authorization: Bearer dg_…). Use on endpoints that should be
 * reachable both from the dashboard and by automation.
 */
export async function authorizeApi(req: NextRequest): Promise<boolean> {
  const session = await auth();
  if (session) return true;
  const tokenName = await verifyApiToken(req);
  return tokenName !== null;
}
