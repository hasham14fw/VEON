import {getLiveAviationIntelligence, ACTIVE_NO_FLY_ZONES} from '@/lib/horizon/aviation';
import {actor, mutationGuard} from '@/lib/horizon/auth';
import {audit} from '@/lib/horizon/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const market = url.searchParams.get('market') || 'All markets';
    const report = await getLiveAviationIntelligence(market);

    return Response.json({
      ok: true,
      data: report,
      asOf: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return Response.json(
      {
        ok: false,
        error: (err as Error).message || 'Failed to fetch aviation intelligence',
      },
      {status: 500}
    );
  }
}

export async function POST(request: Request) {
  try {
    mutationGuard(request);
    const who = actor(request);
    const body = (await request.json().catch(() => ({}))) as {
      market?: string;
      action?: string;
      deviationId?: string;
    };

    const market = body.market || 'All markets';
    const report = await getLiveAviationIntelligence(market);

    // Audit event into workspace ledger
    await audit(
      'aviation_telemetry_synced',
      `aviation-${Date.now()}`,
      {
        action: body.action || 'sync_aviation_feed',
        market,
        totalDeviations: report.flightDeviations.length,
        activeNoFlyZones: report.noFlyZones.length,
        riskIndex: report.summary.airspaceRiskIndex,
        syncedBy: who,
      },
      who
    );

    return Response.json({
      ok: true,
      message: `Aviation telemetry synchronized for ${market}. Logged ${report.flightDeviations.length} flight deviations.`,
      summary: report.summary,
      asOf: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return Response.json(
      {
        ok: false,
        error: (err as Error).message || 'Failed to sync aviation telemetry',
      },
      {status: 500}
    );
  }
}
