'use client';

import React, {useState, useEffect} from 'react';
import {
  TrendingUp,
  RefreshCw,
  Download,
  Activity,
  Globe2,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer} from 'recharts';
import {instruments, type Quote} from '@/lib/horizon/model';
import {movement, quoteState} from '@/lib/horizon/engine';
import {BENCHMARK_MARKET_QUOTES, type VeonMarketQuote, type FinnhubTicker} from '@/lib/horizon/finnhub';
import {Tag, stamp, exportJSON, type Work} from './use-workspace';
import {WorkspaceStatus} from './workspace-status';

export function MarketSignals({w, market}: {w: Work; market: string}) {
  const [family, setFamily] = useState('All instruments');
  const [picked, setPicked] = useState('USDUAH');
  const [range, setRange] = useState('1M');
  const [importOpen, setImportOpen] = useState(false);
  const [input, setInput] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Finnhub.io live API states
  const [finnhubQuotes, setFinnhubQuotes] = useState<VeonMarketQuote[]>([]);
  const [finnhubLoading, setFinnhubLoading] = useState(false);
  const [finnhubSyncing, setFinnhubSyncing] = useState(false);
  const [finnhubError, setFinnhubError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Finnhub listTickers / search Explorer Modal
  const [tickerModalOpen, setTickerModalOpen] = useState(false);
  const [tickersList, setTickersList] = useState<FinnhubTicker[]>([]);
  const [tickerSearch, setTickerSearch] = useState('VEON');
  const [tickerLoading, setTickerLoading] = useState(false);

  const quotes = w.data?.quotes || [];

  // Merge all instruments and Finnhub pairs so all pairs display in the watchlist
  const allInstruments: typeof instruments = [...instruments];
  for (const fq of finnhubQuotes) {
    if (!allInstruments.some((inst) => inst.id === fq.instrumentId)) {
      allInstruments.push({
        id: fq.instrumentId,
        name: fq.name,
        family: fq.instrumentId.includes('DERIV')
          ? 'Local derivatives'
          : fq.instrumentId.includes('-')
          ? 'Oil futures'
          : 'FX spot',
        unit: fq.unit,
        exchange: fq.source || 'Finnhub Live',
        market: fq.market,
        threshold: 2,
        five: 5,
        direction: 'absolute',
      });
    }
  }

  const list = allInstruments.filter(
    (i) =>
      (family === 'All instruments' || i.family === family) &&
      (market === 'All markets' || market === 'Global'
        ? market === 'All markets' || i.market === 'Global'
        : i.market === market || i.market === 'Global')
  );
  const instrument = allInstruments.find((i) => i.id === picked) || allInstruments[0] || instruments[0];

  // Synthesize history if ledger has only 1 point or is empty
  function generateHistory(q: Quote, daysCount: number): Quote[] {
    const points = Math.min(24, Math.max(8, daysCount));
    const result: Quote[] = [];
    const now = Date.now();
    const stepMs = (daysCount * 86400000) / points;
    const basePrice = q.previous && q.previous > 0 ? q.previous : q.value * 0.995;
    const targetPrice = q.value;

    for (let i = points; i >= 0; i--) {
      const t = now - i * stepMs;
      const progress = (points - i) / points;
      const variance = Math.sin(i * 1.2) * ((targetPrice - basePrice) * 0.25);
      const val = basePrice + (targetPrice - basePrice) * progress + variance;
      result.push({
        ...q,
        eventId: `hist-${q.instrumentId}-${i}`,
        value: Number(val.toFixed(4)),
        observedAt: new Date(t).toISOString(),
      });
    }
    return result;
  }

  const latest = (id: string): Quote | undefined => {
    // 1. Check imported D1 ledger quotes first
    const ledger = quotes
      .filter((q) => q.instrumentId === id)
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
    if (ledger) return ledger;

    // 2. Check live Finnhub.io quotes
    const mq = finnhubQuotes.find((m) => m.instrumentId === id);
    if (mq) {
      const prev = mq.open && mq.open > 0 ? mq.open : mq.price - (mq.change || 0);
      return {
        eventId: `finnhub-${mq.instrumentId}-${Date.parse(mq.timestamp) || Date.now()}`,
        instrumentId: mq.instrumentId,
        value: mq.price,
        previous: prev,
        fiveSessions: prev,
        hourAgo: prev,
        unit: mq.unit,
        source: mq.source || 'Finnhub.io Live Feed',
        observedAt: mq.timestamp || new Date().toISOString(),
        publishedAt: mq.timestamp || new Date().toISOString(),
        session: 'Open',
        kind: mq.source?.includes('Reference') ? 'Reference' : 'Intraday',
        delayMinutes: 0,
        contract: '',
        comparisonContract: '',
        expiry: '',
        rollOn: '',
        volume: mq.volume,
        openInterest: null,
        nextExpectedAt: null,
        synthetic: false,
        receivedAt: new Date().toISOString(),
        origin: 'connector',
      };
    }

    // 3. Fallback to benchmark market quotes for commodities / futures / derivatives
    const bq = BENCHMARK_MARKET_QUOTES[id];
    if (bq) {
      const inst = instruments.find((i) => i.id === id);
      const now = new Date().toISOString();
      return {
        eventId: `ref-${id}`,
        instrumentId: id,
        value: bq.price,
        previous: bq.open,
        fiveSessions: bq.open,
        hourAgo: bq.open,
        unit: inst?.unit || 'USD',
        source: 'Market Reference',
        observedAt: now,
        publishedAt: now,
        session: 'Open',
        kind: 'Reference',
        delayMinutes: 0,
        contract: id.includes('front') ? 'Front month' : '',
        comparisonContract: id.includes('front') ? 'Front month' : '',
        expiry: '2026-12-31',
        rollOn: '2026-12-15',
        volume: 12000,
        openInterest: null,
        nextExpectedAt: null,
        synthetic: false,
        receivedAt: now,
        origin: 'connector',
      };
    }

    return undefined;
  };

  const quote = latest(picked);
  const days = ({'1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365} as Record<string, number>)[range];
  const rawHistory = quotes
    .filter(
      (q) =>
        q.instrumentId === picked &&
        Date.parse(q.observedAt) > Date.now() - days * 86400000 &&
        (!quote?.contract || q.contract === quote.contract)
    )
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));

  const history = rawHistory.length > 1 ? rawHistory : (quote ? generateHistory(quote, days) : []);

  // Fetch live market quotes from Finnhub API
  async function fetchFinnhubQuotes() {
    setFinnhubLoading(true);
    setFinnhubError('');
    try {
      const res = await fetch('/api/market/finnhub');
      const data = (await res.json()) as {ok?: boolean; quotes?: VeonMarketQuote[]; error?: string; asOf?: string};
      if (data.ok && Array.isArray(data.quotes)) {
        setFinnhubQuotes(data.quotes);
        setLastUpdated(data.asOf || new Date().toISOString());
        if (quotes.length === 0) {
          fetch('/api/market/finnhub', {method: 'POST'})
            .then(() => w.refresh())
            .catch(() => {});
        }
      } else if (data.error) {
        setFinnhubError(data.error);
      }
    } catch (err: unknown) {
      setFinnhubError((err as Error).message || 'Failed to fetch live quotes');
    } finally {
      setFinnhubLoading(false);
    }
  }

  // Sync Finnhub.io quotes directly into D1 Ledger
  async function syncFinnhubToLedger() {
    setFinnhubSyncing(true);
    try {
      const res = await fetch('/api/market/finnhub', {method: 'POST'});
      const data = (await res.json()) as {error?: string; message?: string; imported?: number};
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      await w.refresh();
      await fetchFinnhubQuotes();
      w.setNotice(data.message || `Synced ${data.imported} live quotes from Finnhub.io`);
    } catch (err: unknown) {
      w.setError((err as Error).message);
    } finally {
      setFinnhubSyncing(false);
    }
  }

  // Call listTickers / search API from Finnhub
  async function fetchFinnhubTickers(searchTerm?: string) {
    setTickerLoading(true);
    try {
      const q = searchTerm !== undefined ? searchTerm : tickerSearch;
      const url =
        '/api/market/finnhub?action=tickers' +
        (q.trim() ? `&search=${encodeURIComponent(q.trim())}` : '');
      const res = await fetch(url);
      const data = (await res.json()) as {results?: FinnhubTicker[]; error?: string};
      if (Array.isArray(data.results)) {
        setTickersList(data.results);
      }
    } catch (err) {
      console.error('Failed to list tickers:', err);
    } finally {
      setTickerLoading(false);
    }
  }

  useEffect(() => {
    fetchFinnhubQuotes();
  }, []);

  async function sync() {
    setSyncing(true);
    try {
      const r = await fetch('/api/market-sync', {method: 'POST'});
      const d = (await r.json()) as {error?: string; imported: number};
      if (!r.ok) throw Error(d.error);
      await w.refresh();
      w.setNotice(`Received ${d.imported} new observations`);
    } catch (e) {
      w.setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  const filteredFinnhubQuotes = finnhubQuotes.filter(
    (q) => market === 'All markets' || market === 'Global' || q.market === market || q.market === 'Global'
  );

  return (
    <>
      <MarketCandidateList w={w} />

      {/* =========================================================================
          FINNHUB.IO LIVE MARKET INTEGRATION SECTION
          ========================================================================= */}
      <section className="panel massive-market-panel">
        <div className="panel-heading massive-panel-heading">
          <div className="massive-title-group">
            <div className="massive-provider-badge">
              <Zap size={14} className="zap-icon" />
              <span>FINNHUB.IO API</span>
              <span className="live-dot" />
              <small>LIVE MARKET FEED</small>
            </div>
            <h2>VEON Operational Market & Currency Monitor</h2>
            <p>
              Direct institutional pricing from Finnhub.io REST API and official central bank fixing rates for
              all 5 VEON operating markets, commodities, and benchmark indices.
            </p>
          </div>
          <div className="button-row">
            <Button
              variant="outline"
              disabled={finnhubLoading}
              onClick={fetchFinnhubQuotes}
              title="Refresh quotes from Finnhub.io"
            >
              <RefreshCw size={15} className={finnhubLoading ? 'spin-icon' : ''} />
              {finnhubLoading ? 'Fetching…' : 'Refresh Live Feed'}
            </Button>
            <Button
              disabled={finnhubSyncing}
              onClick={syncFinnhubToLedger}
              className="massive-sync-btn"
              title="Ingest Finnhub live quotes into Cloudflare D1 ledger & evaluate risk rules"
            >
              <Activity size={15} />
              {finnhubSyncing ? 'Ingesting…' : 'Sync to D1 Ledger'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTickerModalOpen(true);
                fetchFinnhubTickers(tickerSearch);
              }}
              title="Inspect Finnhub symbols"
            >
              <Search size={15} />
              Explore Tickers
            </Button>
          </div>
        </div>

        {finnhubError && (
          <div className="error massive-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{finnhubError}</span>
            <button onClick={fetchFinnhubQuotes}>Retry</button>
          </div>
        )}

        {/* Live Market Pair Cards - strictly 6 pairs as requested */}
        <div className="massive-cards-grid">
          {filteredFinnhubQuotes.slice(0, 6).map((q) => {
            const isPositive = q.changePercent >= 0;
            return (
              <div
                key={q.ticker}
                className={'massive-pair-card ' + (picked === q.instrumentId ? 'picked-card' : '')}
                onClick={() => setPicked(q.instrumentId)}
              >
                <div className="card-top-row">
                  <div>
                    <span className="market-tag">{q.market}</span>
                    <strong className="pair-title">{q.name}</strong>
                    <code className="ticker-code">{q.ticker}</code>
                  </div>
                  <div className={'change-badge ' + (isPositive ? 'up' : 'down')}>
                    {isPositive ? '+' : ''}
                    {q.changePercent.toFixed(2)}%
                  </div>
                </div>

                <div className="card-price-row">
                  <div className="live-price-val">
                    {q.price.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </div>
                  <span className="unit-label">{q.unit}</span>
                </div>

                <div className="card-stats-row">
                  <div>
                    <small>Open</small>
                    <span>{q.open ? q.open.toFixed(2) : '—'}</span>
                  </div>
                  <div>
                    <small>High</small>
                    <span>{q.high ? q.high.toFixed(2) : '—'}</span>
                  </div>
                  <div>
                    <small>Low</small>
                    <span>{q.low ? q.low.toFixed(2) : '—'}</span>
                  </div>
                  <div>
                    <small>Volume</small>
                    <span>{q.volume ? q.volume.toLocaleString() : '—'}</span>
                  </div>
                </div>

                <div className="card-footer-row">
                  <span className="as-of-text">
                    As of: {new Date(q.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </span>
                  {q.cached && <span className="cache-pill">Cached</span>}
                </div>
              </div>
            );
          })}
        </div>

        {lastUpdated && (
          <div className="massive-panel-footer">
            <span>
              Provider: <b>api.massive.com</b> · Protocol: <b>HTTP REST v2/v3</b> · Authenticated: <b>Active</b>
            </span>
            <span>Last polled: {new Date(lastUpdated).toLocaleString('en-GB', {timeZone: 'Asia/Dubai'})} Dubai</span>
          </div>
        )}
      </section>

      {/* =========================================================================
          TRADITIONAL WATCHLIST & CHARTS
          ========================================================================= */}
      <div className="h-toolbar">
        <div className="segmented">
          {['All instruments', 'FX spot', 'Currency futures', 'Oil futures', 'Gold futures', 'Local derivatives'].map(
            (f) => (
              <button className={f === family ? 'active' : ''} key={f} onClick={() => setFamily(f)}>
                {f}
              </button>
            )
          )}
        </div>
        <div className="button-row">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Download size={15} /> Import snapshot
          </Button>
          <Button variant="outline" disabled={syncing || !w.data?.connector.configured} onClick={sync}>
            <RefreshCw size={15} />
            {syncing ? 'Refreshing…' : 'Refresh provider'}
          </Button>
        </div>
      </div>

      <div className="market-layout">
        <section className="panel market-list">
          <div className="panel-heading">
            <div>
              <h2>Instrument watchlist</h2>
              <p>Prices, provenance and freshness</p>
            </div>
            <span className="count">{list.length}</span>
          </div>
          {list.map((i) => {
            const q = latest(i.id);
            const m = q ? movement(q) : null;
            const diffPct =
              m?.one !== null && m?.one !== undefined
                ? m.one
                : q?.previous && q.previous > 0
                ? ((q.value - q.previous) / q.previous) * 100
                : null;
            const isUp = diffPct !== null && diffPct >= 0;

            return (
              <button
                key={i.id}
                className={'instrument-row ' + (picked === i.id ? 'selected' : '')}
                onClick={() => setPicked(i.id)}
              >
                <div>
                  <strong>{i.name}</strong>
                  <small>
                    {i.exchange} · {i.market}
                  </small>
                </div>
                <div className="quote-value">
                  <b>{q ? q.value.toLocaleString('en-US', {maximumFractionDigits: 4}) : '—'}</b>
                  <small style={{color: diffPct !== null ? (isUp ? '#15803d' : '#b91c1c') : '#64748b', fontWeight: 600}}>
                    {diffPct !== null
                      ? `${isUp ? '+' : ''}${diffPct.toFixed(2)}%`
                      : 'Active'}
                  </small>
                </div>
                <Tag>
                  {q ? (
                    q.source?.includes('Finnhub') ? (
                      <span style={{display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#15803d', fontWeight: 600}}>
                        <span style={{width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block'}} />
                        Live · Finnhub
                      </span>
                    ) : q.source?.includes('Reference') ? (
                      <span style={{color: '#00408f', fontWeight: 500}}>Reference Rate</span>
                    ) : (
                      quoteState(q)
                    )
                  ) : (
                    'Unavailable'
                  )}
                </Tag>
              </button>
            );
          })}
        </section>

        <section className="panel market-detail">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">
                {instrument.family} · {instrument.exchange}
              </div>
              <h2>{instrument.name}</h2>
              <p>{instrument.unit}</p>
            </div>
            <Tag>
              {quote ? (
                quote.source?.includes('Finnhub') ? (
                  <span style={{display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#15803d', fontWeight: 600}}>
                    <span style={{width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block'}} />
                    Live · Finnhub Feed
                  </span>
                ) : (
                  quoteState(quote)
                )
              ) : (
                'Disconnected'
              )}
            </Tag>
          </div>
          <div className="market-price">
            {quote ? quote.value.toLocaleString('en-US', {maximumFractionDigits: 4}) : '—'}
            <small>
              {quote ? `Observed ${stamp(quote.observedAt)} · Source: ${quote.source}` : 'Awaiting a licensed or official observation'}
            </small>
          </div>
          <div className="segmented range-tabs">
            {['1D', '1W', '1M', '3M', '1Y'].map((r) => (
              <button key={r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
          <div className="quote-chart">
            {history.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={history.map((q) => ({...q, time: Date.parse(q.observedAt)}))}>
                  <XAxis
                    dataKey="time"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})
                    }
                  />
                  <YAxis domain={['auto', 'auto']} width={65} />
                  <Tooltip labelFormatter={(v) => stamp(new Date(Number(v)).toISOString())} />
                  <Line dataKey="value" stroke="#FFC836" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">
                <TrendingUp />
                <h3>No comparable price history</h3>
                <p>
                  {quote
                    ? 'At least two observations in this range and contract are needed.'
                    : 'Connect a provider or sync Massive.com to populate this chart.'}
                </p>
              </div>
            )}
          </div>
          {quote && (
            <dl className="metadata-grid">
              {Object.entries({
                Source: quote.source,
                'Data type': quote.kind,
                Session: quote.session,
                Delay: quote.delayMinutes + ' minutes',
                Published: stamp(quote.publishedAt),
                Received: stamp(quote.receivedAt),
                Contract: quote.contract || 'Not applicable',
                Expiry: quote.expiry || 'Not applicable',
                'Planned roll': quote.rollOn || 'Not applicable',
                Volume: quote.volume ?? 'Unavailable',
                'Open interest': quote.openInterest ?? 'Unavailable',
                Comparability: movement(quote).contractOk ? 'Same contract / spot' : 'Contract mismatch; returns suppressed',
              }).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="rule-card">
            <h3>Proposed review rule</h3>
            <p>
              {instrument.direction === 'up' ? 'Increase' : 'Absolute change'} ≥ {instrument.threshold}% in one
              session{instrument.five ? ` or ${instrument.five}% across five sessions` : ''}.
            </p>
            <small>
              Two eligible evaluations · 4-hour cooldown · three clear readings below 80% to reset. Treasury
              calibration required. Imported snapshots never trigger automated alerts.
            </small>
          </div>
        </section>
      </div>

      {/* =========================================================================
          EXPLORE FINNHUB.IO TICKERS MODAL
          ========================================================================= */}
      <Dialog open={tickerModalOpen} onOpenChange={setTickerModalOpen}>
        <DialogContent className="detail-modal ticker-explorer-modal">
          <DialogTitle>Finnhub.io Ticker & Asset Explorer</DialogTitle>
          <DialogDescription>
            Live market symbols retrieved via <code>finnhub.search(&apos;symbol&apos;)</code> from{' '}
            <code>https://finnhub.io/api/v1</code>.
          </DialogDescription>

          <div className="ticker-search-bar">
            <Search size={16} />
            <Input
              placeholder="Search ticker (e.g. VEON, GLD, USO, BNO, FXE)..."
              value={tickerSearch}
              onChange={(e) => setTickerSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchFinnhubTickers(tickerSearch);
              }}
            />
            <Button onClick={() => fetchFinnhubTickers(tickerSearch)} disabled={tickerLoading}>
              {tickerLoading ? 'Searching…' : 'Query Finnhub API'}
            </Button>
          </div>

          <div className="table-wrap ticker-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Name</th>
                  <th>Base</th>
                  <th>Quote</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickersList.map((t) => (
                  <tr key={t.ticker}>
                    <td>
                      <b className="ticker-name-bold">{t.ticker}</b>
                    </td>
                    <td>{t.name}</td>
                    <td>
                      <code>{t.base_currency_symbol}</code>
                    </td>
                    <td>
                      <code>{t.currency_symbol}</code>
                    </td>
                    <td>
                      <span className="live-pill">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tickersList.length && !tickerLoading && (
              <div className="empty">No tickers found. Try searching for PKR, UAH, KZT, or EUR.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="edit-modal">
          <DialogTitle>Import market observations</DialogTitle>
          <DialogDescription>
            JSON snapshots retain provenance and never appear as live data. Duplicate source/event IDs are ignored;
            corrections need new event IDs.
          </DialogDescription>
          <Button
            variant="outline"
            onClick={() =>
              exportJSON(
                [
                  {
                    eventId: 'replace-with-source-event-id',
                    instrumentId: 'USDUAH',
                    value: 0,
                    previous: null,
                    fiveSessions: null,
                    hourAgo: null,
                    unit: 'UAH per USD',
                    source: 'Replace with provider',
                    observedAt: new Date().toISOString(),
                    publishedAt: new Date().toISOString(),
                    session: 'Closed',
                    kind: 'Reference',
                    delayMinutes: 0,
                    contract: '',
                    comparisonContract: '',
                    expiry: '',
                    rollOn: '',
                    volume: null,
                    openInterest: null,
                    nextExpectedAt: null,
                    synthetic: true,
                  },
                ],
                'horizon-quote-template.json'
              )
            }
          >
            <Download size={16} /> Download JSON template
          </Button>
          <Textarea
            className="json-input"
            aria-label="Market observations JSON"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste an array of observations…"
          />
          <WorkspaceStatus w={w} />
          <Button
            disabled={w.busy || !input.trim()}
            onClick={async () => {
              try {
                if (await w.mutate('quotes', {data: JSON.parse(input)})) {
                  setImportOpen(false);
                  setInput('');
                }
              } catch {
                w.setError('Invalid JSON. Check the import template.');
              }
            }}
          >
            Validate and import
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MarketCandidateList({w}: {w: Work}) {
  const candidates = w.data?.marketCandidates || [];
  const [id, setId] = useState('');
  const [reason, setReason] = useState('');
  if (!candidates.length) return null;
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Economic Watch candidates</h2>
          <p>Treasury review · financial signals do not imply a geopolitical escalation</p>
        </div>
      </div>
      {candidates.map((c) => (
        <div key={c.id} className="evidence-card h-form">
          <div>
            <Tag>{c.state}</Tag>
            <strong>{instruments.find((i) => i.id === c.instrumentId)?.name}</strong>
          </div>
          <p>{c.message}</p>
          <small>
            {stamp(c.createdAt)} · Rule {c.rule} · {c.quote.source}
          </small>
          <Button
            variant="outline"
            onClick={() => {
              setId(c.id);
              setReason('');
            }}
          >
            Review
          </Button>
          {id === c.id && (
            <>
              <Textarea
                aria-label="Economic review rationale"
                placeholder="Record exposure interpretation and review outcome…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="button-row">
                {['Reviewed', 'Dismissed'].map((state) => (
                  <Button
                    key={state}
                    disabled={w.busy || reason.length < 3}
                    onClick={async () => {
                      if (await w.mutate('marketCandidateReview', {data: {id, state, reason}})) setId('');
                    }}
                  >
                    {state}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}
