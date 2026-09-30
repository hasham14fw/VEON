'use client';

import React from 'react';
import {markets, type Situation} from '@/lib/situations';
import {tier} from '@/lib/horizon/engine';
import {Tag, type Work} from './use-workspace';

export function CountryDomains({
  w,
  situations,
  market,
}: {
  w: Work;
  situations: Situation[];
  market: string;
}) {
  if (!markets.includes(market as typeof markets[number])) return null;

  const groups = [
    ['Political', ['Political & regulatory']],
    ['Security', ['Armed conflict']],
    ['Infrastructure', ['Energy & infrastructure']],
    ['Economic', ['Trade & sanctions', 'Technology controls']],
    ['Information environment', []],
  ] as [string, string[]][];

  return (
    <section className="panel country-domains">
      <div className="panel-heading">
        <div>
          <h2>{market} · domain assessment</h2>
          <p>Highest approved active case score by driver · provisional aggregation v1</p>
        </div>
      </div>
      <div className="domain-cards">
        {groups.map(([name, drivers]) => {
          const cases = situations.filter(
            (s) =>
              drivers.includes(s.driver) &&
              w.data?.assessments.some(
                (a) => a.situationId === s.id && !['Resolved', 'Archived'].includes(a.lifecycle)
              )
          );
          const alerts =
            w.data?.alerts.filter(
              (a) =>
                cases.some((s) => s.id === a.situationId) &&
                ['Approved', 'Acknowledged', 'Action recorded'].includes(a.state)
            ) || [];
          const score = alerts.length ? Math.max(...alerts.map((a) => a.score || 0)) : null;
          return (
            <div key={name}>
              <small>{name}</small>
              <strong>{score ?? '—'}</strong>
              <Tag>{score === null ? 'Not assessed' : tier(score)}</Tag>
              <p>{cases.length} linked cases · live coverage unavailable</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
