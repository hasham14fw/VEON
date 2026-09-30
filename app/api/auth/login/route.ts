import {env} from '@/lib/horizon/env';
import {z} from 'zod';
import {safeCompare, createSessionToken} from '@/lib/horizon/auth';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const config = env as unknown as {HORIZON_USERNAME?: string; HORIZON_PASSWORD?: string};
    const validUsername = config.HORIZON_USERNAME || 'zohair';
    const validPassword = config.HORIZON_PASSWORD || 'veon12345';

    const body = loginSchema.parse(await request.json());

    const isUserMatch = safeCompare(body.username, validUsername);
    const isPassMatch = safeCompare(body.password, validPassword);

    if (!isUserMatch || !isPassMatch) {
      return Response.json({error: 'Invalid username or password'}, {status: 401});
    }

    const token = createSessionToken(validUsername, validPassword);
    // 30 days if remember is true, else 24 hours
    const maxAge = body.remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

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
          username: validUsername,
          role: 'Intelligence Operator',
        },
      }),
      {status: 200, headers}
    );
  } catch (err: unknown) {
    const message = err instanceof z.ZodError ? err.errors[0]?.message || 'Invalid request' : (err as Error).message;
    return Response.json({error: message}, {status: 400});
  }
}
