import { randomBytes } from 'crypto';

export function generateScreenToken(): string {
  return randomBytes(16).toString('hex');
}
