'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Flame,
  Percent,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Layers,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { FredReport, FredSeriesData } from '@/lib/horizon/fred';

export function FredSignals() {
  const [data, setData] = useState<FredReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSeriesId, setActiveSeriesId] = useState<string>('DGS10');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/macro/fred');
      const json = (await res.json()) as any;
      if (json && json.ok && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching FRED data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const seriesList = data?.series || [];
  const filteredSeries = seriesList.filter(
    (s) => categoryFilter === 'All' || s.category === categoryFilter
  );

  const activeSeries = seriesList.find((s) => s.seriesId === activeSeriesId) || seriesList[0];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Sovereign Yields':
        return <Percent size={14} className="text-sky-600" />;
      case 'Commodities & Energy':
        return <Flame size={14} className="text-amber-600" />;
      case 'FX & Liquidity':
        return <DollarSign size={14} className="text-emerald-600" />;
      default:
        return <Activity size={14} className="text-indigo-600" />;
    }
  };

  return (
    <div className="fred-container">
      {/* Header Bar */}
      <div className="fred-header-bar">
        <div className="fred-title-wrap">
          <div className="fred-icon-circle">
            <BarChart3 size={18} className="text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="fred-title">FEDERAL RESERVE ECONOMIC DATA (FRED) // GLOBAL LIQUIDITY</h3>
              <span className="fred-official-tag">ST. LOUIS FED LIVE</span>
            </div>
            <p className="fred-subtitle">
              Benchmark US sovereign yields, global crude benchmarks, dollar index liquidity & credit spread stress monitors.
            </p>
          </div>
        </div>

        <div className="fred-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="fred-refresh-btn"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin mr-1.5' : 'mr-1.5'} />
            <span>Refresh</span>
          </Button>
          <a
            href="https://fred.stlouisfed.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="fred-source-link"
          >
            <ExternalLink size={12} className="mr-1" />
            <span>FRED Portal</span>
          </a>
        </div>
      </div>

      {loading && !data ? (
        <div className="fred-loading-state">
          <RefreshCw size={24} className="animate-spin text-emerald-500 mb-2" />
          <p>Ingesting Federal Reserve Economic Data (FRED) observations...</p>
        </div>
      ) : (
        <>
          {/* Executive KPI Grid */}
          <div className="fred-kpi-grid">
            <div className="fred-kpi-card">
              <div className="kpi-top">
                <span className="kpi-lbl">US 10Y TREASURY YIELD</span>
                <Percent size={14} className="text-sky-500" />
              </div>
              <div className="kpi-val-row">
                <span className="kpi-val text-slate-900">
                  {data?.summary.tenYearYield !== null && data?.summary.tenYearYield !== undefined
                    ? `${data.summary.tenYearYield}%`
                    : 'N/A'}
                </span>
                <span className="kpi-pill-badge bg-sky-50 text-sky-800">DGS10</span>
              </div>
              <span className="kpi-desc">Global sovereign hurdle & risk-free benchmark</span>
            </div>

            <div className="fred-kpi-card">
              <div className="kpi-top">
                <span className="kpi-lbl">BRENT CRUDE SPOT</span>
                <Flame size={14} className="text-amber-500" />
              </div>
              <div className="kpi-val-row">
                <span className="kpi-val text-amber-700">
                  {data?.summary.brentCrude !== null && data?.summary.brentCrude !== undefined
                    ? `$${data.summary.brentCrude}`
                    : 'N/A'}
                </span>
                <span className="kpi-pill-badge bg-amber-50 text-amber-800">USD / Bbl</span>
              </div>
              <span className="kpi-desc">Direct driver of cell tower diesel generator opex</span>
            </div>

            <div className="fred-kpi-card">
              <div className="kpi-top">
                <span className="kpi-lbl">TRADE WEIGHTED US DOLLAR</span>
                <DollarSign size={14} className="text-emerald-500" />
              </div>
              <div className="kpi-val-row">
                <span className="kpi-val text-emerald-700">
                  {data?.summary.dollarIndex !== null && data?.summary.dollarIndex !== undefined
                    ? `${data.summary.dollarIndex}`
                    : 'N/A'}
                </span>
                <span className="kpi-pill-badge bg-emerald-50 text-emerald-800">DTWEXBGS</span>
              </div>
              <span className="kpi-desc">Broad dollar strength vs emerging market currencies</span>
            </div>

            <div className="fred-kpi-card">
              <div className="kpi-top">
                <span className="kpi-lbl">YIELD CURVE (10Y - 2Y)</span>
                <Activity size={14} className="text-purple-500" />
              </div>
              <div className="kpi-val-row">
                <span
                  className={`kpi-val ${
                    data?.summary.yieldCurveSpread !== null && (data?.summary.yieldCurveSpread ?? 0) < 0
                      ? 'text-rose-600'
                      : 'text-slate-900'
                  }`}
                >
                  {data?.summary.yieldCurveSpread !== null && data?.summary.yieldCurveSpread !== undefined
                    ? `${data.summary.yieldCurveSpread > 0 ? '+' : ''}${data.summary.yieldCurveSpread}%`
                    : 'N/A'}
                </span>
                <span
                  className={`kpi-pill-badge ${
                    (data?.summary.yieldCurveSpread ?? 0) < 0 ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {(data?.summary.yieldCurveSpread ?? 0) < 0 ? 'INVERTED' : 'NORMAL'}
                </span>
              </div>
              <span className="kpi-desc">Key leading recession & capital flight indicator</span>
            </div>
          </div>

          {/* Interactive Chart Section */}
          {activeSeries && (
            <div className="fred-chart-section">
              <div className="fred-chart-header">
                <div>
                  <span className="chart-cat">{activeSeries.category}</span>
                  <h4 className="chart-title">
                    {activeSeries.name} ({activeSeries.unit})
                  </h4>
                  <p className="chart-desc">{activeSeries.macroSignificance}</p>
                </div>
                <div className="chart-latest-box">
                  <span className="lbl">LATEST OBSERVATION ({activeSeries.latestDate})</span>
                  <span className="val">
                    {activeSeries.latestValue} <small>{activeSeries.unit}</small>
                  </span>
                  <span className={`trend-delta ${activeSeries.delta >= 0 ? 'pos' : 'neg'}`}>
                    {activeSeries.delta >= 0 ? '▲' : '▼'} {Math.abs(activeSeries.delta)} ({activeSeries.deltaPct}%)
                  </span>
                </div>
              </div>

              <div className="fred-chart-body">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={activeSeries.observations} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(val: any) => [`${val} ${activeSeries.unit}`, activeSeries.shortName]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ background: '#0F172A', color: '#FFFFFF', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#10B981' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* All FRED Series Explorer */}
          <div className="fred-series-panel">
            <div className="fred-filter-strip">
              <span className="filter-title">Filter Benchmark Series:</span>
              <div className="fred-cat-filter-btns">
                {['All', 'Sovereign Yields', 'Commodities & Energy', 'FX & Liquidity', 'Monetary Policy', 'Credit Risk'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-btn ${categoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="fred-cards-grid">
              {filteredSeries.map((s) => {
                const isSelected = activeSeriesId === s.seriesId;

                return (
                  <div
                    key={s.seriesId}
                    className={`fred-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setActiveSeriesId(s.seriesId)}
                  >
                    <div className="fred-card-top">
                      <div className="flex items-center gap-1.5">
                        {getCategoryIcon(s.category)}
                        <span className="fred-cat">{s.category}</span>
                      </div>
                      <span className={`fred-status-tag status-${s.status.toLowerCase()}`}>
                        {s.status}
                      </span>
                    </div>

                    <h5 className="fred-name">{s.name}</h5>

                    <div className="fred-val-row">
                      <span className="fred-val">
                        {s.latestValue} <small className="fred-unit">{s.unit}</small>
                      </span>
                      <span className={`fred-delta ${s.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {s.delta >= 0 ? '+' : ''}{s.delta}
                      </span>
                    </div>

                    <p className="fred-significance">{s.macroSignificance}</p>

                    <div className="fred-footer">
                      <span className="view-chart-hint">
                        {isSelected ? '● Currently Charting' : 'Click to view time series'}
                      </span>
                      <a
                        href={`https://fred.stlouisfed.org/series/${s.seriesId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fred-link"
                        onClick={(e) => e.stopPropagation()}
                        title="View on Federal Reserve Economic Data (FRED) Official Website"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
