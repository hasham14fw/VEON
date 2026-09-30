/**
 * Massive.com / Polygon REST API Client for HORIZON 1440
 * Integrates live FX pairs across VEON operating markets.
 */

export interface MassiveTicker {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  active: boolean;
  currency_symbol: string;
  currency_name: string;
  base_currency_symbol: string;
  base_currency_name: string;
  last_updated_utc: string;
}

export interface ListTickersParams {
  market?: string;
  active?: string | boolean;
  order?: 'asc' | 'desc';
  limit?: string | number;
  sort?: string;
  search?: string;
  cursor?: string;
}

export interface ListTickersResponse {
  status: string;
  count: number;
  results: MassiveTicker[];
  next_url?: string;
  request_id?: string;
  error?: string;
  message?: string;
}

export interface PreviousCloseResult {
  T: string;
  v: number;
  vw: number;
  o: number;
  c: number;
  h: number;
  l: number;
  t: number;
  n: number;
}

export interface PreviousCloseResponse {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results?: PreviousCloseResult[];
  status: string;
  request_id?: string;
  error?: string;
  message?: string;
}

export interface AggregateBar {
  v: number;
  vw: number;
  o: number;
  c: number;
  h: number;
  l: number;
  t: number;
  n: number;
}

export interface AggregatesResponse {
  ticker: string;
  status: string;
  queryCount?: number;
  resultsCount?: number;
  results?: AggregateBar[];
  error?: string;
  message?: string;
}

export interface VeonMarketQuote {
  instrumentId: string;
  ticker: string;
  name: string;
  market: string;
  unit: string;
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  cached?: boolean;
}

export const VEON_FX_MAPPINGS: Record<
  string,
  {instrumentId: string; ticker: string; name: string; market: string; unit: string}
> = {
  USDUAH: {
    instrumentId: 'USDUAH',
    ticker: 'C:USDUAH',
    name: 'USD / UAH',
    market: 'Ukraine',
    unit: 'UAH per USD',
  },
  USDPKR: {
    instrumentId: 'USDPKR',
    ticker: 'C:USDPKR',
    name: 'USD / PKR',
    market: 'Pakistan',
    unit: 'PKR per USD',
  },
  USDBDT: {
    instrumentId: 'USDBDT',
    ticker: 'C:USDBDT',
    name: 'USD / BDT',
    market: 'Bangladesh',
    unit: 'BDT per USD',
  },
  USDKZT: {
    instrumentId: 'USDKZT',
    ticker: 'C:USDKZT',
    name: 'USD / KZT',
    market: 'Kazakhstan',
    unit: 'KZT per USD',
  },
  USDUZS: {
    instrumentId: 'USDUZS',
    ticker: 'C:USDUZS',
    name: 'USD / UZS',
    market: 'Uzbekistan',
    unit: 'UZS per USD',
  },
  EURUSD: {
    instrumentId: 'EURUSD',
    ticker: 'C:EURUSD',
    name: 'EUR / USD',
    market: 'Global',
    unit: 'USD per EUR',
  },
};

// Global in-memory cache to respect API rate limits (5 req/min on free tier)
const cache = new Map<string, {data: any; expiresAt: number}>();

