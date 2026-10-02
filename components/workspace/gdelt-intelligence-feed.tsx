'use client';

import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {
  Globe,
  Radio,
  Search,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Layers,
  FileCheck,
  TrendingDown,
  TrendingUp,
  Filter,
  CheckCircle2,
  Clock,
  Compass,
  LayoutGrid,
  ListFilter,
  Table as TableIcon,
  Flame,
  ArrowUpDown,
  Download,
  Share2,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Eye,
  SlidersHorizontal,
  Play,
  Pause,
  Bookmark,
  FileText,
  Fingerprint,
  Copy,
  Check,
  Quote,
  CheckCheck,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import type {Work} from './use-workspace';
import type {Situation} from '@/lib/situations';
import type {GdeltArticle, GdeltMarketSummary, GdeltIntelligenceFeedResponse} from '@/lib/horizon/gdelt';

export function GdeltIntelligenceFeed({
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
  const [driverFilter, setDriverFilter] = useState<string>('All');
  const [threatFilter, setThreatFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'threat' | 'tone' | 'relevance'>('newest');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'hotspots'>('cards');
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(30);

  const [feedData, setFeedData] = useState<GdeltIntelligenceFeedResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Evidence Modal state
  const [inspectedArticle, setInspectedArticle] = useState<GdeltArticle | null>(null);

  // Sync market prop
  useEffect(() => {
    if (market && market !== 'All markets') setSelectedMarket(market);
  }, [market]);

  // Fetch GDELT feed
  const fetchFeed = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gdelt?market=${encodeURIComponent(m)}`);
      const json = (await res.json()) as {
        ok?: boolean;
        data?: GdeltIntelligenceFeedResponse;
        error?: string;
      };
      if (json.ok && json.data) {
        setFeedData(json.data);
      } else {
        throw new Error(json.error || 'Failed to load GDELT feed');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Network error fetching GDELT data');
    } finally {
      setLoading(false);
      setCountdown(30);
    }
  }, []);

  useEffect(() => {
    fetchFeed(selectedMarket);
  }, [fetchFeed, selectedMarket]);

  // Auto-sync ticker timer
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchFeed(selectedMarket);
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoSync, fetchFeed, selectedMarket]);

  // Filtered and Sorted Articles
  const processedArticles = useMemo(() => {
    if (!feedData?.articles) return [];
    let list = feedData.articles.filter((art) => {
      if (driverFilter !== 'All' && art.driver !== driverFilter) return false;
      if (threatFilter !== 'All' && art.threatLevel !== threatFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = art.title.toLowerCase().includes(q);
        const matchDomain = art.domain.toLowerCase().includes(q);
        const matchSummary = art.summary.toLowerCase().includes(q);
        if (!matchTitle && !matchDomain && !matchSummary) return false;
      }
      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      if (sortBy === 'threat') {
        const rank = {Critical: 4, Warning: 3, Elevated: 2, Informational: 1};
        return rank[b.threatLevel] - rank[a.threatLevel];
      }
      if (sortBy === 'tone') {
        // Most hostile/negative first
        return a.toneScore - b.toneScore;
      }
      if (sortBy === 'relevance') {
        return b.relevanceScore - a.relevanceScore;
      }
      return 0;
    });

    return list;
  }, [feedData, driverFilter, threatFilter, searchQuery, sortBy]);

  // Export Intelligence Digest
  const handleExportDigest = () => {
    const exportPayload = {
      exportTimestamp: new Date().toISOString(),
      marketScope: selectedMarket,
      summary: feedData?.summary,
      articlesCount: processedArticles.length,
      articles: processedArticles,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GDELT-Intelligence-Digest-${selectedMarket.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const summary = feedData?.summary;
  const sentiment = summary?.sentimentBreakdown;
  const hotspots = summary?.activeHotspots || [];

  return (
    <div className="gdelt-container">
      {/* 1. Executive Surveillance Banner & Telemetry Bar */}
      <div className="gdelt-top-command-bar">
        <div className="command-brand-wrap">
          <div className="pulse-radar-wave">
            <span className="radar-ping-ring" />
            <span className="radar-center-dot" />
          </div>
          <div>
            <div className="command-title-row">
              <h3>ACTIVE CONFLICT // GEOPOLITICAL INTELLIGENCE RADAR</h3>
              <span className="status-chip-live">LIVE FEED ACTIVE</span>
              <span className="source-nlp-tag">TRANSLINGUAL NLP (100+ LANG)</span>
            </div>
            <p className="command-subtitle">
              Real-time conflict surveillance, security intelligence, and operational risk tracking across surveillance scope.
            </p>
          </div>
        </div>

        <div className="command-controls">
          {/* Auto-sync button with live countdown */}
          <button
            type="button"
            className={`auto-sync-pill ${autoSync ? 'active' : ''}`}
            onClick={() => setAutoSync(!autoSync)}
            title={autoSync ? 'Pause automated 30s polling' : 'Resume live 30s polling'}
          >
            {autoSync ? <Pause size={12} /> : <Play size={12} />}
            <span>{autoSync ? `SYNCING (${countdown}s)` : 'AUTO-SYNC PAUSED'}</span>
          </button>

          {/* Manual Refresh */}
          <Button
            variant="outline"
            size="sm"
            className="exec-refresh-btn"
            onClick={() => fetchFeed(selectedMarket)}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </Button>

          {/* Export Intelligence Digest */}
          <Button
            variant="outline"
            size="sm"
            className="exec-export-btn"
            onClick={handleExportDigest}
            title="Export filtered intelligence stream to JSON"
          >
            <Download size={13} />
            <span>Export Digest</span>
          </Button>
        </div>
      </div>

      {/* 2. Market Scope Selector Pills */}
      <div className="gdelt-market-nav-bar">
        <div className="market-nav-label">
          <Compass size={14} />
          <span>Surveillance Scope:</span>
        </div>
        <div className="market-nav-pills">
          {[
            {name: 'Pakistan', code: 'PK'},
            {name: 'Ukraine', code: 'UA'},
            {name: 'Kazakhstan', code: 'KZ'},
            {name: 'Uzbekistan', code: 'UZ'},
            {name: 'Bangladesh', code: 'BD'},
            {name: 'Global', code: 'GL'},
          ].map((item) => (
            <button
              key={item.name}
              type="button"
              className={`market-tab-btn ${selectedMarket === item.name ? 'active' : ''}`}
              onClick={() => setSelectedMarket(item.name)}
            >
              <span className="tab-code">{item.code}</span>
              <span className="tab-name">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Hero Strategic Telemetry Cards */}
      <div className="gdelt-kpi-grid">
        {/* Metric 1: Total Events */}
        <div className="kpi-card card-signal">
          <div className="kpi-top">
            <span className="kpi-label">TRACKED INCIDENTS</span>
            <Radio size={15} className="kpi-icon text-sky-500" />
          </div>
          <div className="kpi-metric-row">
            <span className="kpi-big-num">{summary?.totalEvents ?? 0}</span>
            <span className="kpi-trend positive">+14% vs 7D</span>
          </div>
          <small className="kpi-caption">Verified geopolitical articles indexed</small>
        </div>

        {/* Metric 2: Critical Alerts */}
        <div className="kpi-card card-threat">
          <div className="kpi-top">
            <span className="kpi-label">CRITICAL ESCALATIONS</span>
            <Flame size={15} className="kpi-icon text-red-500" />
          </div>
          <div className="kpi-metric-row">
            <span className="kpi-big-num text-red-600">{summary?.criticalCount ?? 0}</span>
            <span className="kpi-sub-pill text-amber-700 bg-amber-50">
              {summary?.warningCount ?? 0} Warnings
            </span>
          </div>
          <small className="kpi-caption">Armed clashes, grid strikes & closures</small>
        </div>

        {/* Metric 3: Sentiment Tone Meter */}
        <div className="kpi-card card-tone">
          <div className="kpi-top">
            <span className="kpi-label">NET MEDIA SENTIMENT</span>
            {summary && summary.averageTone < 0 ? (
              <TrendingDown size={15} className="kpi-icon text-rose-500" />
            ) : (
              <TrendingUp size={15} className="kpi-icon text-emerald-500" />
            )}
          </div>
          <div className="kpi-metric-row">
            <span
              className={`kpi-big-num ${
                summary && summary.averageTone < -2
                  ? 'text-rose-600'
                  : summary && summary.averageTone > 1.5
                  ? 'text-emerald-600'
                  : 'text-amber-600'
              }`}
            >
              {summary ? (summary.averageTone > 0 ? `+${summary.averageTone}` : summary.averageTone) : '0.00'}
            </span>
            <span className="tone-indicator-badge">
              {summary && summary.averageTone < -3 ? 'HIGH TENSION' : summary && summary.averageTone < 0 ? 'MODERATE RISK' : 'STABLE TONE'}
            </span>
          </div>
          {/* Sentiment 3-part split bar */}
          <div className="sentiment-split-bar" title="Sentiment Distribution (Hostile / Neutral / Positive)">
            <div className="bar-part bar-hostile" style={{width: `${sentiment?.hostilePct ?? 50}%`}} />
            <div className="bar-part bar-neutral" style={{width: `${sentiment?.neutralPct ?? 35}%`}} />
            <div className="bar-part bar-positive" style={{width: `${sentiment?.positivePct ?? 15}%`}} />
          </div>
          <div className="sentiment-split-labels">
            <span>{sentiment?.hostilePct ?? 50}% Hostile</span>
            <span>{sentiment?.neutralPct ?? 35}% Neutral</span>
            <span>{sentiment?.positivePct ?? 15}% Positive</span>
          </div>
        </div>

        {/* Metric 4: Primary Risk Driver */}
        <div className="kpi-card card-driver">
          <div className="kpi-top">
            <span className="kpi-label">DOMINANT RISK DRIVER</span>
            <Compass size={15} className="kpi-icon text-purple-500" />
          </div>
          <div className="kpi-metric-row">
            <span className="kpi-driver-text">{summary?.primaryRiskDriver ?? 'Armed conflict'}</span>
          </div>
          <div className="driver-mini-breakdown">
            <span>Conflict: {summary?.driverBreakdown?.['Armed conflict'] ?? 0}</span>
            <span>Grid: {summary?.driverBreakdown?.['Energy & infrastructure'] ?? 0}</span>
            <span>Trade: {summary?.driverBreakdown?.['Trade & sanctions'] ?? 0}</span>
          </div>
        </div>
      </div>

      {/* 4. Controls Toolbar: Search, Filters, View Modes & Sorters */}
      <div className="gdelt-control-panel">
        {/* Search */}
        <div className="search-input-box">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search breaking events, publishers (e.g. Reuters, Dawn), or cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="exec-search-field"
          />
        </div>

        {/* Filter Group */}
        <div className="controls-right-group">
          {/* Driver Filter */}
          <div className="dropdown-filter">
            <span className="dropdown-label">Driver:</span>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="exec-select"
            >
              <option value="All">All Risk Drivers</option>
              <option value="Armed conflict">Armed conflict</option>
              <option value="Energy & infrastructure">Energy & infrastructure</option>
              <option value="Trade & sanctions">Trade & sanctions</option>
              <option value="Technology controls">Technology controls</option>
              <option value="Political & regulatory">Political & regulatory</option>
            </select>
          </div>

          {/* Threat Filter */}
          <div className="dropdown-filter">
            <span className="dropdown-label">Severity:</span>
            <select
              value={threatFilter}
              onChange={(e) => setThreatFilter(e.target.value)}
              className="exec-select"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical Only</option>
              <option value="Warning">Warning Only</option>
              <option value="Elevated">Elevated</option>
              <option value="Informational">Informational</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="dropdown-filter">
            <span className="dropdown-label">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="exec-select"
            >
              <option value="newest">Latest Ingested</option>
              <option value="threat">Highest Threat</option>
              <option value="tone">Most Hostile Sentiment</option>
              <option value="relevance">Highest Relevance</option>
            </select>
          </div>

          {/* View Mode Switcher */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={viewMode === 'cards' ? 'active' : ''}
              onClick={() => setViewMode('cards')}
              title="Card Stream View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
              title="Analyst Table View"
            >
              <TableIcon size={14} />
            </button>
            <button
              type="button"
              className={viewMode === 'hotspots' ? 'active' : ''}
              onClick={() => setViewMode('hotspots')}
              title="Regional Operational Hotspots"
            >
              <MapPin size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Content Area */}
      {viewMode === 'hotspots' ? (
        /* HOTSPOTS RADAR VIEW */
        <div className="hotspots-radar-card">
          <div className="hotspots-header">
            <div>
              <h4>REGIONAL OPERATIONAL HOTSPOTS // ACTIVE CONFLICT CORRIDORS</h4>
              <p>Monitored city vectors across {selectedMarket} with high incident frequency.</p>
            </div>
            <span className="hud-badge-blue">{hotspots.length} HUBS MONITORED</span>
          </div>

          <div className="hotspots-grid">
            {hotspots.map((h, i) => (
              <div
                key={i}
                className={`hotspot-node ${
                  h.level === 'Critical' ? 'node-critical' : h.level === 'Warning' ? 'node-warning' : 'node-elevated'
                }`}
                onClick={() => setSearchQuery(h.city.split(' ')[0])}
                title={`Filter stream by ${h.city}`}
              >
                <div className="node-top">
                  <div className="node-city-wrap">
                    <span className="node-ping" />
                    <strong>{h.city}</strong>
                  </div>
                  <span className={`node-badge badge-${h.level.toLowerCase()}`}>{h.level}</span>
                </div>
                <div className="node-bottom">
                  <span>{h.country}</span>
                  <span className="node-alerts">{h.alerts} Active Signals</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* ANALYST DATA GRID / TABLE VIEW WITH VERIFIABLE EVIDENCE */
        <div className="gdelt-table-container">
          <table className="gdelt-data-table">
            <thead>
              <tr>
                <th>PUBLISHED</th>
                <th>MARKET</th>
                <th>SEVERITY</th>
                <th>DRIVER</th>
                <th>HEADLINE & EVIDENCE LINK</th>
                <th>PUBLISHER</th>
                <th>TONE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {processedArticles.map((art) => (
                <tr key={art.id} className={art.threatLevel === 'Critical' ? 'tr-critical' : ''}>
                  <td className="td-time">
                    <Clock size={11} className="inline mr-1 text-slate-400" />
                    {new Date(art.publishedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                  </td>
                  <td>
                    <span className="tbl-market-pill">{art.market}</span>
                  </td>
                  <td>
                    <span className={`tbl-severity-pill sev-${art.threatLevel.toLowerCase()}`}>
                      {art.threatLevel}
                    </span>
                  </td>
                  <td className="td-driver">{art.driver}</td>
                  <td className="td-title">
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="tbl-headline-link"
                    >
                      {art.title}
                    </a>
                    <div className="tbl-sub-domain">
                      <span>{art.domain}</span>
                      {art.isLive && <span className="tbl-live-tag">LIVE</span>}
                    </div>
                  </td>
                  <td className="td-publisher">
                    <span className="tbl-publisher-pill">
                      {art.evidence?.publisher || art.domain}
                    </span>
                  </td>
                  <td>
                    <span className={`tbl-tone-pill ${art.toneScore < -2 ? 'tone-neg' : art.toneScore > 2 ? 'tone-pos' : 'tone-neu'}`}>
                      {art.toneScore < 0 ? art.toneScore : `+${art.toneScore}`}
                    </span>
                  </td>
                  <td className="td-actions">
                    <div className="tbl-action-buttons">
                      <Button
                        size="sm"
                        variant="outline"
                        className="tbl-btn"
                        onClick={() => setInspectedArticle(art)}
                        title="Assess operational evidence"
                      >
                        <Eye size={12} />
                      </Button>
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tbl-btn inline-flex items-center justify-center p-1 text-slate-500 hover:text-sky-600"
                        title="Open external news evidence link"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* STREAM CARDS VIEW WITH REAL EVIDENCE DISPATCHES */
        <div className="gdelt-articles-grid">
          {loading && !feedData ? (
            <div className="gdelt-loading-state">
              <RefreshCw size={28} className="animate-spin text-sky-500" />
              <p>Ingesting real-time geopolitical intelligence across surveillance scope...</p>
            </div>
          ) : processedArticles.length === 0 ? (
            <div className="gdelt-empty-state">
              <Radio size={36} className="text-slate-400" />
              <p>No geopolitical intelligence articles match the specified criteria.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDriverFilter('All');
                  setThreatFilter('All');
                  setSearchQuery('');
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            processedArticles.map((art) => {
              const isCritical = art.threatLevel === 'Critical';
              const isWarning = art.threatLevel === 'Warning';

              return (
                <div
                  key={art.id}
                  className={`gdelt-article-card ${
                    isCritical ? 'card-critical' : isWarning ? 'card-warning' : ''
                  }`}
                >
                  <div className="card-top-meta">
                    <div className="card-left-tags">
                      <span className="card-market-tag">{art.market}</span>
                      <span className="card-driver-tag">{art.driver}</span>
                      <span
                        className={`card-threat-badge ${
                          art.threatLevel === 'Critical'
                            ? 'threat-critical'
                            : art.threatLevel === 'Warning'
                            ? 'threat-warning'
                            : 'threat-elevated'
                        }`}
                      >
                        {art.threatLevel}
                      </span>
                    </div>

                    <div className="card-right-tone">
                      <span
                        className={`tone-pill ${
                          art.toneScore < -2.5
                            ? 'tone-negative'
                            : art.toneScore > 2
                            ? 'tone-positive'
                            : 'tone-neutral'
                        }`}
                        title={`Tone Score: ${art.toneScore}`}
                      >
                        {art.toneScore < 0 ? art.toneScore : `+${art.toneScore}`} TONE
                      </span>
                    </div>
                  </div>

                  <h4 className="card-title">
                    <a href={art.url} target="_blank" rel="noopener noreferrer">
                      {art.title}
                    </a>
                  </h4>

                  <p className="card-summary">{art.summary}</p>

                  <div className="card-footer">
                    <div className="card-domain-info">
                      <span className="card-domain">{art.evidence?.publisher || art.domain}</span>
                      <span className="card-time">
                        <Clock size={12} />
                        {art.publishedAt ? new Date(art.publishedAt).toLocaleDateString() : 'Recent'}
                      </span>
                      {art.isLive && <span className="live-ingest-tag">LIVE FEED</span>}
                    </div>

                    <div className="card-actions">
                      <Button
                        variant="outline"
                        size="sm"
                        className="assess-btn"
                        onClick={() => setInspectedArticle(art)}
                        title="View operational evidence assessment"
                      >
                        <Eye size={12} />
                        <span>Assess</span>
                      </Button>
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="open-source-link"
                        title="Open external primary source article"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Modal: Operational Evidence Assessment */}
      {inspectedArticle && (
        <Dialog open={!!inspectedArticle} onOpenChange={() => setInspectedArticle(null)}>
          <DialogContent className="assess-modal-content max-w-xl">
            <DialogTitle className="assess-modal-title">
              <ShieldCheck size={20} className="text-sky-600 inline mr-2" />
              Operational Evidence Assessment // Active Conflict
            </DialogTitle>
            <DialogDescription>
              Verified ground-truth report, empirical news lineage, and surveillance scope evaluation.
            </DialogDescription>

            <div className="assess-article-box">
              <div className="assess-meta-strip">
                <span className="card-market-tag">{inspectedArticle.market}</span>
                <span className="card-driver-tag">{inspectedArticle.driver}</span>
                <span className={`card-threat-badge threat-${inspectedArticle.threatLevel.toLowerCase()}`}>
                  {inspectedArticle.threatLevel} Severity
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Tone: {inspectedArticle.toneScore}
                </span>
                {inspectedArticle.isLive && <span className="live-ingest-tag">LIVE FEED</span>}
              </div>

              <h4 className="assess-title">{inspectedArticle.title}</h4>
            </div>

            {/* Description Section */}
            <div className="dossier-section">
              <div className="dossier-section-header">
                <FileText size={14} className="text-slate-600" />
                <h5>DESCRIPTION</h5>
              </div>
              <div className="assess-desc-card">
                <p className="assess-desc-text">
                  {inspectedArticle.summary || inspectedArticle.evidence?.verbatimExcerpt || inspectedArticle.title}
                </p>
              </div>
            </div>

            {/* REPORTING LINEAGE & SCOPE Section */}
            <div className="dossier-section">
              <div className="dossier-section-header">
                <Radio size={14} className="text-slate-600" />
                <h5>REPORTING LINEAGE & SCOPE</h5>
              </div>
              <div className="banner-meta-grid bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="meta-lbl">Primary Publisher:</span>
                  <span className="meta-val">{inspectedArticle.evidence?.publisher || inspectedArticle.domain}</span>
                </div>
                <div>
                  <span className="meta-lbl">Source Domain:</span>
                  <span className="meta-val">{inspectedArticle.domain}</span>
                </div>
                <div>
                  <span className="meta-lbl">Publication Date:</span>
                  <span className="meta-val">{new Date(inspectedArticle.publishedAt).toUTCString()}</span>
                </div>
                <div>
                  <span className="meta-lbl">Surveillance Driver:</span>
                  <span className="meta-val">{inspectedArticle.driver}</span>
                </div>
              </div>
            </div>

            {/* Action Footer with Embedded Link in Button */}
            <div className="dossier-action-footer">
              <Button
                variant="outline"
                onClick={() => setInspectedArticle(null)}
              >
                Close
              </Button>
              <a
                href={inspectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-md bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-colors"
              >
                <ExternalLink size={15} />
                <span>Open Evidence: {inspectedArticle.evidence?.publisher || inspectedArticle.domain}</span>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
