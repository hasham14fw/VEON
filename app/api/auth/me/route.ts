import {env} from '@/lib/horizon/env';
import {getAuthenticatedUser} from '@/lib/horizon/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = getAuthenticatedUser(request, env);
  if (!user) {
    return Response.json({authenticated: false}, {status: 401});
  }

  return Response.json({
    authenticated: true,
    user: {
      username: user.username,
      role: user.role,
    },
  });
}
