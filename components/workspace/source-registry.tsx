'use client';

import React, {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {domains, type Source} from '@/lib/horizon/model';
import {Tag, type Work} from './use-workspace';
import {WorkspaceStatus} from './workspace-status';

export function SourceRegistry({w}: {w: Work}) {
  const [picked, setPicked] = useState<Source | null>(null);
  const [domain, setDomain] = useState('All domains');

  return (
    <>
      <div className="readiness-grid">
        {[
          ['Market feed', 'Awaiting provider', 'Licensed quotes and verified instruments'],
          ['Alert delivery', 'Not activated', 'Named recipients, channel and calendars'],
          ['AI assistance', 'Not connected', 'Model service and grounded retrieval'],
          ['Operational pilot', 'Not approved', 'Calibration, holdout and recovery sign-off'],
        ].map(([title, status, desc]) => (
          <div className="panel readiness-card" key={title}>
            <small>{title}</small>
            <h3>{status}</h3>
            <p>{desc}</p>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Source registry</h2>
            <p>Eight domains · coverage exceptions stay visible</p>
          </div>
          <select value={domain} aria-label="Source domain" onChange={(e) => setDomain(e.target.value)}>
            {['All domains', ...domains].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Domain</th>
                <th>Owner / cadence</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {w.data?.sources
                .filter((s) => domain === 'All domains' || s.domain === domain)
                .map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                      <small>{s.license || 'Rights not recorded'}</small>
                    </td>
                    <td>{s.domain}</td>
                    <td>
                      {s.owner || 'Owner required'}
                      <small>{s.cadence}</small>
                    </td>
                    <td>
                      <Tag>{s.status}</Tag>
                    </td>
                    <td>
                      <Button variant="outline" onClick={() => setPicked({...s})}>
                        Configure
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel h-form">
        <h2>Operational activation</h2>
        <p>
          The current release supports owner-only analysis. Team roles, market permissions, unattended ingestion,
          scheduled brief delivery and outbound notifications require separate activation and validation.
        </p>
        <div className="metadata-grid">
          <div>
            <dt>Brief schedule requirement</dt>
            <dd>Daily 08:00 Asia/Dubai; weekly Monday. Scheduler not active.</dd>
          </div>
          <div>
            <dt>Scoring dictionary</dt>
            <dd>Provisional · Treasury and Risk sign-off required</dd>
          </div>
          <div>
            <dt>Retention targets</dt>
            <dd>90 days raw; 24 months aggregates; 36 months audit. Automated purge not active; source rights govern import.</dd>
          </div>
          <div>
            <dt>Service objectives</dt>
            <dd>99.5% availability, RPO 24h, RTO 8h. Not yet benchmarked or recovery-tested.</dd>
          </div>
        </div>
        <p>Provider setup uses a licensed normalized feed. Secrets stay on the server. No source is marked operational by merely filling in this registry.</p>
      </section>
      <Dialog
        open={!!picked}
        onOpenChange={(v) => {
          if (!v) setPicked(null);
        }}
      >
        <DialogContent className="edit-modal">
          <DialogTitle>{picked?.name}</DialogTitle>
          <DialogDescription>Record source rights, provenance and operating responsibility.</DialogDescription>
          {picked && (
            <form
              className="h-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await w.mutate('source', {data: picked})) setPicked(null);
              }}
            >
              {(['owner', 'license', 'cadence', 'coverage', 'lineage', 'contact', 'retention'] as const).map((k) => (
                <label key={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                  <Input value={picked[k]} onChange={(e) => setPicked({...picked, [k]: e.target.value})} />
                </label>
              ))}
              <WorkspaceStatus w={w} />
              <Button disabled={w.busy}>Save source configuration</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
