import {env} from '@/lib/horizon/env';

export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const [key, ...vals] = part.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(vals.join('='));
  }
  return cookies;
}

export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
export const TWELVE_HOURS_SECONDS = 12 * 60 * 60; // 43,200 seconds

export interface UserCredential {
  username: string;
  password: string;
  role: string;
}

export function getValidUsers(config?: {HORIZON_USERNAME?: string; HORIZON_PASSWORD?: string}): UserCredential[] {
  const primaryUser = config?.HORIZON_USERNAME || process.env.HORIZON_USERNAME || 'zohair';
  const primaryPass = config?.HORIZON_PASSWORD || process.env.HORIZON_PASSWORD || 'veon12345';

  return [
    {
      username: primaryUser,
      password: primaryPass,
      role: 'Lead Intelligence Operator',
    },
    {
      username: 'hike',
      password: 'hike123',
      role: 'Intelligence Analyst',
    },
  ];
}

export function createSessionToken(username: string, password: string, timestamp: number = Date.now()): string {
  return btoa(`${username}:${password}:${timestamp}`);
}

export function verifySessionToken(token: string, config?: {HORIZON_USERNAME?: string; HORIZON_PASSWORD?: string}): UserCredential | null {
  if (!token) return null;
  try {
    const decoded = atob(token);
    const parts = decoded.split(':');
    const u = parts[0];
    const p = parts[1];
    const ts = parts[2] ? Number(parts[2]) : null;

    // Strict 12-hour session lifetime enforcement
    if (ts && Number.isFinite(ts)) {
      if (Date.now() - ts > TWELVE_HOURS_MS) {
        return null; // Expired after 12 hours
      }
    }

    const validUsers = getValidUsers(config);
    const match = validUsers.find((user) => safeCompare(user.username, u) && safeCompare(user.password, p));
    return match || null;
  } catch {
    return null;
  }
}

export function getAuthenticatedUser(request: Request, config: {HORIZON_USERNAME?: string; HORIZON_PASSWORD?: string} = env): UserCredential | null {
  const validUsers = getValidUsers(config);

  // 1. Check HTTP Basic Authorization header
  try {
    const header = request.headers.get('authorization') || '';
    if (header.startsWith('Basic ')) {
      const received = atob(header.slice(6));
      const [u, p] = received.split(':');
      const match = validUsers.find((user) => safeCompare(user.username, u) && safeCompare(user.password, p));
      if (match) return match;
    }
  } catch {}

  // 2. Check horizon_session cookie
  try {
    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies['horizon_session'];
    if (sessionToken) {
      const verified = verifySessionToken(sessionToken, config);
      if (verified) return verified;
    }
  } catch {}

  return null;
}

export function credentials(request: Request, config: {HORIZON_USERNAME?: string; HORIZON_PASSWORD?: string}): boolean {
  return !!getAuthenticatedUser(request, config);
}

export function actor(request: Request): string {
  const user = getAuthenticatedUser(request, env);
  if (!user) throw Error('Access denied');
  return user.username;
}

export function mutationGuard(request: Request) {
  actor(request);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw Error('Access denied');
}
