'use client';

import React from 'react';
import {Landmark, ShieldAlert, Zap, TrendingUp, Radio} from 'lucide-react';
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
    ['Political', ['Political & regulatory'], Landmark],
    ['Security', ['Armed conflict'], ShieldAlert],
    ['Infrastructure', ['Energy & infrastructure'], Zap],
    ['Economic', ['Trade & sanctions', 'Technology controls'], TrendingUp],
    ['Information environment', [], Radio],
  ] as [string, string[], React.ComponentType<{size?: number; className?: string}>][];

  return (
    <section className="panel country-domains">
      <div className="panel-heading">
        <div>
          <h2 className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            {market} · Domain Assessment
          </h2>
          <p>Highest approved active case score by operational driver · Real-time aggregation</p>
        </div>
      </div>
      <div className="domain-cards">
        {groups.map(([name, drivers, Icon]) => {
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
          const scorePercent = score !== null ? Math.min(100, Math.round(score * 100)) : 0;

          return (
            <div key={name} className="domain-card-item group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(0,127,193,0.12)] border border-[rgba(0,127,193,0.25)] flex items-center justify-center text-[var(--accent-primary)]">
                    <Icon size={14} />
                  </div>
                  <small className="font-semibold text-slate-700 text-xs tracking-wide">{name}</small>
                </div>
                <Tag>{score === null ? 'Not assessed' : tier(score)}</Tag>
              </div>

              <div className="flex items-baseline justify-between mt-2">
                <strong className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {score !== null ? score.toFixed(2) : '—'}
                </strong>
                <span className="text-[10px] text-slate-500 font-mono">
                  {cases.length} {cases.length === 1 ? 'case' : 'cases'}
                </span>
              </div>

              {score !== null && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      score >= 0.75
                        ? 'bg-gradient-to-r from-red-500 to-rose-400'
                        : score >= 0.5
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-sky-500 to-emerald-400'
                    }`}
                    style={{width: `${scorePercent}%`}}
                  />
                </div>
              )}

              <p className="text-[11px] text-slate-500 mt-2">
                {cases.length > 0 ? `${cases.length} linked active cases monitored` : 'No active operational alerts'}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
