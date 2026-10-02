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
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import type {Work} from './use-workspace';
import type {Situation} from '@/lib/situations';
import type {GdeltArticle, GdeltMarketSummary, GdeltIntelligenceFeedResponse} from '@/lib/horizon/gdelt';

export function GdeltIntelligenceFeed({
  w,
  market = 'All markets',
  situations = [],
}: {
  w: Work;
  market?: string;
  situations?: Situation[];
}) {
  const [selectedMarket, setSelectedMarket] = useState<string>(market);
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

  // Detail Modal & Attach state
  const [inspectedArticle, setInspectedArticle] = useState<GdeltArticle | null>(null);
  const [selectedArticleToAttach, setSelectedArticleToAttach] = useState<GdeltArticle | null>(null);
  const [targetSituationId, setTargetSituationId] = useState<string>('');
  const [attaching, setAttaching] = useState<boolean>(false);
  const [attachSuccess, setAttachSuccess] = useState<string | null>(null);

  // Sync market prop
  useEffect(() => {
    if (market) setSelectedMarket(market);
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

  // Attach article as verified source evidence to a situation
  const handleAttachEvidence = async () => {
    if (!selectedArticleToAttach || !targetSituationId) return;
    setAttaching(true);
    setAttachSuccess(null);
    try {
      const res = await fetch('/api/gdelt', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          situationId: targetSituationId,
          article: {
            title: selectedArticleToAttach.title,
            url: selectedArticleToAttach.url,
            domain: selectedArticleToAttach.domain,
            publishedAt: selectedArticleToAttach.publishedAt,
          },
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && json.ok) {
        setAttachSuccess(`Article attached to [${targetSituationId}] as verified evidence.`);
        setTimeout(() => {
          setSelectedArticleToAttach(null);
          setAttachSuccess(null);
          w.refresh?.();
        }, 1300);
      } else {
        throw new Error(json.error || 'Failed to attach evidence');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to attach evidence');
    } finally {
      setAttaching(false);
    }
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
              <h3>GDELT 2.0 // GLOBAL GEOPOLITICAL INTELLIGENCE RADAR</h3>
              <span className="status-chip-live">LIVE FEED ACTIVE</span>
              <span className="source-nlp-tag">TRANSLINGUAL NLP (100+ LANG)</span>
            </div>
            <p className="command-subtitle">
              Real-time conflict event surveillance, telecommunications resilience, and regulatory sentiment tracking across VEON operating markets.
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
            {name: 'All markets', code: 'ALL'},
            {name: 'Ukraine', code: 'UA'},
            {name: 'Pakistan', code: 'PK'},
            {name: 'Uzbekistan', code: 'UZ'},
            {name: 'Kazakhstan', code: 'KZ'},
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
        /* ANALYST DATA GRID / TABLE VIEW */
        <div className="gdelt-table-container">
          <table className="gdelt-data-table">
            <thead>
              <tr>
                <th>PUBLISHED</th>
                <th>MARKET</th>
                <th>SEVERITY</th>
                <th>DRIVER</th>
                <th>HEADLINE & SOURCE</th>
                <th>TONE</th>
                <th>RELEVANCE</th>
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
                  <td>
                    <span className={`tbl-tone-pill ${art.toneScore < -2 ? 'tone-neg' : art.toneScore > 2 ? 'tone-pos' : 'tone-neu'}`}>
                      {art.toneScore < 0 ? art.toneScore : `+${art.toneScore}`}
                    </span>
                  </td>
                  <td className="td-relevance">{art.relevanceScore}%</td>
                  <td className="td-actions">
                    <div className="tbl-action-buttons">
                      <Button
                        size="sm"
                        variant="outline"
                        className="tbl-btn"
                        onClick={() => setInspectedArticle(art)}
                        title="Inspect full intelligence assessment"
                      >
                        <Eye size={12} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="tbl-btn btn-attach"
                        onClick={() => {
                          setSelectedArticleToAttach(art);
                          if (situations.length > 0) setTargetSituationId(situations[0].id);
                        }}
                        title="Attach as source evidence"
                      >
                        <FileCheck size={12} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* STREAM CARDS VIEW */
        <div className="gdelt-articles-grid">
          {loading && !feedData ? (
            <div className="gdelt-loading-state">
              <RefreshCw size={28} className="animate-spin text-sky-500" />
              <p>Ingesting live geopolitical intelligence from GDELT 2.0 translingual pipeline...</p>
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
                      <span className="card-domain">{art.domain}</span>
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
                        title="View operational impact assessment"
                      >
                        <Eye size={12} />
                        <span>Assess</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="attach-btn"
                        onClick={() => {
                          setSelectedArticleToAttach(art);
                          if (situations.length > 0) setTargetSituationId(situations[0].id);
                        }}
                        title="Attach as verified source evidence to a situation"
                      >
                        <FileCheck size={12} />
                        <span>Attach</span>
                      </Button>
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="open-source-link"
                        title="Open external news article"
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

      {/* 6. Modal: Full Operational Impact Assessment */}
      {inspectedArticle && (
        <Dialog open={!!inspectedArticle} onOpenChange={() => setInspectedArticle(null)}>
          <DialogContent className="assess-modal-content">
            <DialogTitle className="assess-modal-title">
              <ShieldAlert size={18} className="text-red-500 inline mr-2" />
              Geopolitical Event Impact Assessment
            </DialogTitle>
            <DialogDescription>
              Automated corporate risk assessment for VEON group operating committees.
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
              </div>
              <h4 className="assess-title">{inspectedArticle.title}</h4>
              <p className="assess-domain-row">
                Publisher: <strong>{inspectedArticle.domain}</strong> · Country:{' '}
                {inspectedArticle.sourcecountry} · Date:{' '}
                {new Date(inspectedArticle.publishedAt).toLocaleString()}
              </p>
            </div>

            {/* Operational Impact Dimensions */}
            <div className="impact-dimensions-grid">
              <div className="impact-col">
                <span className="impact-col-title">Telecom Infrastructure Vector</span>
                <p>
                  Potential risks to power substations, optical core corridors, or regional base transceiver stations. Recommended fuel buffer check.
                </p>
              </div>
              <div className="impact-col">
                <span className="impact-col-title">Regulatory & Cross-Border Supply</span>
                <p>
                  Assess customs clearance times for hardware replacements and regional roaming transit treaties.
                </p>
              </div>
            </div>

            <div className="assess-action-footer">
              <Button
                variant="outline"
                onClick={() => setInspectedArticle(null)}
              >
                Close
              </Button>
              <Button
                className="bg-sky-600 hover:bg-sky-700 text-white"
                onClick={() => {
                  setSelectedArticleToAttach(inspectedArticle);
                  if (situations.length > 0) setTargetSituationId(situations[0].id);
                  setInspectedArticle(null);
                }}
              >
                <FileCheck size={14} className="mr-1.5" />
                Attach as Source Evidence
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 7. Modal: Attach to Situation */}
      {selectedArticleToAttach && (
        <Dialog open={!!selectedArticleToAttach} onOpenChange={() => setSelectedArticleToAttach(null)}>
          <DialogContent className="attach-modal-content">
            <DialogTitle>Attach GDELT Article as Verified Evidence</DialogTitle>
            <DialogDescription>
              Promote this open-source intelligence signal into the Situation Register with an immutable audit trail.
            </DialogDescription>

            <div className="modal-article-preview">
              <h5>{selectedArticleToAttach.title}</h5>
              <div className="preview-meta">
                <span>Domain: {selectedArticleToAttach.domain}</span>
                <span>Market: {selectedArticleToAttach.market}</span>
                <span>Driver: {selectedArticleToAttach.driver}</span>
              </div>
              <a href={selectedArticleToAttach.url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">
                {selectedArticleToAttach.url}
              </a>
            </div>

            <div className="modal-select-section">
              <label htmlFor="situation-target-select" className="block text-xs font-semibold text-slate-700 mb-1">
                Select Target Situation in Workspace:
              </label>
              <select
                id="situation-target-select"
                value={targetSituationId}
                onChange={(e) => setTargetSituationId(e.target.value)}
                className="w-full text-sm border rounded p-2 bg-white"
              >
                {situations.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.id}] {s.title} ({s.scope})
                  </option>
                ))}
              </select>
            </div>

            {attachSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>{attachSuccess}</span>
              </div>
            )}

            <div className="modal-action-buttons">
              <Button variant="outline" onClick={() => setSelectedArticleToAttach(null)} disabled={attaching}>
                Cancel
              </Button>
              <Button
                className="bg-sky-600 hover:bg-sky-700 text-white"
                onClick={handleAttachEvidence}
                disabled={attaching || !targetSituationId}
              >
                {attaching ? 'Attaching...' : 'Confirm & Attach Evidence'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
