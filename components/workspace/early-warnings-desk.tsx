'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Radio,
  Clock,
  RefreshCw,
  Compass,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Layers,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Shield,
  Zap,
  Activity,
  Fuel,
  Network,
  Plane,
  Coins,
  Download,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Work } from './use-workspace';
import type { Situation } from '@/lib/situations';

export interface EarlyWarningAlert {
  id: string;
  market: 'Pakistan' | 'Ukraine' | 'Kazakhstan' | 'Uzbekistan' | 'Bangladesh' | 'Global';
  riskVector: 'Armed Conflict & Transit' | 'Energy & Grid Continuity' | 'Airspace & Aviation' | 'Macroeconomic & FX' | 'Telecom & Cyber';
  leadTimeHours: string; // e.g. "12 - 24h", "24 - 48h"
  severity: 'CRITICAL' | 'WARNING' | 'ELEVATED';
  escalationProbability: number; // 0 - 100
  title: string;
  triggerEvent: string;
  recommendedAction: string;
  metricLabel: string;
  metricCurrent: string;
  metricThreshold: string;
  sourceLinage: string;
  sourceUrl?: string;
  timestamp: string;
}

export function EarlyWarningsDesk({
  w,
  market = 'Pakistan',
  situations = [],
}: {
  w: Work;
  market?: string;
  situations?: Situation[];
}) {
  const [selectedMarket, setSelectedMarket] = useState<string>(
    market && market !== 'All markets' ? market : 'Pakistan'
  );
  const [vectorFilter, setVectorFilter] = useState<string>('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>(new Date().toUTCString());

  useEffect(() => {
    if (market && market !== 'All markets') {
      setSelectedMarket(market);
    }
  }, [market]);

  // Standing Early Warning Alerts across surveillance scope
  const allAlerts: EarlyWarningAlert[] = useMemo(() => [
    {
      id: 'EW-PK-01',
      market: 'Pakistan',
      riskVector: 'Armed Conflict & Transit',
      leadTimeHours: '12 - 24 Hours',
      severity: 'WARNING',
      escalationProbability: 78,
      title: 'Western Frontier Border Transit Corridors & Checkpoint Bottlenecks',
      triggerEvent: 'Heightened troop mobilization and checkpoint vetting at Torkham & Chaman crossing gates, slowing overland supply convoys.',
      recommendedAction: 'Reroute critical logistics through southern hubs; verify microwave backbone line-of-sight relays across Khyber border sector.',
      metricLabel: 'Transit Delays',
      metricCurrent: '44 hrs',
      metricThreshold: '≥ 24 hrs',
      sourceLinage: 'UN OCHA ReliefWeb / Dawn News Wire',
      sourceUrl: 'https://reliefweb.int/report/pakistan/unhcr-iom-pakistan-flash-update-flow-monitoring',
      timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'EW-PK-02',
      market: 'Pakistan',
      riskVector: 'Energy & Grid Continuity',
      leadTimeHours: '24 - 48 Hours',
      severity: 'ELEVATED',
      escalationProbability: 64,
      title: 'Thermal Fuel Reserve Margin & Regional Feeder Load Shedding',
      triggerEvent: 'Seasonal liquefied natural gas supply quotas tightening peak generation reserves across central transmission corridors.',
      recommendedAction: 'Pre-charge site battery banks to 100% and top off 14-day diesel generator reserves at tier-1 switching centers.',
      metricLabel: 'Reserve Autonomy',
      metricCurrent: '6.2 days',
      metricThreshold: '< 7.0 days',
      sourceLinage: 'National Transmission & Dispatch Co / Reuters Energy',
      sourceUrl: 'https://tribune.com.pk/story/macroeconomic-reform-telecom-spectrum-auctions-2026.html',
      timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      id: 'EW-UA-01',
      market: 'Ukraine',
      riskVector: 'Energy & Grid Continuity',
      leadTimeHours: '6 - 18 Hours',
      severity: 'CRITICAL',
      escalationProbability: 92,
      title: 'Power Grid High-Voltage Transmission Substation Targeting',
      triggerEvent: 'Reconnaissance drone flights detected near 750kV switchyards along western and northern distribution corridors.',
      recommendedAction: 'Isolate redundant optical transceivers; trigger autonomous dual-battery modular backups across Lviv and Rivne nodes.',
      metricLabel: 'Grid Stability Jitter',
      metricCurrent: '48.9 Hz',
      metricThreshold: '< 49.5 Hz',
      sourceLinage: 'Interfax-Ukraine Defense / UN OCHA ReliefWeb',
      sourceUrl: 'https://reliefweb.int/report/ukraine/humanitarian-impact-energy-strikes-ukraine',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'EW-UA-02',
      market: 'Ukraine',
      riskVector: 'Airspace & Aviation',
      leadTimeHours: 'Standing 24/7',
      severity: 'CRITICAL',
      escalationProbability: 98,
      title: 'Total Civil Airspace Exclusion & NOTAM Exclusion Envelope',
      triggerEvent: 'EASA and Ukrainian Aviation Administration extend zero-ceiling exclusion zone across UKBV, UKLV, UKOV, UKDV, UKFV.',
      recommendedAction: 'Maintain exclusive ground transit via Rzeszow-Jasionka and Chisinau multimodal transit hubs.',
      metricLabel: 'Airspace Closure',
      metricCurrent: '100% Closure',
      metricThreshold: '> 0% NOTAM',
      sourceLinage: 'EASA Conflict Zone Information Bulletin / ICAO',
      sourceUrl: 'https://ukrinform.net/rubric-defense/airspace-corridor-security-brief-2026.html',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'EW-KZ-01',
      market: 'Kazakhstan',
      riskVector: 'Macroeconomic & FX',
      leadTimeHours: '36 - 72 Hours',
      severity: 'ELEVATED',
      escalationProbability: 58,
      title: 'Trans-Caspian Container Routing & Secondary Sanction Scrutiny',
      triggerEvent: 'Accelerated transit volumes through Aktau Port create clearance bottlenecks with international cargo compliance manifests.',
      recommendedAction: 'Accelerate digital customs pre-clearance with Baku Port authority to maintain Middle Corridor throughput velocity.',
      metricLabel: 'Dwell Time',
      metricCurrent: '3.8 days',
      metricThreshold: '≥ 3.0 days',
      sourceLinage: 'The Astana Times / TITR Secretariat',
      sourceUrl: 'https://astanatimes.com/2026/09/trans-caspian-middle-corridor-throughput-expansion/',
      timestamp: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
    {
      id: 'EW-UZ-01',
      market: 'Uzbekistan',
      riskVector: 'Telecom & Cyber',
      leadTimeHours: '48 - 96 Hours',
      severity: 'ELEVATED',
      escalationProbability: 52,
      title: 'Data Localization Regulatory Audit & Gateway Compliance',
      triggerEvent: 'Ministry of Digital Technologies scheduling inspection of cross-border financial data transit hubs in Tashkent.',
      recommendedAction: 'Audit localized biometric and payment log storage within Tashkent Tier-III data centers.',
      metricLabel: 'Domestic Retention',
      metricCurrent: '99.4%',
      metricThreshold: '< 99.0%',
      sourceLinage: 'Gazeta.uz / Ministry of Digital Technologies',
      sourceUrl: 'https://gazeta.uz/en/2026/09/digital-uzbekistan-cloud-sovereignty-mandate/',
      timestamp: new Date(Date.now() - 3600000 * 16).toISOString(),
    },
    {
      id: 'EW-BD-01',
      market: 'Bangladesh',
      riskVector: 'Telecom & Cyber',
      leadTimeHours: '12 - 36 Hours',
      severity: 'WARNING',
      escalationProbability: 74,
      title: 'Subsea Cable Landing Station Physical Perimeter Security',
      triggerEvent: 'Civil administrative reorganization prompts enhanced surveillance protocols at Cox\'s Bazar and Kuakata cable stations.',
      recommendedAction: 'Engage designated military guard patrols; verify automatic optical bypass to terrestrial terrestrial backhauls.',
      metricLabel: 'Perimeter Alert',
      metricCurrent: 'Level 2',
      metricThreshold: '≥ Level 2',
      sourceLinage: 'The Daily Star / BTRC Directive',
      sourceUrl: 'https://thedailystar.net/business/economy/telecom-continuity-digital-bangladesh-2026.html',
      timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: 'EW-GL-01',
      market: 'Global',
      riskVector: 'Airspace & Aviation',
      leadTimeHours: '6 - 24 Hours',
      severity: 'CRITICAL',
      escalationProbability: 86,
      title: 'Middle East Long-Haul Transit Corridors Detours & Fuel Surcharges',
      triggerEvent: 'Southern Persian Gulf airspace congestion forcing carriers to divert via Riyadh FIR and Dubai (OMAE).',
      recommendedAction: 'Budget 40-50 min detour buffer on Eurasian corporate air logistics; secure pre-allocated fueling contracts.',
      metricLabel: 'Flight Time Deviation',
      metricCurrent: '+42 min',
      metricThreshold: '≥ +30 min',
      sourceLinage: 'Reuters Aerospace / FlightRadar24',
      sourceUrl: 'https://reuters.com/business/aerospace-defense/middle-east-air-corridor-diversions-fuel-costs-2026.html',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ], []);

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((a) => {
      if (selectedMarket !== 'All markets' && a.market !== selectedMarket && a.market !== 'Global') {
        return false;
      }
      if (vectorFilter !== 'All' && a.riskVector !== vectorFilter) {
        return false;
      }
      if (severityFilter !== 'All' && a.severity !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [allAlerts, selectedMarket, vectorFilter, severityFilter]);

  // Aggregate Metrics
  const criticalCount = filteredAlerts.filter((a) => a.severity === 'CRITICAL').length;
  const warningCount = filteredAlerts.filter((a) => a.severity === 'WARNING').length;
  const elevatedCount = filteredAlerts.filter((a) => a.severity === 'ELEVATED').length;
  const avgEscalationProb = filteredAlerts.length > 0
    ? Math.round(filteredAlerts.reduce((sum, a) => sum + a.escalationProbability, 0) / filteredAlerts.length)
    : 0;

  function refresh() {
    setLoading(true);
    setTimeout(() => {
      setLastRefreshed(new Date().toUTCString());
      setLoading(false);
    }, 500);
  }

  function exportBulletin() {
    const data = {
      title: 'HORIZON 1440 - Early Warning Risk Bulletin',
      market: selectedMarket,
      generatedAt: new Date().toISOString(),
      summary: {
        totalAlerts: filteredAlerts.length,
        critical: criticalCount,
        warning: warningCount,
        averageEscalationProbability: `${avgEscalationProb}%`,
      },
      earlyWarnings: filteredAlerts,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `EarlyWarnings-${selectedMarket}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-7">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                EARLY WARNINGS // PROACTIVE RISK RADAR
              </h2>
              <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                PRE-CRISIS SURVEILLANCE
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Proactive threshold breaches, predictive escalation indicators, and lead-time horizon alerts across {selectedMarket}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold h-9 px-3.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportBulletin}
            className="flex items-center gap-1.5 text-xs font-semibold h-9 px-3.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <Download size={13} />
            <span>Export Bulletin</span>
          </Button>
        </div>
      </div>

      {/* 2. Market Scope Pills */}
      <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
          <Compass size={14} className="text-sky-600" />
          <span>Scope:</span>
        </div>
        {['All markets', 'Pakistan', 'Ukraine', 'Kazakhstan', 'Uzbekistan', 'Bangladesh'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSelectedMarket(m)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              selectedMarket === m
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 3. Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical Triggers</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{criticalCount}</div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">Immediate containment required</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <Zap size={22} />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Warning Watches</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{warningCount}</div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">Escalation window 12 - 48h</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Elevated Signals</div>
            <div className="text-2xl font-black text-sky-600 mt-1">{elevatedCount}</div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">Trend monitoring active</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Activity size={22} />
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Escalation Risk</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{avgEscalationProb}%</div>
            <div className="text-[11.5px] text-slate-500 mt-0.5">Weighted cross-vector threat</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">Filter By:</span>

          <select
            value={vectorFilter}
            onChange={(e) => setVectorFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 font-medium text-slate-700"
          >
            <option value="All">All Risk Vectors</option>
            <option value="Armed Conflict & Transit">Armed Conflict & Transit</option>
            <option value="Energy & Grid Continuity">Energy & Grid Continuity</option>
            <option value="Airspace & Aviation">Airspace & Aviation</option>
            <option value="Macroeconomic & FX">Macroeconomic & FX</option>
            <option value="Telecom & Cyber">Telecom & Cyber</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 font-medium text-slate-700"
          >
            <option value="All">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
            <option value="ELEVATED">Elevated</option>
          </select>
        </div>

        <div className="text-xs font-mono text-slate-500">
          SURVEILLANCE PULSE: {lastRefreshed}
        </div>
      </div>

      {/* 5. Early Warning Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredAlerts.length === 0 ? (
          <div className="lg:col-span-2 p-14 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-xs">
            <CheckCircle2 size={38} className="mx-auto mb-3 text-emerald-500" />
            <p className="font-bold text-base text-slate-900">No early warnings matching the selected filter criteria.</p>
            <p className="text-xs text-slate-500 mt-1">All monitored vectors within tolerance margins.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCrit = alert.severity === 'CRITICAL';
            const isWarn = alert.severity === 'WARNING';

            return (
              <div
                key={alert.id}
                className={`p-6 rounded-2xl border transition-all bg-white shadow-xs ${
                  isCrit
                    ? 'border-slate-200 border-l-4 border-l-rose-500 hover:border-slate-300'
                    : isWarn
                    ? 'border-slate-200 border-l-4 border-l-amber-500 hover:border-slate-300'
                    : 'border-slate-200 border-l-4 border-l-sky-500 hover:border-slate-300'
                }`}
              >
                {/* Top strip */}
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-900 text-white">
                      {alert.market}
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {alert.riskVector}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md ${
                        isCrit
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : isWarn
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                    <Clock size={13} className="text-slate-400" />
                    <span>Lead: {alert.leadTimeHours}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                  {alert.title}
                </h3>

                {/* Trigger Context */}
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {alert.triggerEvent}
                </p>

                {/* Metric & Escalation Gauge */}
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 mb-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {alert.metricLabel} Breach
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-base font-black text-rose-600">{alert.metricCurrent}</span>
                      <span className="text-[11px] text-slate-500 font-mono">threshold {alert.metricThreshold}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Escalation Probability
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            alert.escalationProbability >= 80
                              ? 'bg-rose-600'
                              : alert.escalationProbability >= 65
                              ? 'bg-amber-500'
                              : 'bg-sky-500'
                          }`}
                          style={{ width: `${alert.escalationProbability}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-900">
                        {alert.escalationProbability}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prescriptive Recommended Action */}
                <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-100 mb-4">
                  <div className="text-[10.5px] font-bold text-sky-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Shield size={12} className="text-sky-600" />
                    <span>Pre-Crisis Operational Directive</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 leading-normal">
                    {alert.recommendedAction}
                  </p>
                </div>

                {/* Footer with Source Lineage */}
                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Radio size={12} className="text-slate-400" />
                    <span>Source: {alert.sourceLinage}</span>
                  </div>

                  {alert.sourceUrl && (
                    <a
                      href={alert.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-semibold"
                    >
                      <span>Verified Dispatch</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
