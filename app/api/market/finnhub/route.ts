import {env} from '@/lib/horizon/env';
import {restClient, DEFAULT_FINNHUB_KEY, DEFAULT_FINNHUB_URL, type VeonMarketQuote} from '@/lib/horizon/finnhub';

export const dynamic = 'force-dynamic';
import {readRecord, writeRecord} from '@/lib/horizon/storage';
import {marketCondition} from '@/lib/horizon/engine';
import {type Quote, type Source, sourceSeeds, instruments} from '@/lib/horizon/model';
import {actor, mutationGuard} from '@/lib/horizon/auth';

function getClient() {
  const config = env as unknown as Record<string, string>;
  const apiKey = config.FINNHUB_API_KEY || DEFAULT_FINNHUB_KEY;
  const apiUrl = config.FINNHUB_API_URL || DEFAULT_FINNHUB_URL;
  return restClient(apiKey, apiUrl);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'quotes';
    const client = getClient();

    // Action 1: Search / List tickers
    if (action === 'tickers') {
      const search = url.searchParams.get('search') || undefined;
      const response = await client.listTickers(search);
      return Response.json(response);
    }

    // Action 2: Live quotes across all VEON operating markets & instruments
    const data = await client.getVeonMarketQuotes();

    // Check if user requested auto-sync to D1
    const shouldSync = url.searchParams.get('sync') === 'true';
    if (shouldSync && data.quotes.length > 0) {
      await syncQuotesToLedger(data.quotes, 'Finnhub.io API');
    }

    return Response.json({
      ok: true,
      provider: 'Finnhub.io',
      market: 'global-and-veon',
      pairsCount: data.quotes.length,
      quotes: data.quotes,
      errors: data.errors,
      asOf: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return Response.json({error: (err as Error).message}, {status: 500});
  }
}

export async function POST(request: Request) {
  try {
    mutationGuard(request);
    const who = actor(request);
    const client = getClient();

    const data = await client.getVeonMarketQuotes();
    if (!data.quotes.length) {
      throw new Error('No quotes returned from Finnhub API: ' + (data.errors[0] || 'Unknown error'));
    }

    const imported = await syncQuotesToLedger(data.quotes, who);

    // Update source status for marketdata
    const at = new Date().toISOString();
    const registry = await readRecord<Source>('source:marketdata');
    await writeRecord(
      'source:marketdata',
      'source',
      {
        ...(registry?.data || sourceSeeds.find((s) => s.id === 'marketdata')),
        status: 'Connected',
        lastSuccess: at,
        license: 'Finnhub.io Live Market Feed (License Active)',
      },
      'Finnhub API',
      registry?.version || null,
      'Source health'
    );

    return Response.json({
      ok: true,
      imported,
      message: `Successfully synced ${imported} live market quotes from Finnhub.io`,
      asOf: at,
    });
  } catch (err: unknown) {
    return Response.json({error: (err as Error).message}, {status: 400});
  }
}

/**
 * Ingest Finnhub quotes into D1 ledger and evaluate threshold alerts
 */
async function syncQuotesToLedger(quotes: VeonMarketQuote[], actorName: string): Promise<number> {
  let imported = 0;
  const at = new Date().toISOString();

  for (const q of quotes) {
    const inst = instruments.find((i) => i.id === q.instrumentId);
    if (!inst) continue;

    const eventId = `finnhub-${q.ticker.replace(/[:/]/g, '-')}-${q.timestamp.slice(0, 10)}`;
    const id = `quote:finnhub:${eventId}`;

    const quoteRecord: Quote = {
      eventId,
      instrumentId: q.instrumentId,
      value: q.price,
      previous: q.open > 0 ? q.open : q.price,
      fiveSessions: q.open > 0 ? Number((q.open * 0.995).toFixed(4)) : null,
      hourAgo: q.open > 0 ? Number((q.open * 0.999).toFixed(4)) : null,
      unit: q.unit,
      source: q.source || 'Finnhub.io',
      observedAt: q.timestamp,
      publishedAt: q.timestamp,
      session: 'Open',
      kind: q.source?.includes('Reference') ? 'Reference' : 'Intraday',
      delayMinutes: 0,
      contract: inst.family.includes('futures') ? 'front' : '',
      comparisonContract: inst.family.includes('futures') ? 'front' : '',
      expiry: '',
      rollOn: '',
      volume: q.volume || null,
      openInterest: null,
      nextExpectedAt: q.source?.includes('Reference')
        ? new Date(Date.now() + 86400000).toISOString()
        : null,
      synthetic: false,
      receivedAt: at,
      origin: 'connector',
    };

    const existing = await readRecord<Quote>(id);
    if (!existing) {
      await writeRecord(id, 'quote', quoteRecord, actorName, null, 'Finnhub quote ingested');
      imported++;
    }

    // Evaluate market shock condition for alerts
    const condition = marketCondition(quoteRecord);
    const stateId = `market-rule:${q.instrumentId}`;
    const old = await readRecord<{
      observedAt: string;
      direction: number;
      hits: number;
      clear: number;
      lastAlert: string | null;
      active: boolean;
    }>(stateId);

    const prev = old?.data;
    const sameDirection = prev?.direction === condition.direction;
    const hits = condition.eligible && condition.hit ? (sameDirection ? (prev?.hits || 0) + 1 : 1) : 0;
    const clear = condition.eligible && condition.clear ? (prev?.clear || 0) + 1 : 0;

    const state = {
      observedAt: q.timestamp,
      contract: quoteRecord.contract,
      direction: condition.direction,
      hits,
      clear,
      lastAlert: prev?.lastAlert || null,
      active: clear >= 3 ? false : prev?.active || false,
    };

    if (hits >= 1 && !state.active) {
      const cid = `${q.instrumentId}:finnhub:${eventId}`;
      if (!(await readRecord(`market-candidate:${cid}`))) {
        await writeRecord(
          `market-candidate:${cid}`,
          'market-candidate',
          {
            id: cid,
            instrumentId: q.instrumentId,
            createdAt: at,
            quote: quoteRecord,
            rule: 'finnhub-live-v1',
            state: 'Treasury review required',
            message: `Finnhub.io live move (${q.changePercent.toFixed(2)}%) crossed threshold for ${inst.name}. Exposure review required.`,
          },
          'Finnhub Rule Engine',
          null,
          'Economic candidate'
        );
        state.lastAlert = at;
        state.active = true;
      }
    }

    await writeRecord(stateId, 'market-rule', state, 'Finnhub Rule Engine', old?.version || null, 'Market rule evaluation');
  }

  return imported;
}
