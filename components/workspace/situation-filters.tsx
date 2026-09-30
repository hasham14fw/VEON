'use client';

import React from 'react';
import {SlidersHorizontal} from 'lucide-react';
import {risk, confidence, confidenceBand, tier} from '@/lib/horizon/engine';
import type {Situation} from '@/lib/situations';
import type {Workspace} from '@/lib/horizon/model';

export const defaultFilters = {
  driver: 'All drivers',
  tier: 'All tiers',
  confidence: 'All confidence',
  freshness: 'Any freshness',
  period: 'All time',
};

export function matchesSituation(s: Situation, w: Workspace | null, f: typeof defaultFilters) {
  const a = w?.assessments.find((a) => a.situationId === s.id);
  const score = a ? risk(a) : null;
  const evidence = w?.evidence.filter((e) => e.situationId === s.id && !e.synthetic) || [];
  const fresh = evidence.some((e) => Date.now() - Date.parse(e.observedAt) <= 48 * 3600000);
  const days =
    f.period === '24 hours' ? 1 : f.period === '7 days' ? 7 : f.period === '30 days' ? 30 : Infinity;
  return (
    (f.driver === 'All drivers' || s.driver === f.driver) &&
    (f.tier === 'All tiers' || tier(score) === f.tier) &&
    (f.confidence === 'All confidence' || (a ? confidenceBand(confidence(a)) : 'Incomplete') === f.confidence) &&
    (f.freshness === 'Any freshness' || (f.freshness === 'Fresh evidence' ? fresh : !fresh)) &&
    Date.now() - Date.parse(s.updated) <= days * 86400000
  );
}

export function SituationFilters({
  value,
  onChange,
}: {
  value: typeof defaultFilters;
  onChange: (f: typeof defaultFilters) => void;
}) {
  return (
    <div className="situation-filters">
      <SlidersHorizontal size={17} />
      {(Object.keys(defaultFilters) as (keyof typeof defaultFilters)[]).map((k) => (
        <select
          key={k}
          aria-label={'Situation ' + k + ' filter'}
          value={value[k]}
          onChange={(e) => onChange({...value, [k]: e.target.value})}
        >
          {(k === 'driver'
            ? [
                'All drivers',
                'Armed conflict',
                'Technology controls',
                'Trade & sanctions',
                'Political & regulatory',
                'Energy & infrastructure',
              ]
            : k === 'tier'
            ? ['All tiers', 'Incomplete', 'Advisory', 'Watch', 'Warning', 'Severe', 'Critical']
            : k === 'confidence'
            ? ['All confidence', 'Incomplete', 'Low', 'Medium', 'High', 'Very High']
            : k === 'freshness'
            ? ['Any freshness', 'Fresh evidence', 'No fresh evidence']
            : ['All time', '24 hours', '7 days', '30 days']
          ).map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      ))}
      <button onClick={() => onChange(defaultFilters)}>Reset</button>
    </div>
  );
}
