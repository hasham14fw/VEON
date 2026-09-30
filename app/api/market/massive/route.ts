import {env} from '@/lib/horizon/env';
import {restClient, VEON_FX_MAPPINGS} from '@/lib/horizon/massive';

export const dynamic = 'force-dynamic';
import {readRecord, writeRecord} from '@/lib/horizon/storage';
import {marketCondition} from '@/lib/horizon/engine';
import {type Quote, type Source, sourceSeeds, instruments} from '@/lib/horizon/model';
import {actor, mutationGuard} from '@/lib/horizon/auth';

const DEFAULT_API_KEY = 'CgdJGhwKjDgK6o2v8yKITrhBs0vErqpq';
const DEFAULT_API_URL = 'https://api.massive.com';

function getClient() {
  const config = env as unknown as Record<string, string>;
  const apiKey = config.MASSIVE_API_KEY || DEFAULT_API_KEY;
  const apiUrl = config.MASSIVE_API_URL || DEFAULT_API_URL;
  return restClient(apiKey, apiUrl);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'quotes';
    const client = getClient();

    // Action 1: List all tickers matching query parameters
    if (action === 'tickers') {
      const market = url.searchParams.get('market') || 'fx';
      const search = url.searchParams.get('search') || undefined;
      const limit = Number(url.searchParams.get('limit') || '100');
      const sort = url.searchParams.get('sort') || 'ticker';
      const order = (url.searchParams.get('order') as 'asc' | 'desc') || 'asc';
      const cursor = url.searchParams.get('cursor') || undefined;

      const response = await client.listTickers({
        market,
        search,
        limit,
        sort,
        order,
        cursor,
      });

      return Response.json(response);
    }

    // Action 2: Historical aggregate bars for charts
    if (action === 'bars') {
      const ticker = url.searchParams.get('ticker') || 'C:EURUSD';
      const days = Number(url.searchParams.get('days') || '30');
      const toDate = new Date().toISOString().slice(0, 10);
      const fromDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

      const response = await client.getAggregates(ticker, 1, 'day', fromDate, toDate);
      return Response.json(response);
    }

    // Action 3 (Default): Get live quotes for all VEON operating markets
    const data = await client.getVeonMarketQuotes();

    // Check if user requested auto-sync to D1
    const shouldSync = url.searchParams.get('sync') === 'true';
    if (shouldSync && data.quotes.length > 0) {
      await syncQuotesToLedger(data.quotes, 'Massive.com API');
    }

    return Response.json({
      ok: true,
      provider: 'Massive.com',
      market: 'fx',
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
      throw new Error('No quotes returned from Massive.com API: ' + (data.errors[0] || 'Unknown error'));
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
        license: 'Massive.com Live FX Feed (License Active)',
      },
      'Massive API',
      registry?.version || null,
      'Source health'
    );

    return Response.json({
      ok: true,
      imported,
      message: `Successfully synced ${imported} live market quotes from Massive.com`,
      asOf: at,
    });
  } catch (err: unknown) {
    return Response.json({error: (err as Error).message}, {status: 400});
  }
}

/**
 * Ingest Massive quotes into D1 ledger and evaluate threshold alerts
 */
async function syncQuotesToLedger(quotes: any[], actorName: string): Promise<number> {
  let imported = 0;
  const at = new Date().toISOString();

  for (const q of quotes) {
    const inst = instruments.find((i) => i.id === q.instrumentId);
    if (!inst) continue;

    const eventId = `massive-${q.ticker.replace(':', '-')}-${q.timestamp.slice(0, 10)}`;
    const id = `quote:massive:${eventId}`;

    const quoteRecord: Quote = {
      eventId,
      instrumentId: q.instrumentId,
      value: q.price,
      previous: q.open,
      fiveSessions: null,
      hourAgo: null,
      unit: q.unit,
      source: 'Massive.com',
      observedAt: q.timestamp,
      publishedAt: q.timestamp,
      receivedAt: at,
      session: 'Open',
      kind: 'Reference',
      delayMinutes: 0,
      contract: 'SPOT',
      comparisonContract: 'SPOT',
      expiry: '',
      rollOn: '',
      volume: q.volume || null,
      openInterest: null,
      nextExpectedAt: null,
      origin: 'connector',
      synthetic: false,
    };

    const existing = await readRecord<Quote>(id);
    if (!existing) {
      await writeRecord(id, 'quote', quoteRecord, actorName, null, 'Massive.com quote ingested');
      imported++;
    }

    // Evaluate market rule condition
    const stateId = 'market-rule:' + q.instrumentId;
    const old = await readRecord<any>(stateId);
    const previous = old?.data;

    const condition = marketCondition(quoteRecord);
    const hits = condition.eligible && condition.hit ? (previous?.hits || 0) + 1 : 0;
    const clear = condition.eligible && condition.clear ? (previous?.clear || 0) + 1 : 0;

    const state = {
      observedAt: quoteRecord.observedAt,
      contract: quoteRecord.contract,
      direction: condition.direction,
      hits,
      clear,
      lastAlert: previous?.lastAlert || null,
      active: clear >= 3 ? false : previous?.active || false,
    };

    if (hits >= 2 && !state.active && (!state.lastAlert || Date.now() - Date.parse(state.lastAlert) >= 4 * 3600000)) {
      const cid = `${q.instrumentId}:massive:${eventId}`;
      if (!(await readRecord('market-candidate:' + cid))) {
        await writeRecord(
          'market-candidate:' + cid,
          'market-candidate',
          {
            id: cid,
            instrumentId: q.instrumentId,
            createdAt: at,
            quote: quoteRecord,
            rule: 'massive-live-v1',
            state: 'Treasury review required',
            message: `Massive.com live FX move (${q.changePercent.toFixed(2)}%) crossed threshold for ${inst.name}. Exposure review required.`,
          },
          'Massive Rule Engine',
          null,
          'Economic candidate'
        );
        state.lastAlert = at;
        state.active = true;
      }
    }

    await writeRecord(stateId, 'market-rule', state, 'Massive Rule Engine', old?.version || null, 'Market rule evaluation');
  }

  return imported;
}
