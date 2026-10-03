import { fetchWorldBankData } from '@/lib/horizon/worldbank';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const country = url.searchParams.get('country') || 'Pakistan';
    const data = await fetchWorldBankData(country);

    return Response.json({
      ok: true,
      data,
    });
  } catch (err: unknown) {
    return Response.json(
      { ok: false, error: (err as Error).message || 'Failed to load World Bank open data' },
      { status: 500 }
    );
  }
}
