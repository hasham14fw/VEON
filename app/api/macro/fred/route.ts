import { fetchFredData } from '@/lib/horizon/fred';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchFredData();

    return Response.json({
      ok: true,
      data,
    });
  } catch (err: unknown) {
    return Response.json(
      { ok: false, error: (err as Error).message || 'Failed to load FRED data' },
      { status: 500 }
    );
  }
}
