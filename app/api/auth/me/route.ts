import {env} from 'cloudflare:workers';
import {credentials} from '@/lib/horizon/auth';

export async function GET(request: Request) {
  const isAuthed = credentials(request, env);
  if (!isAuthed) {
    return Response.json({authenticated: false}, {status: 401});
  }

  const config = env as unknown as {HORIZON_USERNAME?: string};
  return Response.json({
    authenticated: true,
    user: {
      username: config.HORIZON_USERNAME || 'operator',
      role: 'Intelligence Operator',
    },
  });
}
