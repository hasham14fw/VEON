import { NextRequest, NextResponse } from 'next/server';
import { fetchReliefWebReports } from '@/lib/horizon/reliefweb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const market = searchParams.get('market') || 'Pakistan';
    const reports = await fetchReliefWebReports(market);

    return NextResponse.json({
      ok: true,
      market,
      count: reports.length,
      reports,
      source: 'UN OCHA ReliefWeb API',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error).message || 'Failed to fetch ReliefWeb reports',
      },
      { status: 500 }
    );
  }
}
