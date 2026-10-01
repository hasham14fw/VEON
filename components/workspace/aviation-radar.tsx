'use client';

import React, {useState, useEffect} from 'react';
import {
  Plane,
  AlertTriangle,
  ShieldAlert,
  Compass,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Info,
  Clock,
  MapPin,
  CheckCircle2,
  Shield,
  Layers,
  ChevronRight,
  Radio,
  ArrowRight,
  Database,
  Globe,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import type {
  NoFlyZone,
  FlightDeviation,
  AviationIntelligenceReport,
} from '@/lib/horizon/aviation';
import {ACTIVE_NO_FLY_ZONES, BENCHMARK_DEVIATIONS, MARKET_AIRSPACE_STATUS} from '@/lib/horizon/aviation';
import type {Work} from './use-workspace';
import {WorkspaceStatus} from './workspace-status';

export function AviationRadar({w, market, onOpenMaps}: {w: Work; market: string; onOpenMaps?: () => void}) {
  const [report, setReport] = useState<AviationIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<NoFlyZone | null>(null);
  const [selectedDeviation, setSelectedDeviation] = useState<FlightDeviation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedMarketTab, setSelectedMarketTab] = useState<string>(market || 'All markets');

  // Sync selectedMarketTab if external market prop changes
  useEffect(() => {
    if (market && market !== selectedMarketTab) {
      setSelectedMarketTab(market);
    }
  }, [market]);

  // Fetch live aviation report from our API route
  const fetchAviationData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/aviation?market=${encodeURIComponent(selectedMarketTab)}`);
      if (res.ok) {
        const json = (await res.json()) as {ok: boolean; data?: AviationIntelligenceReport};
        if (json.ok && json.data) {
          setReport(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load aviation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAviationData();
  }, [selectedMarketTab]);

  // Sync live aviation alerts to workspace audit ledger
  const syncToLedger = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/aviation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Actor': 'Tactical Aviation Radar',
        },
        body: JSON.stringify({
          market: selectedMarketTab,
          action: 'sync_aviation_feed',
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {ok: boolean; message?: string};
        setSyncMsg(json.message || 'Aviation intelligence synchronized successfully.');
        setTimeout(() => setSyncMsg(null), 5000);
      }
    } catch (err) {
      setSyncMsg('Failed to sync aviation telemetry to ledger.');
    } finally {
      setSyncing(false);
    }
  };

  // Fallbacks if report is loading
  const zones: NoFlyZone[] = report?.noFlyZones || ACTIVE_NO_FLY_ZONES;
  const deviations: FlightDeviation[] = report?.flightDeviations || BENCHMARK_DEVIATIONS;
  const summary = report?.summary || {
    activeNoFlyZones: zones.length,
    totalDeviationsLogged: deviations.length,
    avgDetourMinutes: 68,
    airspaceRiskIndex: 82,
    lastUpdated: new Date().toISOString(),
    source: 'Aviationstack API (Live)',
  };

  // Filtered zones
  const filteredZones = zones.filter((z) => {
    const matchesSearch =
      z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.firCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.notamReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.market.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' || z.status.toLowerCase().includes(statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  // Filtered deviations
  const filteredDeviations = deviations.filter((d) => {
    const matchesSearch =
      d.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.airline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.affectedAirspace.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Live Feed Status Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
              <Plane className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Airspace Integrity & Tactical No-Fly Radar
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Aviationstack Feed
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Monitoring conflict zone airspace closures, tactical bypass corridors, and commercial flight diversions across VEON operations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenMaps && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenMaps}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border-amber-600 shadow-sm"
              >
                <Globe className="w-4 h-4 mr-1.5" />
                3D Globe & Maps
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAviationData}
              disabled={loading}
              className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={syncToLedger}
              disabled={syncing}
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm"
            >
              <Database className="w-4 h-4 mr-1.5 text-amber-400" />
              {syncing ? 'Syncing...' : 'Sync Evidence'}
            </Button>
          </div>
        </div>

        {syncMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncMsg}</span>
          </div>
        )}

        {/* Global Market Switcher Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Airspace Scope:</span>
          {['All markets', 'Ukraine', 'Pakistan', 'Uzbekistan', 'Kazakhstan', 'Bangladesh', 'Global'].map(
            (m) => (
              <button
                key={m}
                onClick={() => setSelectedMarketTab(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedMarketTab === m
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                {m}
              </button>
            )
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active No Fly Zones */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active No-Fly Zones</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {summary.activeNoFlyZones}
            </span>
            <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              High Risk
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            1 Total Closure (Ukraine) · 5 Restricted Corridors
          </p>
        </div>

        {/* Card 2: Live Deviations */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Flight Deviations</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {summary.totalDeviationsLogged}
            </span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Live Feed
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Diverted routes bypassing active conflict zones
          </p>
        </div>

        {/* Card 3: Avg Detour Overhead */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Avg Detour Overhead</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              +{summary.avgDetourMinutes}
            </span>
            <span className="text-sm font-semibold text-slate-600">min/flight</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Max +145m detour on Eurasian transit bypass
          </p>
        </div>

        {/* Card 4: Airspace Risk Index */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Airspace Risk Index</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {summary.airspaceRiskIndex}/100
            </span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              Elevated
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Source: {summary.source}
          </p>
        </div>
      </div>

      {/* Market Airspace Matrix Quick Status Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-slate-700" />
          VEON Market Sovereign Airspace Assessment
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(MARKET_AIRSPACE_STATUS).map(([mName, mStatus]) => {
            const isClosed = mStatus.status === 'Closed';
            const isRestricted = mStatus.status === 'Restricted';
            const isMonitored = mStatus.status === 'Monitored';
            return (
              <div
                key={mName}
                onClick={() => setSelectedMarketTab(mName)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:border-slate-400 ${
                  selectedMarketTab === mName
                    ? 'border-slate-900 bg-slate-50/80 shadow-sm'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-900">{mName}</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isClosed
                        ? 'bg-rose-100 text-rose-800'
                        : isRestricted
                        ? 'bg-amber-100 text-amber-800'
                        : isMonitored
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {mStatus.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 line-clamp-1">
                  {mStatus.primaryNotam}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                  <span>Diversion Impact</span>
                  <span className="font-bold text-slate-900">+{mStatus.diversionBurdenPct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Layout: Active No-Fly Zones + Live Deviations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active No-Fly Zones (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Active No-Fly Zones & Conflict Airspace
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official ICAO / EASA / FAA NOTAM airspace prohibitions and buffer perimeters
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search FIR / NOTAM..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 pr-3 text-xs w-44 bg-slate-50 border-slate-200 text-slate-800"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Closure">Closures</option>
                  <option value="Restricted">Restricted</option>
                  <option value="Buffer">Buffers</option>
                  <option value="Advisory">Advisories</option>
                </select>
              </div>
            </div>

            {/* List of No-Fly Zone Cards */}
            <div className="mt-4 space-y-3">
              {filteredZones.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No restricted airspace matching your query.
                </div>
              ) : (
                filteredZones.map((zone) => {
                  const isClosed = zone.status === 'Total Airspace Closure';
                  const isWarning = zone.severity === 'Warning';
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      className="group p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                              {zone.firCode}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                isClosed
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isWarning
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {zone.status}
                            </span>
                            <span className="text-xs text-slate-600 font-medium">
                              Market: <strong>{zone.market}</strong>
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {zone.name}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            {zone.rationale}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-900">
                            Risk {zone.riskFactor}/100
                          </div>
                          <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                            +{zone.detourImpactMinutes}m bypass
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono">NOTAM: {zone.notamReference}</span>
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          Altitude: {zone.altitude}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Flight Deviations & Circumventions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-500" />
                  Live Flight Deviations
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Commercial flights rerouted around high-threat air corridors
                </p>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Live Feed
              </div>
            </div>

            {/* Deviations List */}
            <div className="mt-4 space-y-3">
              {filteredDeviations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No flight deviations currently logged.
                </div>
              ) : (
                filteredDeviations.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => setSelectedDeviation(dev)}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {dev.flightNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {dev.airline}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        +{dev.detourMinutes} min
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <span>{dev.originIata}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dev.destinationIata}</span>
                      <span className="text-slate-400 font-normal">({dev.origin} → {dev.destination})</span>
                    </div>

                    <div className="mt-2 text-xs text-slate-600 line-clamp-1">
                      <span className="font-medium text-slate-800">Avoidance:</span> {dev.affectedAirspace}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-medium">
                        {dev.deviationType}
                      </span>
                      <span>{new Date(dev.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* No-Fly Zone Detailed Inspection Modal */}
      <Dialog open={!!selectedZone} onOpenChange={(open) => !open && setSelectedZone(null)}>
        <DialogContent className="max-w-xl bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl p-6">
          {selectedZone && (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800 mr-2">
                    {selectedZone.firCode}
                  </span>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    {selectedZone.status}
                  </span>
                  <DialogTitle className="text-lg font-bold text-slate-900 mt-2">
                    {selectedZone.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Airspace Assessment & NOTAM Documentation
                  </DialogDescription>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Geopolitical Rationale & Threat Matrix
                  </div>
                  <p className="text-slate-800 leading-relaxed text-xs">
                    {selectedZone.rationale}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 block font-medium">NOTAM Reference</span>
                    <span className="font-mono font-bold text-slate-900 mt-1 block">
                      {selectedZone.notamReference}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 block font-medium">Altitude Envelope</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {selectedZone.altitude}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 block font-medium">Coordinates / Envelope</span>
                    <span className="font-mono text-slate-900 mt-1 block">
                      {selectedZone.coordinates}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 block font-medium">Reroute Delay Impact</span>
                    <span className="font-bold text-rose-600 mt-1 block">
                      +{selectedZone.detourImpactMinutes} minutes average
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    VEON Executive Advisory
                  </div>
                  <p>
                    All corporate personnel transit and critical equipment air freight must utilize certified southerly or Trans-Caucasus corridors. Do not book routing through {selectedZone.firCode}.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setSelectedZone(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium"
                >
                  Close Advisory
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Flight Deviation Detailed Inspection Modal */}
      <Dialog open={!!selectedDeviation} onOpenChange={(open) => !open && setSelectedDeviation(null)}>
        <DialogContent className="max-w-lg bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl p-6">
          {selectedDeviation && (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-extrabold text-slate-900">
                      {selectedDeviation.flightNumber}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedDeviation.airline}
                    </span>
                  </div>
                  <DialogTitle className="text-base font-bold text-slate-900 mt-1">
                    {selectedDeviation.originIata} ({selectedDeviation.origin}) → {selectedDeviation.destinationIata} ({selectedDeviation.destination})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Live Flight Deviation & Conflict Airspace Avoidance
                  </DialogDescription>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-600 uppercase tracking-wider block">
                    Deviation Rationale
                  </span>
                  <p className="text-slate-800 leading-relaxed">
                    {selectedDeviation.geopoliticalReason}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 font-medium">Avoided Airspace</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {selectedDeviation.affectedAirspace}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 font-medium">Detour Delay Penalty</span>
                    <span className="font-bold text-rose-600 mt-1 block">
                      +{selectedDeviation.detourMinutes} minutes
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 font-medium">Deviation Category</span>
                    <span className="font-bold text-slate-900 mt-1 block">
                      {selectedDeviation.deviationType}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="text-slate-500 font-medium">Telemetry Timestamp</span>
                    <span className="font-mono text-slate-700 mt-1 block">
                      {new Date(selectedDeviation.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setSelectedDeviation(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-medium"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
