'use client';

import React, {useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {type Situation, markets} from '@/lib/situations';
import world from '@/public/data/world.json';
import type {Work} from './use-workspace';

export function CoverageMap({
  w,
  situations,
  onMarket,
}: {
  w: Work;
  situations: Situation[];
  onMarket: (m: string) => void;
}) {
  const [coverage, setCoverage] = useState(true);

  const totals = markets.map((m) => {
    const approved = (w.data?.alerts || []).filter(
      (a) =>
        ['Approved', 'Acknowledged', 'Action recorded'].includes(a.state) &&
        situations.some((s) => s.id === a.situationId && s.markets.includes(m)) &&
        w.data?.assessments.find((x) => x.situationId === a.situationId)?.lifecycle !== 'Resolved' &&
        w.data?.assessments.find((x) => x.situationId === a.situationId)?.lifecycle !== 'Archived'
    );
    return {
      market: m,
      score: approved.length ? Math.max(...approved.map((a) => a.score ?? 0)) : null,
      count: approved.length,
    };
  });

  return (
    <section className="panel coverage-panel">
      <div className="panel-heading">
        <div>
          <h2>Market exposure & coverage</h2>
          <p>Highest approved active score · country-level view</p>
        </div>
        <label className="switch-label">
          <Switch checked={coverage} onCheckedChange={setCoverage} aria-label="Show coverage gaps" /> Coverage gaps
        </label>
      </div>
      <div className="coverage-layout">
        <div>
          <svg
            className="world-map"
            viewBox="0 0 720 300"
            role="img"
            aria-label="World map highlighting the five monitored markets"
          >
            <rect width="720" height="300" fill="#f4f8f9" />
            {world.map((f) => {
              const t = totals.find((t) => t.market === f.name);
              return (
                <path
                  key={f.name}
                  d={f.d}
                  fill={t ? (t.score !== null && t.score > 40 ? '#E85A0C' : '#00408F') : '#D4D5D4'}
                  stroke="#fff"
                  strokeWidth=".5"
                />
              );
            })}
          </svg>
          <small className="map-note">
            Natural Earth · geographic context, not asset locations or a statement on borders. No active alerts does
            not mean no risk.
          </small>
        </div>
        <div className="coverage-markets">
          {totals.map((t) => (
            <button key={t.market} onClick={() => onMarket(t.market)}>
              <span>
                <strong>{t.market}</strong>
                <small>
                  {t.count} approved active cases{coverage ? ' · live coverage unavailable' : ''}
                </small>
              </span>
              <b>{t.score ?? '—'}</b>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
