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

export function createSessionToken(username: string, password: string): string {
  return btoa(`${username}:${password}`);
}

export function credentials(request: Request, config: {HORIZON_USERNAME?: string; HORIZON_PASSWORD?: string}): boolean {
  if (!config.HORIZON_USERNAME || !config.HORIZON_PASSWORD) return false;
  const expected = config.HORIZON_USERNAME + ':' + config.HORIZON_PASSWORD;

  // 1. Check HTTP Basic Authorization header
  try {
    const header = request.headers.get('authorization') || '';
    if (header.startsWith('Basic ')) {
      const received = atob(header.slice(6));
      if (safeCompare(received, expected)) return true;
    }
  } catch {}

  // 2. Check horizon_session cookie
  try {
    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies['horizon_session'];
    if (sessionToken) {
      const expectedToken = btoa(expected);
      if (safeCompare(sessionToken, expectedToken)) return true;
    }
  } catch {}

  return false;
}

export function actor(request: Request) {
  if (!credentials(request, env)) throw Error('Access denied');
  return env.HORIZON_USERNAME!;
}

export function mutationGuard(request: Request) {
  actor(request);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw Error('Access denied');
}
