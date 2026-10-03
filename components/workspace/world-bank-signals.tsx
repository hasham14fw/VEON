'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Globe2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Smartphone,
  Landmark,
  Coins,
  Scale,
  Activity,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { WorldBankCountryData, WorldBankIndicator } from '@/lib/horizon/worldbank';
import { COUNTRY_MAPPINGS } from '@/lib/horizon/worldbank';

interface WorldBankSignalsProps {
  initialMarket?: string;
}

export function WorldBankSignals({ initialMarket = 'Pakistan' }: WorldBankSignalsProps) {
  const [selectedMarket, setSelectedMarket] = useState<string>(
    initialMarket && initialMarket !== 'All markets' ? initialMarket : 'Pakistan'
  );
  const [data, setData] = useState<WorldBankCountryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [activeChartIndicator, setActiveChartIndicator] = useState<string>('NY.GDP.MKTP.KD.ZG');

  const fetchData = useCallback(async (market: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/macro/worldbank?country=${encodeURIComponent(market)}`);
      const json = (await res.json()) as any;
      if (json && json.ok && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching World Bank data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(selectedMarket);
  }, [fetchData, selectedMarket]);

  const indicators = data?.indicators || [];
  const filteredIndicators = indicators.filter(
    (i) => categoryFilter === 'All' || i.category === categoryFilter
  );

  const selectedChartData = indicators.find((i) => i.code === activeChartIndicator) || indicators[0];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Telecom & Digital':
        return <Smartphone size={14} className="text-sky-600" />;
      case 'Inflation & Monetary':
        return <Coins size={14} className="text-amber-600" />;
      case 'Trade & Debt':
        return <Scale size={14} className="text-rose-600" />;
      default:
        return <Landmark size={14} className="text-emerald-600" />;
    }
  };

  return (
    <div className="wb-container">
      {/* Header & Country Selector */}
      <div className="wb-header-bar">
        <div className="wb-title-wrap">
          <div className="wb-icon-circle">
            <Globe2 size={18} className="text-sky-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="wb-title">WORLD BANK OPEN DATA // FRONTIER MACRO TELEMETRY</h3>
              <span className="wb-official-tag">OFFICIAL WDI FEED</span>
            </div>
            <p className="wb-subtitle">
              Sovereign development metrics, telecommunications penetration, inflation & external debt exposure across VEON markets.
            </p>
          </div>
        </div>

        <div className="wb-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(selectedMarket)}
            disabled={loading}
            className="wb-refresh-btn"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin mr-1.5' : 'mr-1.5'} />
            <span>Refresh</span>
          </Button>
          <a
            href="https://data.worldbank.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="wb-source-link"
          >
            <ExternalLink size={12} className="mr-1" />
            <span>World Bank Portal</span>
          </a>
        </div>
      </div>

      {/* Country Scope Navigation */}
      <div className="wb-country-nav">
        <span className="country-nav-label">Select Sovereign Economy:</span>
        <div className="wb-country-pills">
          {Object.keys(COUNTRY_MAPPINGS)
            .filter((m) => m !== 'All markets')
            .map((m) => (
              <button
                key={m}
                type="button"
                className={`wb-country-btn ${selectedMarket === m ? 'active' : ''}`}
                onClick={() => setSelectedMarket(m)}
              >
                <span>{m}</span>
                <span className="wb-code">{COUNTRY_MAPPINGS[m]?.iso3}</span>
              </button>
            ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="wb-loading-state">
          <RefreshCw size={24} className="animate-spin text-sky-500 mb-2" />
          <p>Ingesting World Bank Open Data for {selectedMarket}...</p>
        </div>
      ) : (
        <>
          {/* Executive KPI Summary Cards */}
          <div className="wb-kpi-grid">
            <div className="wb-kpi-card">
              <div className="kpi-top">
                <span className="kpi-lbl">REAL GDP GROWTH</span>
                <Landmark size={14} className="text-sky-500" />
              </div>
              <div className="kpi-val-row">
                <span className="kpi-val text-slate-900">
                  {data?.summary.gdpGrowth !== null && data?.summary.gdpGrowth !== undefined
                    ? `${data.summary.gdpGrowth > 0 ? '+' : ''}${data.summary.gdpGrowth}%`
                    : 'N/A'}
                </span>
                <span className="kpi-pill-badge bg-sky-50 text-sky-700">Annual</span>
              </div>
              <span className="kpi-desc">Constant local currency market price growth</span>
            </div>

            <div className="wb-kpi-card">
              <div className="kpi-top">
                <span className="kpi-lbl">INFLATION RATE (CPI)</span>
                <Coins size={14} className="text-amber-500" />
              </div>
              <div className="kpi-val-row">
                <span className="kpi-val text-amber-700">
                  {data?.summary.inflationRate !== null && data?.summary.inflationRate !== undefined
                    ? `${data.summary.inflationRate}%`
                    : 'N/A'}
                </span>
                <span className="kpi-pill-badge bg-amber-50 text-amber-800">Consumer Basket</span>
              </div>
              <span className="kpi-desc">Headline cost of living purchasing pressure</span>
            </div>

            <div className="wb-kpi-card">
              <div className="kpi-top">
                <span className="kpi-lbl">MOBILE CELLULAR SUBSCRIPTIONS</span>
                <Smartphone size={14} className="text-emerald-500" />
              </div>
              <div className="kpi-val-row">
                <span className="kpi-val text-emerald-700">
                  {data?.summary.mobileSubsPer100 !== null && data?.summary.mobileSubsPer100 !== undefined
                    ? `${data.summary.mobileSubsPer100}`
                    : 'N/A'}
                </span>
                <span className="kpi-pill-badge bg-emerald-50 text-emerald-800">Per 100 people</span>
              </div>
              <span className="kpi-desc">Critical digital connectivity penetration</span>
            </div>

            <div className="wb-kpi-card">
              <div className="kpi-top">
                <span className="kpi-lbl">EXTERNAL DEBT STOCKS</span>
                <Scale size={14} className="text-rose-500" />
              </div>
              <div className="kpi-val-row">
                <span className="kpi-val text-rose-700">
                  {data?.summary.externalDebtBillions !== null && data?.summary.externalDebtBillions !== undefined
                    ? `$${data.summary.externalDebtBillions}B`
                    : 'N/A'}
                </span>
                <span className="kpi-pill-badge bg-rose-50 text-rose-800">Current USD</span>
              </div>
              <span className="kpi-desc">Total nonresident sovereign & private debt</span>
            </div>
          </div>

          {/* Interactive Historical Trend Section */}
          {selectedChartData && (
            <div className="wb-chart-section">
              <div className="wb-chart-header">
                <div>
                  <span className="chart-cat">{selectedChartData.category}</span>
                  <h4 className="chart-title">
                    {selectedChartData.name} ({selectedChartData.unit}) — {selectedMarket}
                  </h4>
                  <p className="chart-desc">{selectedChartData.description}</p>
                </div>
                <div className="chart-latest-box">
                  <span className="lbl">LATEST ({selectedChartData.latestYear})</span>
                  <span className="val">
                    {selectedChartData.latestValue !== null ? selectedChartData.latestValue : 'N/A'}{' '}
                    <small>{selectedChartData.unit}</small>
                  </span>
                  {selectedChartData.changePct !== null && (
                    <span className={`trend-delta ${selectedChartData.changePct > 0 ? 'pos' : 'neg'}`}>
                      {selectedChartData.changePct > 0 ? '▲' : '▼'} {Math.abs(selectedChartData.changePct)}% vs prev year
                    </span>
                  )}
                </div>
              </div>

              <div className="wb-chart-body">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={selectedChartData.history} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(val: any) => [`${val} ${selectedChartData.unit}`, selectedChartData.name]}
                      labelFormatter={(label) => `Year: ${label}`}
                      contentStyle={{ background: '#0F172A', color: '#FFFFFF', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#0284C7"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#0284C7' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* All Indicators Grid */}
          <div className="wb-indicators-panel">
            <div className="wb-filter-strip">
              <span className="filter-title">All Sovereign Indicators:</span>
              <div className="wb-cat-filter-btns">
                {['All', 'Macro Economy', 'Inflation & Monetary', 'Telecom & Digital', 'Trade & Debt'].map((cat) => (
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

            <div className="wb-ind-cards-grid">
              {filteredIndicators.map((ind) => {
                const isSelected = activeChartIndicator === ind.code;

                return (
                  <div
                    key={ind.code}
                    className={`ind-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setActiveChartIndicator(ind.code)}
                  >
                    <div className="ind-card-top">
                      <div className="flex items-center gap-1.5">
                        {getCategoryIcon(ind.category)}
                        <span className="ind-cat">{ind.category}</span>
                      </div>
                      <span className={`ind-status-tag status-${ind.status.toLowerCase()}`}>
                        {ind.status}
                      </span>
                    </div>

                    <h5 className="ind-name">{ind.name}</h5>

                    <div className="ind-val-row">
                      <span className="ind-val">
                        {ind.latestValue !== null ? ind.latestValue : 'N/A'}{' '}
                        <small className="ind-unit">{ind.unit}</small>
                      </span>
                      <span className="ind-year">Period: {ind.latestYear}</span>
                    </div>

                    <p className="ind-brief">{ind.description}</p>

                    <div className="ind-footer">
                      <span className="view-chart-hint">
                        {isSelected ? '● Currently Charting' : 'Click to view trend chart'}
                      </span>
                      <a
                        href={`https://data.worldbank.org/indicator/${ind.code}?locations=${COUNTRY_MAPPINGS[selectedMarket]?.iso2 || 'PK'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ind-link"
                        onClick={(e) => e.stopPropagation()}
                        title="View on World Bank Official Website"
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
