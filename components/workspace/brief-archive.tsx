'use client';

import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {risk, tier} from '@/lib/horizon/engine';
import type {Situation} from '@/lib/situations';
import {Tag, stamp, exportJSON, type Work} from './use-workspace';

export function BriefArchive({
  w,
  situations,
  scope,
}: {
  w: Work;
  situations: Situation[];
  scope: string;
}) {
  const [type, setType] = useState('Daily');
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<any>(null);

  function prepare() {
    const days = type === 'Daily' ? 1 : 7;
    const recent = situations.filter((s) => Date.parse(s.updated) > Date.now() - days * 86400000);
    const all = situations
      .map((s) => {
        const a = w.data?.assessments.find((a) => a.situationId === s.id);
        return {s, a, score: a ? risk(a) : null};
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

    setDraft(
      `HORIZON 1440 · ${type} brief\nScope: ${scope}\nAs of: ${new Date().toISOString()}\n${
        recent.length
      } situations updated in the last ${days === 1 ? '24 hours' : '7 days'}.\nData coverage: live feeds not yet activated; see source registry.\n\n` +
        all
          .map(
            ({s, a, score}) =>
              `${s.title}${s.illustrative ? ' [ILLUSTRATIVE]' : ''}\n${s.scope} | ${tier(score)} | ${
                score ?? 'Incomplete'
              } | ${a?.lifecycle || s.status}\nBase scenario: ${s.scenarios.Base.description}\nExposure: ${
                s.exposure || 'Not assessed'
              }\nDecision: ${a?.playbook || s.scenarios.Base.action}\nOwner: ${
                a?.owner || s.owner
              }\nOpportunity: ${s.opportunity || 'Not assessed'}\nEvidence: ${
                s.sources.map((x) => x.url).join(', ') || 'No legacy sources'
              }\n`
          )
          .join('\n')
    );
  }

  return (
    <section className="panel brief-archive">
      <div className="panel-heading">
        <div>
          <h2>Reviewed brief archive</h2>
          <p>Draft, review and approve. Scheduled generation and external distribution are not activated.</p>
        </div>
        <div className="button-row">
          <select aria-label="Brief frequency" value={type} onChange={(e) => setType(e.target.value)}>
            <option>Daily</option>
            <option>Weekly</option>
          </select>
          <Button variant="outline" onClick={prepare}>
            Prepare draft
          </Button>
        </div>
      </div>
      {draft && (
        <div className="h-form">
          <label>
            Review brief text
            <Textarea className="brief-editor" value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <Button
            disabled={w.busy}
            onClick={async () => {
              if (await w.mutate('brief', {data: {type, scope, content: draft}})) setDraft('');
            }}
          >
            Save draft for approval
          </Button>
        </div>
      )}
      {w.data?.briefs.map((b) => (
        <div key={b.id} className="brief-archive-row">
          <div>
            <strong>
              {b.type} · {b.scope}
            </strong>
            <small>{stamp(b.createdAt)}</small>
          </div>
          <Tag>{b.state}</Tag>
          <Button variant="outline" onClick={() => setOpen(b)}>
            Read
          </Button>
          {b.state === 'Draft' && (
            <Button disabled={w.busy} onClick={() => w.mutate('approveBrief', {id: b.id})}>
              Approve
            </Button>
          )}
          <Button variant="ghost" onClick={() => exportJSON(b, 'horizon-brief-' + b.id + '.json')}>
            Export
          </Button>
        </div>
      ))}
      {!w.data?.briefs.length && !draft && <div className="empty">No saved briefs yet.</div>}
      <Dialog
        open={!!open}
        onOpenChange={(v) => {
          if (!v) setOpen(null);
        }}
      >
        <DialogContent className="detail-modal">
          <DialogTitle>{open?.type} brief</DialogTitle>
          <DialogDescription>
            {open?.state} · {open?.createdAt}
          </DialogDescription>
          <pre className="brief-text">{open?.content}</pre>
        </DialogContent>
      </Dialog>
    </section>
  );
}
