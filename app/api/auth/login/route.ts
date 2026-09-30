import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {safeCompare, createSessionToken} from '@/lib/horizon/auth';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional().default(true),
});

export async function POST(request: Request) {
  try {
    const config = env as unknown as {HORIZON_USERNAME?: string; HORIZON_PASSWORD?: string};
    if (!config.HORIZON_USERNAME || !config.HORIZON_PASSWORD) {
      return Response.json(
        {error: 'Server credentials (HORIZON_USERNAME / HORIZON_PASSWORD) are not configured.'},
        {status: 503}
      );
    }

    const body = loginSchema.parse(await request.json());

    const isUserMatch = safeCompare(body.username, config.HORIZON_USERNAME);
    const isPassMatch = safeCompare(body.password, config.HORIZON_PASSWORD);

    if (!isUserMatch || !isPassMatch) {
      return Response.json({error: 'Invalid username or password'}, {status: 401});
    }

    const token = createSessionToken(config.HORIZON_USERNAME, config.HORIZON_PASSWORD);
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
          username: config.HORIZON_USERNAME,
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
