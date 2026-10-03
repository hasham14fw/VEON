import { generateMarketAiPrediction } from '@/lib/horizon/ai-prediction';
import { actor, mutationGuard } from '@/lib/horizon/auth';
import { audit } from '@/lib/horizon/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const market = url.searchParams.get('market') || 'Pakistan';
    const prediction = await generateMarketAiPrediction(market);

    return Response.json({
      ok: true,
      prediction,
    });
  } catch (err: unknown) {
    return Response.json(
      { ok: false, error: (err as Error).message || 'Failed to generate AI strategic predictions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    mutationGuard(request);
    const who = actor(request);

    const body = (await request.json()) as {
      predictionId: string;
      market: string;
      actionTitle: string;
      actionCategory: string;
      actionDetail: string;
    };

    if (!body.actionTitle || !body.market) {
      return Response.json({ error: 'Action title and market are required.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // Log the strategic execution in the immutable audit trail
    await audit(
      'ai_strategy_executed',
      body.predictionId || `strategy-${Date.now()}`,
      {
        market: body.market,
        actionTitle: body.actionTitle,
        category: body.actionCategory,
        details: body.actionDetail,
        executedBy: who,
        timestamp: nowIso,
        status: 'EXECUTED_ACTIVE',
      },
      who
    );

    return Response.json({
      ok: true,
      message: `Strategic decision "${body.actionTitle}" dispatched and logged to corporate continuity audit.`,
      executedAt: nowIso,
    });
  } catch (err: unknown) {
    return Response.json(
      { ok: false, error: (err as Error).message || 'Failed to dispatch AI decision' },
      { status: 500 }
    );
  }
}
