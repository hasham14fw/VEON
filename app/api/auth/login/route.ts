import {env} from '@/lib/horizon/env';
import {z} from 'zod';
import {safeCompare, createSessionToken, getValidUsers, TWELVE_HOURS_SECONDS} from '@/lib/horizon/auth';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const config = env as unknown as {HORIZON_USERNAME?: string; HORIZON_PASSWORD?: string};
    const validUsers = getValidUsers(config);

    const body = loginSchema.parse(await request.json());

    const matchedUser = validUsers.find(
      (u) => safeCompare(body.username, u.username) && safeCompare(body.password, u.password)
    );

    if (!matchedUser) {
      return Response.json({error: 'Invalid username or password'}, {status: 401});
    }

    const token = createSessionToken(matchedUser.username, matchedUser.password);
    // Strict 12-hour session expiration (43,200 seconds)
    const maxAge = TWELVE_HOURS_SECONDS;

    const headers = new Headers();
    headers.set(
      'Set-Cookie',
      `horizon_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
    );
    headers.set('Content-Type', 'application/json');

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          username: matchedUser.username,
          role: matchedUser.role,
        },
      }),
      {status: 200, headers}
    );
  } catch (err: unknown) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message || 'Invalid request' : (err as Error).message;
    return Response.json({error: message}, {status: 400});
  }
}