export class MassiveRestClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.massive.com') {
    this.apiKey = apiKey.trim();
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private getAuthUrl(endpoint: string, params: Record<string, string | number | boolean | undefined> = {}): string {
    const url = new URL(`${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`);
    url.searchParams.set('apiKey', this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async fetchWithCache<T>(url: string, ttlMs: number = 60000): Promise<T> {
    const now = Date.now();
    const cached = cache.get(url);
    if (cached && cached.expiresAt > now) {
      return {...cached.data, _cached: true} as T;
    }

    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(12000),
      });

      if (res.status === 429) {
        if (cached) {
          return {...cached.data, _rateLimited: true, _cached: true} as T;
        }
        throw new Error('Massive API rate limit reached (5 req/min). Please retry in 60 seconds.');
      }

      if (!res.ok) {
        const text = await res.text();
        let errMsg = `Massive API HTTP ${res.status}`;
        try {
          const json = JSON.parse(text);
          errMsg = json.error || json.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = (await res.json()) as T;
      cache.set(url, {data, expiresAt: now + ttlMs});
      return data;
    } catch (err: unknown) {
      if (cached) {
        return {...cached.data, _fallback: true, _error: (err as Error).message} as T;
      }
      throw err;
    }
  }

  /**
   * List tickers matching filter criteria (matching @massive.com/client-js listTickers interface)
   */
  async listTickers(params: ListTickersParams = {}): Promise<ListTickersResponse> {
    const endpoint = '/v3/reference/tickers';
    const queryParams: Record<string, string | number | boolean | undefined> = {
      market: params.market || 'fx',
      active: params.active !== undefined ? params.active : 'true',
      order: params.order || 'asc',
      limit: params.limit || 100,
      sort: params.sort || 'ticker',
      search: params.search,
      cursor: params.cursor,
    };
    const url = this.getAuthUrl(endpoint, queryParams);
    return this.fetchWithCache<ListTickersResponse>(url, 300000); // 5 min cache for tickers list
  }

  /**
   * Get previous day aggregate bar for a ticker
   */
  async getPreviousClose(ticker: string): Promise<PreviousCloseResponse> {
    const endpoint = `/v2/aggs/ticker/${encodeURIComponent(ticker)}/prev`;
    const url = this.getAuthUrl(endpoint, {adjusted: true});
    return this.fetchWithCache<PreviousCloseResponse>(url, 60000); // 1 min cache
  }

  /**
   * Get aggregate bars over a date range
   */
  async getAggregates(
    ticker: string,
    multiplier: number = 1,
    timespan: 'minute' | 'hour' | 'day' | 'week' = 'day',
    from: string,
    to: string
  ): Promise<AggregatesResponse> {
    const endpoint = `/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${multiplier}/${timespan}/${from}/${to}`;
    const url = this.getAuthUrl(endpoint, {adjusted: true, sort: 'asc'});
    return this.fetchWithCache<AggregatesResponse>(url, 180000); // 3 min cache
  }

  /**
   * Fetch all VEON FX quotes in a rate-limit safe manner
   */
  async getVeonMarketQuotes(): Promise<{quotes: VeonMarketQuote[]; status: string; errors: string[]}> {
    const results: VeonMarketQuote[] = [];
    const errors: string[] = [];

    const pairs = Object.values(VEON_FX_MAPPINGS);

    for (const item of pairs) {
      try {
        const prev = await this.getPreviousClose(item.ticker);
        const bar = prev.results?.[0];

        if (bar) {
          const price = bar.c;
          const open = bar.o;
          const high = bar.h;
          const low = bar.l;
          const change = price - open;
          const changePercent = open > 0 ? (change / open) * 100 : 0;
          const timestamp = new Date(bar.t).toISOString();

          results.push({
            instrumentId: item.instrumentId,
            ticker: item.ticker,
            name: item.name,
            market: item.market,
            unit: item.unit,
            price,
            open,
            high,
            low,
            change,
            changePercent,
            volume: bar.v,
            timestamp,
            cached: !!(prev as any)._cached,
          });
        }
      } catch (err: unknown) {
        errors.push(`${item.ticker}: ${(err as Error).message}`);
      }
    }

    return {
      quotes: results,
      status: results.length > 0 ? 'OK' : 'ERROR',
      errors,
    };
  }
}

/**
 * Factory function matching user's exact specification:
 * const rest = restClient(apiKey, 'https://api.massive.com');
 */
export function restClient(
  apiKey: string,
  baseUrl: string = 'https://api.massive.com'
): MassiveRestClient {
  return new MassiveRestClient(apiKey, baseUrl);
}
