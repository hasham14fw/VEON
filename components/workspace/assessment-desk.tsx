'use client';

import React, {useState, useEffect} from 'react';
import {ShieldCheck, Clock} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {geographies, lifecycles, blankAssessment, type Assessment, type Evidence} from '@/lib/horizon/model';
import {risk, confidence, confidenceBand, tier, clueGate} from '@/lib/horizon/engine';
import type {Situation} from '@/lib/situations';
import {Tag, stamp, type Work} from './use-workspace';
import {WorkspaceStatus} from './workspace-status';

export const numericFields = [
  ['severity', 'Anomaly severity', '25%'],
  ['plausibility', 'Scenario plausibility', '20%'],
  ['business', 'Business impact', '25%'],
  ['velocity', 'Escalation velocity', '15%'],
  ['reliability', 'Source reliability', '30% of confidence'],
  ['corroboration', 'Independent corroboration', '30% of confidence'],
  ['quality', 'Freshness & completeness', '25% of confidence'],
  ['precision', 'Geographic precision', '15% of confidence'],
] as const;

export function AssessmentDesk({
  w,
  situations,
  initial,
}: {
  w: Work;
  situations: Situation[];
  initial?: string;
}) {
  const [id, setId] = useState(initial || situations[0]?.id || '');
  const [draft, setDraft] = useState<Assessment>(blankAssessment(id));
  const [tab, setTab] = useState('Assessment');
  const [adding, setAdding] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [ev, setEv] = useState<any>({
    title: '',
    sourceId: 'acled',
    domain: 'Conflict',
    lineage: '',
    geography: 'Global',
    observedAt: '',
    publishedAt: '',
    url: '',
    stance: 'Supports',
    verified: false,
    exposureApproved: false,
    exposureReason: '',
    notes: '',
    synthetic: false,
  });

  const s = situations.find((s) => s.id === id);
  const a = w.data?.assessments.find((a) => a.situationId === id);

  useEffect(() => {
    setDraft(structuredClone(a || blankAssessment(id)));
    setHistory([]);
  }, [id, a?.revision]);

  const evidence = (w.data?.evidence || []).filter((e) => e.situationId === id);
  const gate = clueGate(evidence, id, s?.scope || 'Global');

  async function loadHistory() {
    try {
      const r = await fetch('/api/workspace?history=' + encodeURIComponent(id));
      if (!r.ok) throw Error('History could not be loaded');
      setHistory(await r.json());
    } catch (e) {
      w.setError((e as Error).message);
    }
  }

  if (!s) return <div className="empty">Add a situation to begin a governed assessment.</div>;

  return (
    <section className="panel assessment-desk">
      <div className="panel-heading">
        <div>
          <h2>Assessment & evidence</h2>
          <p>
            Revision {a?.revision || 0} ·{' '}
            {s.illustrative ? 'Illustrative case — operational approval blocked' : 'Analyst-authored case'}
          </p>
        </div>
        <select aria-label="Assessment situation" value={id} onChange={(e) => setId(e.target.value)}>
          {situations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>
      <div className="segmented desk-tabs">
        {['Assessment', 'Evidence', 'History', 'Feedback'].map((t) => (
          <button
            key={t}
            className={t === tab ? 'active' : ''}
            onClick={() => {
              setTab(t);
              if (t === 'History') loadHistory();
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="assessment-summary">
        <div>
          <small>Provisional score</small>
          <b>
            {risk(draft) ?? '—'}
            <Tag>{tier(risk(draft))}</Tag>
          </b>
        </div>
        <div>
          <small>Evidence confidence</small>
          <b>
            {confidence(draft) ?? '—'}
            <span>{confidenceBand(confidence(draft))}</span>
          </b>
        </div>
        <div>
          <small>48-hour corroboration</small>
          <b>
            {gate.count} / 3 <Tag>{gate.passed ? 'Eligible' : 'Not validated'}</Tag>
          </b>
        </div>
      </div>
      {tab === 'Assessment' && (
        <form
          className="h-form"
          onSubmit={async (e) => {
            e.preventDefault();
            await w.mutate('assessment', {data: draft});
          }}
        >
          <div className="form-grid">
            <label>
              Lifecycle
              <select
                value={draft.lifecycle}
                onChange={(e) => setDraft({...draft, lifecycle: e.target.value as Assessment['lifecycle']})}
              >
                {lifecycles.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Review due
              <Input
                type="date"
                value={draft.reviewDue}
                onChange={(e) => setDraft({...draft, reviewDue: e.target.value})}
              />
            </label>
            <label>
              Assessment owner
              <Input value={draft.owner} onChange={(e) => setDraft({...draft, owner: e.target.value})} />
            </label>
            <label>
              Global spillover / exposure rationale
              <Input
                value={draft.linkReason}
                onChange={(e) => setDraft({...draft, linkReason: e.target.value})}
              />
            </label>
          </div>
          <h3>Risk components</h3>
          <p className="muted">
            Scores use 0–100. Blank means unknown. Plausibility is an analyst assessment, not a calibrated probability.
          </p>
          <div className="score-input-grid">
            {numericFields.map(([field, label, weight]) => (
              <label key={field}>
                {label}
                <small>{weight}</small>
                {field === 'plausibility' ? (
                  <select
                    value={draft[field] ?? ''}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [field]: e.target.value === '' ? null : (Number(e.target.value) as Assessment['plausibility']),
                      })
                    }
                  >
                    <option value="">Not assessed</option>
                    {[0, 25, 50, 75, 100].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={draft[field] ?? ''}
                    placeholder="Unknown"
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        [field]: e.target.value === '' ? null : (Number(e.target.value) as Assessment['plausibility']),
                      })
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <div className="method-note">
            R = 25% severity + 20% plausibility + 25% business impact + 15% velocity + 15% confidence. Missing inputs
            leave the score incomplete. All scoring remains provisional pending calibration.
          </div>
          <h3>Business impact & playbook</h3>
          <div className="form-grid">
            {Object.entries(draft.impacts).map(([k, v]) => (
              <label key={k}>
                {k === 'supplyChain' ? 'Supply chain' : k.charAt(0).toUpperCase() + k.slice(1)}
                <Textarea
                  value={v}
                  onChange={(e) => setDraft({...draft, impacts: {...draft.impacts, [k]: e.target.value}})}
                />
              </label>
            ))}
          </div>
          <label>
            Assessment rationale · required
            <Textarea
              required
              minLength={3}
              value={draft.rationale}
              onChange={(e) => setDraft({...draft, rationale: e.target.value})}
            />
          </label>
          <label>
            Proposed playbook / management response
            <Textarea
              value={draft.playbook}
              onChange={(e) => setDraft({...draft, playbook: e.target.value})}
            />
          </label>
          <div className="form-actions">
            <Button type="submit" disabled={w.busy}>
              Save assessment revision
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={w.busy || !a}
              onClick={() =>
                w.mutate('candidate', {
                  data: {situationId: id, rationale: draft.rationale || 'Analyst requested review'},
                })
              }
            >
              Open alert candidate
            </Button>
          </div>
        </form>
      )}
      {tab === 'Evidence' && (
        <div className="desk-content">
          <div className="h-callout">
            <ShieldCheck />
            <div>
              <strong>{gate.count} independent qualifying domains</strong>
              <p>
                Verified supporting evidence, observed in the last 48 hours, with shared geography and distinct
                underlying lineages. Financial instruments count as one domain; social leads do not qualify.
              </p>
            </div>
            <Button
              onClick={() => {
                setEv({...ev, geography: s.scope});
                setAdding(true);
              }}
            >
              Add evidence
            </Button>
          </div>
          {evidence.map((e) => (
            <article className="evidence-card" key={e.id}>
              <div>
                <Tag>{e.stance}</Tag>
                <Tag>
                  {gate.clues.some((c) => c.id === e.id)
                    ? 'Qualifying clue'
                    : e.synthetic
                    ? 'Synthetic'
                    : 'Context only'}
                </Tag>
              </div>
              <h3>
                <a href={e.url} target="_blank" rel="noreferrer">
                  {e.title} ↗
                </a>
              </h3>
              <p>
                {e.domain} · {e.geography} · Lineage: {e.lineage}
              </p>
              <small>
                Observed {stamp(e.observedAt)} · Published {stamp(e.publishedAt)} · Received {stamp(e.receivedAt)}
              </small>
              <p>{e.notes}</p>
              {e.exposureReason && <p>Exposure link: {e.exposureReason}</p>}
            </article>
          ))}
          {!evidence.length && (
            <div className="empty">
              No structured evidence yet. Legacy source links remain in the situation dossier; review their provenance
              before qualification.
            </div>
          )}
        </div>
      )}
      {tab === 'History' && (
        <div className="desk-content">
          {history.map((h) => (
            <details className="history-row" key={h.id}>
              <summary>
                <Clock size={15} />
                {stamp(h.at)} · {h.kind}
              </summary>
              <pre>{JSON.stringify(h.data, null, 2)}</pre>
            </details>
          ))}
          {!history.length && <div className="empty">No saved revisions for this situation.</div>}
        </div>
      )}
      {tab === 'Feedback' && <Feedback w={w} id={id} />}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="edit-modal">
          <DialogTitle>Add original evidence</DialogTitle>
          <DialogDescription>
            Evidence is retained as recorded. Add corrections as new records and explain what changed.
          </DialogDescription>
          <form
            className="h-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await w.mutate('evidence', {
                  data: {
                    ...ev,
                    id: crypto.randomUUID(),
                    situationId: id,
                    observedAt: new Date(ev.observedAt).toISOString(),
                    publishedAt: new Date(ev.publishedAt).toISOString(),
                  },
                })
              ) {
                setAdding(false);
                setEv({...ev, title: '', url: '', notes: ''});
              }
            }}
          >
            <label>
              Evidence title
              <Input required value={ev.title} onChange={(e) => setEv({...ev, title: e.target.value})} />
            </label>
            <div className="form-grid">
              <label>
                Source
                <select
                  value={ev.sourceId}
                  onChange={(e) => {
                    const source = w.data!.sources.find((s) => s.id === e.target.value)!;
                    setEv({...ev, sourceId: source.id, domain: source.domain, lineage: source.lineage});
                  }}
                >
                  {w.data?.sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Underlying lineage
                <Input
                  required
                  minLength={2}
                  value={ev.lineage}
                  placeholder="Original dataset or report ID"
                  onChange={(e) => setEv({...ev, lineage: e.target.value})}
                />
              </label>
              <label>
                Geography
                <select value={ev.geography} onChange={(e) => setEv({...ev, geography: e.target.value})}>
                  {geographies.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label>
                Evidence direction
                <select value={ev.stance} onChange={(e) => setEv({...ev, stance: e.target.value})}>
                  {['Supports', 'Contradicts', 'Context'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Observed time (your device timezone)
                <Input
                  required
                  type="datetime-local"
                  value={ev.observedAt}
                  onChange={(e) => setEv({...ev, observedAt: e.target.value})}
                />
              </label>
              <label>
                Published time (your device timezone)
                <Input
                  required
                  type="datetime-local"
                  value={ev.publishedAt}
                  onChange={(e) => setEv({...ev, publishedAt: e.target.value})}
                />
              </label>
            </div>
            <label>
              Source URL
              <Input required type="url" value={ev.url} onChange={(e) => setEv({...ev, url: e.target.value})} />
            </label>
            <label>
              Notes / alternative explanations
              <Textarea value={ev.notes} onChange={(e) => setEv({...ev, notes: e.target.value})} />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={ev.verified}
                onChange={(e) => setEv({...ev, verified: e.target.checked})}
              />{' '}
              Analyst verified
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={ev.synthetic}
                onChange={(e) => setEv({...ev, synthetic: e.target.checked})}
              />{' '}
              Synthetic / test evidence
            </label>
            {ev.domain === 'Financial markets' && (
              <>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={ev.exposureApproved}
                    onChange={(e) => setEv({...ev, exposureApproved: e.target.checked})}
                  />{' '}
                  Approve financial exposure link to this situation
                </label>
                <Textarea
                  aria-label="Exposure link rationale"
                  value={ev.exposureReason}
                  onChange={(e) => setEv({...ev, exposureReason: e.target.value})}
                  placeholder="Explain the causal relevance to the local footprint…"
                />
              </>
            )}
            <WorkspaceStatus w={w} />
            <Button disabled={w.busy}>Save evidence</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function Feedback({w, id}: {w: Work; id: string}) {
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState('Needs review');
  return (
    <form
      className="h-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await w.mutate('feedback', {data: {situationId: id, text, outcome}})) setText('');
      }}
    >
      <h3>Outcome & correction review</h3>
      <p>Feedback is retained for review. It does not change production scores, rules or original records.</p>
      <label>
        Outcome
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
          {['Needs review', 'Confirmed', 'Dismissed'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label>
        Evidence, outcome or proposed correction
        <Textarea
          required
          minLength={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <Button disabled={w.busy}>Submit for review</Button>
    </form>
  );
}
