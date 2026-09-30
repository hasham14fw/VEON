'use client';

import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {anomaly} from '@/lib/horizon/engine';
import {stamp, exportJSON, type Work} from './use-workspace';

export function ValidationLab({w}: {w: Work}) {
  const [input, setInput] = useState('');
  const [value, setValue] = useState('');
  const [direction, setDirection] = useState<'up' | 'down' | 'both'>('both');
  const [at, setAt] = useState(new Date().toISOString().slice(0, 16));
  const [result, setResult] = useState<any>(null);

  return (
    <>
      <section className="panel h-form">
        <div className="eyebrow">HISTORICAL VALIDATION</div>
        <h2>Baseline replay</h2>
        <p>
          Evaluate daily observations against prior history. Only information received by the replay time is eligible;
          at least 60 valid daily observations within 90 days are required. This diagnostic does not create
          operational alerts.
        </p>
        <div className="form-grid">
          <label>
            Replay instant (device timezone)
            <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
          </label>
          <label>
            Current observed value
            <Input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <label>
            Adverse direction
            <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
              <option value="up">Increase</option>
              <option value="down">Decrease</option>
              <option value="both">Either direction</option>
            </select>
          </label>
        </div>
        <label>
          Historical observations (JSON)
          <Textarea
            className="json-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={'[{"value":100,"observedAt":"2026-06-01T12:00:00Z","receivedAt":"2026-06-01T12:01:00Z"}]'}
          />
        </label>
        <Button
          onClick={() => {
            try {
              const rows = JSON.parse(input);
              if (
                !Array.isArray(rows) ||
                !rows.every(
                  (r) =>
                    Number.isFinite(r.value) &&
                    Number.isFinite(Date.parse(r.observedAt)) &&
                    Number.isFinite(Date.parse(r.receivedAt))
                ) ||
                value === ''
              )
                throw Error();
              const when = new Date(at).toISOString();
              setResult(anomaly(rows, {value: Number(value), observedAt: when}, when, direction));
            } catch {
              w.setError('Enter valid dated observations and a current value.');
            }
          }}
        >
          Evaluate historical baseline
        </Button>
        {result && (
          <div className="assessment-summary">
            <div>
              <small>Result</small>
              <b>{result.status}</b>
            </div>
            <div>
              <small>Valid daily samples</small>
              <b>{result.n}</b>
            </div>
            <div>
              <small>Z-score</small>
              <b>{result.z === null ? 'Unavailable' : result.z.toFixed(3)}</b>
            </div>
          </div>
        )}
        <div className="method-note">
          No lunar inputs enter this calculation. Historical lead time, precision, misses and false-alert burden
          require analyst-confirmed event labels and a locked holdout dataset before pilot sign-off.
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Audit trail</h2>
            <p>Latest 200 events · immutable application records</p>
          </div>
          <Button variant="outline" onClick={() => exportJSON(w.data?.audit || [], 'horizon-audit.json')}>
            Export audit
          </Button>
        </div>
        {w.data?.audit.slice(0, 30).map((a) => (
          <details key={a.id} className="history-row">
            <summary>
              {stamp(a.at)} · {a.kind}
              <small>{a.entityId}</small>
            </summary>
            <pre>{JSON.stringify(a.data, null, 2)}</pre>
          </details>
        ))}
        {!w.data?.audit.length && <div className="empty">Audit events appear as records are saved.</div>}
      </section>
    </>
  );
}
