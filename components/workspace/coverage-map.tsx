'use client';

import React, {useState} from 'react';
import {ChevronRight, Radio, Shield} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {type Situation, markets} from '@/lib/situations';
import world from '@/public/data/world.json';
import type {Work} from './use-workspace';

const marketPins: Record<string, {x: number; y: number; code: string}> = {
  Ukraine: {x: 416, y: 70, code: 'UA'},
  Kazakhstan: {x: 504, y: 72, code: 'KZ'},
  Uzbekistan: {x: 486, y: 88, code: 'UZ'},
  Pakistan: {x: 494, y: 104, code: 'PK'},
  Bangladesh: {x: 532, y: 114, code: 'BD'},
};

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
          <p>Highest approved active score · country-level telemetry</p>
        </div>
        <label className="switch-label">
          <Switch checked={coverage} onCheckedChange={setCoverage} aria-label="Show coverage gaps" /> Coverage gaps
        </label>
      </div>
      <div className="coverage-layout">
        <div>
          <div className="world-map-wrap">
            <svg
              className="world-map"
              viewBox="0 0 720 300"
              role="img"
              aria-label="Tactical world map highlighting the five monitored markets"
            >
              <defs>
                <radialGradient id="mapGlow" cx="65%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#007FC1" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0" />
                </radialGradient>
                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Ocean clean executive backdrop */}
              <rect width="720" height="300" fill="#F4F7FB" />
              <rect width="720" height="300" fill="url(#mapGlow)" />

              {/* Grid coordinate lines */}
              {[75, 150, 225].map((y) => (
                <line
                  key={`h-${y}`}
                  x1="0"
                  y1={y}
                  x2="720"
                  y2={y}
                  stroke="rgba(0, 0, 0, 0.05)"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
              ))}
              {[180, 360, 540].map((x) => (
                <line
                  key={`v-${x}`}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2="300"
                  stroke="rgba(0, 0, 0, 0.05)"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
              ))}

              {/* Country paths */}
              {world.map((f) => {
                const t = totals.find((t) => t.market === f.name);
                const isMonitored = Boolean(t);
                const isElevated = t && t.score !== null && t.score > 40;

                const fillColor = isMonitored
                  ? isElevated
                    ? '#F59E0B'
                    : '#007FC1'
                  : '#CBD5E1';

                const strokeColor = isMonitored
                  ? isElevated
                    ? '#D97706'
                    : '#005A8C'
                  : '#FFFFFF';

                return (
                  <path
                    key={f.name}
                    d={f.d}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={isMonitored ? '1' : '0.4'}
                    filter={isMonitored ? 'url(#glowFilter)' : undefined}
                    style={{
                      cursor: isMonitored ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                    }}
                    onClick={() => {
                      if (isMonitored) onMarket(f.name);
                    }}
                  >
                    <title>{f.name}{t ? ` · Score: ${t.score ?? 'None'}` : ''}</title>
                  </path>
                );
              })}

              {/* Animated Radar Pulse Beacons for Monitored Markets */}
              {Object.entries(marketPins).map(([mName, pin]) => {
                const t = totals.find((tot) => tot.market === mName);
                const isElevated = t && t.score !== null && t.score > 40;
                const beaconColor = isElevated ? '#F59E0B' : '#007FC1';

                return (
                  <g
                    key={mName}
                    transform={`translate(${pin.x}, ${pin.y})`}
                    style={{cursor: 'pointer'}}
                    onClick={() => onMarket(mName)}
                  >
                    {/* Concentric pulsing radar rings */}
                    <circle
                      className="radar-pulse-ring"
                      cx="0"
                      cy="0"
                      r="4"
                      fill="none"
                      stroke={beaconColor}
                      strokeWidth="1.5"
                    />
                    <circle cx="0" cy="0" r="3.5" fill={beaconColor} />
                    <circle cx="0" cy="0" r="1.5" fill="#FFFFFF" />

                    {/* Country Code Pill Tag */}
                    <rect
                      x="-11"
                      y="-16"
                      width="22"
                      height="11"
                      rx="3"
                      fill="#FFFFFF"
                      stroke={beaconColor}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-8"
                      textAnchor="middle"
                      fill="#0F172A"
                      fontSize="7"
                      fontFamily="Montserrat, sans-serif"
                      fontWeight="700"
                    >
                      {pin.code}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <small className="map-note">
            Geospatial context · highlighted nodes indicate live active surveillance perimeters.
          </small>
        </div>

        <div className="coverage-markets">
          {totals.map((t) => (
            <button key={t.market} onClick={() => onMarket(t.market)}>
              <span className={`country-dot ${marketPins[t.market]?.code || 'GL'}`}>
                {marketPins[t.market]?.code || 'GL'}
              </span>
              <span>
                <strong>{t.market}</strong>
                <small>
                  {t.count} active approved cases{coverage ? ' · telemetry live' : ''}
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

