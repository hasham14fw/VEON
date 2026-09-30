export async function POST() {
  const headers = new Headers();
  headers.set(
    'Set-Cookie',
    'horizon_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  headers.set('Content-Type', 'application/json');

  return new Response(JSON.stringify({ok: true}), {status: 200, headers});
}

export async function GET() {
  return POST();
}
