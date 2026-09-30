import handler from 'vinext/server/fetch-handler';
import {credentials} from './lib/horizon/auth';

export default {
 async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
  (globalThis as any).env = env;
  if (!env.HORIZON_USERNAME || !env.HORIZON_PASSWORD) {
   return new Response('Set HORIZON_USERNAME and HORIZON_PASSWORD secrets before using this workspace.', {status: 503});
  }

  const url = new URL(request.url);
  const isAuthRoute = url.pathname === '/login' || url.pathname.startsWith('/api/auth');
  const isPublicAsset = url.pathname.startsWith('/_next/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/data/') || url.pathname === '/favicon.svg';

  // Serve static assets first if available
  if (env.ASSETS && (isPublicAsset || url.pathname.startsWith('/_next/'))) {
   const assetResponse = await env.ASSETS.fetch(request);
   if (assetResponse.status !== 404) return assetResponse;
  }

  const isAuthed = credentials(request, env);

  // If not authenticated and not accessing an auth route or public asset:
  if (!isAuthed && !isAuthRoute && !isPublicAsset) {
   // If it's an API request, return 401 JSON
   if (url.pathname.startsWith('/api/')) {
    return Response.json({error: 'Authentication required'}, {status: 401});
   }
   // Redirect browser user to /login
   return Response.redirect(new URL('/login', request.url), 302);
  }

  // If already authenticated and visiting /login, redirect to /
  if (isAuthed && url.pathname === '/login') {
   return Response.redirect(new URL('/', request.url), 302);
  }

  const response = await handler.fetch(request, env, ctx);
  if (response.status === 404 && env.ASSETS) {
   const assetResponse = await env.ASSETS.fetch(request);
   if (assetResponse.status !== 404) return assetResponse;
  }

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
 }
};

