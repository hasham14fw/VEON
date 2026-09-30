'use client';

import React, {useState, useEffect} from 'react';
import {TrendingUp, RefreshCw, Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer} from 'recharts';
import {instruments} from '@/lib/horizon/model';
import {movement, quoteState} from '@/lib/horizon/engine';
import {Tag, stamp, exportJSON, type Work} from './use-workspace';
import {WorkspaceStatus} from './workspace-status';

export function MarketSignals({w, market}: {w: Work; market: string}) {
  const [family, setFamily] = useState('All instruments');
  const [picked, setPicked] = useState('USDUAH');
  const [range, setRange] = useState('1M');
  const [importOpen, setImportOpen] = useState(false);
  const [input, setInput] = useState('');
  const [syncing, setSyncing] = useState(false);

  const quotes = w.data?.quotes || [];
  const list = instruments.filter(
    (i) =>
      (family === 'All instruments' || i.family === family) &&
      (market === 'All markets' || market === 'Global'
        ? market === 'All markets' || i.market === 'Global'
        : i.market === market || i.market === 'Global')
  );
  const instrument = instruments.find((i) => i.id === picked)!;

  const latest = (id: string) =>
    quotes
      .filter((q) => q.instrumentId === id)
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
  const quote = latest(picked);
  const days = ({'1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365} as Record<string, number>)[range];
  const history = quotes
    .filter(
      (q) =>
        q.instrumentId === picked &&
        Date.parse(q.observedAt) > Date.now() - days * 86400000 &&
        (!quote?.contract || q.contract === quote.contract)
    )
    .sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));

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

  useEffect(() => {
    if (!w.data?.connector.configured) return;
    const id = setInterval(() => {
      w.refresh();
    }, 60000);
    return () => clearInterval(id);
  }, [w.data?.connector.configured, w.refresh]);

  return (
    <>
      <MarketCandidateList w={w} />
      <div className="h-callout">
        <TrendingUp size={22} />
        <div>
          <strong>Financial markets · category 8</strong>
          <p>
            {w.data?.connector.configured
              ? 'Provider connection configured. Check as-of times and source status for availability.'
              : 'Live feeds are not connected. Instrument coverage and review rules are ready for provider onboarding.'}{' '}
            Market moves support assessment; they do not establish geopolitical causation.
          </p>
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          Import observations
        </Button>
      </div>
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
        <Button variant="outline" disabled={syncing || !w.data?.connector.configured} onClick={sync}>
          <RefreshCw size={16} />
          {syncing ? 'Refreshing…' : 'Refresh provider'}
        </Button>
      </div>
      {w.data?.connector.error && <div className="error">Provider: {w.data.connector.error}</div>}
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
                  <small>
                    {q && m?.one !== null && m?.one !== undefined
                      ? `${m.one >= 0 ? '+' : ''}${m.one.toFixed(2)}%`
                      : 'No comparable return'}
                  </small>
                </div>
                <Tag>{q ? quoteState(q) : 'Unavailable'}</Tag>
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
            <Tag>{quote ? quoteState(quote) : 'Disconnected'}</Tag>
          </div>
          <div className="market-price">
            {quote ? quote.value.toLocaleString('en-US', {maximumFractionDigits: 4}) : '—'}
            <small>
              {quote ? `Observed ${stamp(quote.observedAt)}` : 'Awaiting a licensed or official observation'}
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
                  <Line dataKey="value" stroke="#007FC1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">
                <TrendingUp />
                <h3>No comparable price history</h3>
                <p>
                  {quote
                    ? 'At least two observations in this range and contract are needed.'
                    : 'Connect a provider or import dated observations to populate this chart.'}
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
          <div className="method-note">
            {instrument.family === 'Local derivatives'
              ? 'Local futures, forwards and NDF availability requires verification; no substitute contract is implied.'
              : instrument.family.includes('futures')
              ? 'Monitor individual contracts. Roll five exchange business days before the earlier first-notice or last-trading date, once verified. Returns never cross contracts.'
              : 'Local FX shows local-currency units per USD; EUR/USD shows USD per EUR. Official rates are not tradable quotes.'}
          </div>
        </section>
      </div>
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
