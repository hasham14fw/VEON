'use client';

import React, {useState} from 'react';
import {ShieldCheck, AlertTriangle, ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import type {Situation} from '@/lib/situations';
import {Tag, stamp, type Work} from './use-workspace';
import {WorkspaceStatus} from './workspace-status';

export function AlertQueue({w, situations}: {w: Work; situations: Situation[]}) {
  const [state, setState] = useState('Active');
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [override, setOverride] = useState(false);
  const [filter, setFilter] = useState('All tiers');

  const alerts = (w.data?.alerts || [])
    .filter(
      (a) =>
        situations.some((s) => s.id === a.situationId) &&
        (state === 'All' || (state === 'Active' ? a.state !== 'Closed' : a.state === state)) &&
        (filter === 'All tiers' || a.tier === filter)
    )
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const active = w.data?.alerts.find((a) => a.id === selected);

  const transitions: Record<string, string[]> = {
    Candidate: ['Under review', 'Closed'],
    'Under review': ['Approved', 'Closed'],
    Approved: ['Acknowledged', 'Closed'],
    Acknowledged: ['Action recorded', 'Closed'],
    'Action recorded': ['Closed'],
    Closed: [],
  };

  return (
    <>
      <div className="h-callout">
        <AlertTriangle />
        <div>
          <strong>Analyst review queue</strong>
          <p>
            Approval records an internal decision. External delivery is not connected; no messages are sent and no
            delivery acknowledgment clock starts.
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Ranked candidates & alerts</h2>
            <p>Low-confidence cases remain visible for urgent review</p>
          </div>
          <div className="button-row">
            <select aria-label="Alert state" value={state} onChange={(e) => setState(e.target.value)}>
              {['Active', 'All', 'Candidate', 'Under review', 'Approved', 'Acknowledged', 'Action recorded', 'Closed'].map(
                (s) => (
                  <option key={s}>{s}</option>
                )
              )}
            </select>
            <select aria-label="Alert tier" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {['All tiers', 'Incomplete', 'Advisory', 'Watch', 'Warning', 'Severe', 'Critical'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {alerts.map((a, i) => (
          <button
            key={a.id}
            className="alert-row"
            onClick={() => {
              setSelected(a.id);
              setReason('');
              setOverride(false);
            }}
          >
            <span className="rank">{String(i + 1).padStart(2, '0')}</span>
            <b className="risk-number">{a.score ?? '—'}</b>
            <div>
              <h3>{a.title}</h3>
              <small>
                {a.kind} · {a.confidence === null ? 'Confidence incomplete' : a.confidence + ' confidence'} ·{' '}
                {stamp(a.createdAt)}
              </small>
            </div>
            {situations.find((s) => s.id === a.situationId)?.illustrative && <Tag>Illustrative</Tag>}
            <Tag>{a.tier}</Tag>
            <Tag>{a.state}</Tag>
            <ChevronRight size={18} />
          </button>
        ))}
        {!alerts.length && (
          <div className="empty">
            <ShieldCheck />
            <h3>No alert candidates in this view</h3>
            <p>Save a situation assessment and open a candidate in Assessment & evidence.</p>
          </div>
        )}
      </section>
      <div className="tier-ladder">
        {[
          ['Advisory', '0–20', 'Record only'],
          ['Watch', '21–40', 'Next local business day'],
          ['Warning', '41–60', '24 hours'],
          ['Severe', '61–80', '4 hours'],
          ['Critical', '81–100', '1 hour'],
        ].map(([t, n, ack]) => (
          <div key={t}>
            <Tag>{t}</Tag>
            <strong>{n}</strong>
            <small>Acknowledgment target: {ack}</small>
          </div>
        ))}
      </div>
      <Dialog
        open={!!active}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="detail-modal">
          <DialogTitle>{active?.title}</DialogTitle>
          <DialogDescription>
            Governed review · original evidence and decisions remain in the audit trail.
          </DialogDescription>
          {active && (
            <>
              <div className="button-row">
                <Tag>{active.tier}</Tag>
                <Tag>{active.state}</Tag>
                {active.override && <Tag>Emergency override</Tag>}
              </div>
              <p>{active.rationale}</p>
              <dl className="metadata-grid">
                <div>
                  <dt>Assessment revision</dt>
                  <dd>{active.assessmentRevision}</dd>
                </div>
                <div>
                  <dt>Evidence frozen at approval</dt>
                  <dd>{active.evidenceIds.length} records</dd>
                </div>
                <div>
                  <dt>External delivery</dt>
                  <dd>Not configured · not sent</dd>
                </div>
                <div>
                  <dt>Approval</dt>
                  <dd>{active.approvedAt ? stamp(active.approvedAt) : 'Pending'}</dd>
                </div>
              </dl>
              {active.decision && (
                <p>
                  <b>Decision:</b> {active.decision}
                </p>
              )}
              {active.outcome && (
                <p>
                  <b>Outcome:</b> {active.outcome}
                </p>
              )}
              {active.state !== 'Closed' && (
                <>
                  <label>
                    Review rationale / decision
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
                  </label>
                  {active.state === 'Under review' && (
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={override}
                        onChange={(e) => setOverride(e.target.checked)}
                      />{' '}
                      Human-confirmed emergency override · detailed reason required
                    </label>
                  )}
                  <div className="button-row">
                    {transitions[active.state].map((next) => (
                      <Button
                        key={next}
                        variant={next === 'Closed' ? 'outline' : 'default'}
                        disabled={w.busy || !reason.trim()}
                        onClick={async () => {
                          if (
                            await w.mutate('alert', {
                              data: {
                                id: active.id,
                                expectedAt: active.updatedAt,
                                state: next,
                                reason,
                                override,
                              },
                            })
                          ) {
                            setReason('');
                            setOverride(false);
                          }
                        }}
                      >
                        {next === 'Approved'
                          ? 'Approve internally'
                          : next === 'Acknowledged'
                          ? 'Acknowledge in workspace'
                          : next === 'Action recorded'
                          ? 'Record decision'
                          : next === 'Closed'
                          ? 'Close with outcome'
                          : 'Start review'}
                      </Button>
                    ))}
                  </div>
                </>
              )}
              <WorkspaceStatus w={w} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
