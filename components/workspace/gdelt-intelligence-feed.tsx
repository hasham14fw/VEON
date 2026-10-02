'use client';

import React, {useState, useEffect, useMemo, useCallback} from 'react';
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
  const [feedData, setFeedData] = useState<GdeltIntelligenceFeedResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Attach modal state
  const [selectedArticle, setSelectedArticle] = useState<GdeltArticle | null>(null);
  const [targetSituationId, setTargetSituationId] = useState<string>('');
  const [attaching, setAttaching] = useState<boolean>(false);
  const [attachSuccess, setAttachSuccess] = useState<string | null>(null);

  // Sync selectedMarket when parent market prop changes
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
    }
  }, []);

  useEffect(() => {
    fetchFeed(selectedMarket);
  }, [fetchFeed, selectedMarket]);

  // Filtered articles
  const filteredArticles = useMemo(() => {
    if (!feedData?.articles) return [];
    return feedData.articles.filter((art) => {
      // Driver filter
      if (driverFilter !== 'All' && art.driver !== driverFilter) return false;
      // Threat filter
      if (threatFilter !== 'All' && art.threatLevel !== threatFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = art.title.toLowerCase().includes(q);
        const matchDomain = art.domain.toLowerCase().includes(q);
        const matchSummary = art.summary.toLowerCase().includes(q);
        if (!matchTitle && !matchDomain && !matchSummary) return false;
      }
      return true;
    });
  }, [feedData, driverFilter, threatFilter, searchQuery]);

  // Attach article as verified source evidence to a situation
  const handleAttachEvidence = async () => {
    if (!selectedArticle || !targetSituationId) return;
    setAttaching(true);
    setAttachSuccess(null);
    try {
      const res = await fetch('/api/gdelt', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          situationId: targetSituationId,
          article: {
            title: selectedArticle.title,
            url: selectedArticle.url,
            domain: selectedArticle.domain,
            publishedAt: selectedArticle.publishedAt,
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
          setSelectedArticle(null);
          setAttachSuccess(null);
          // Refresh workspace
          w.refresh?.();
        }, 1400);
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

  return (
    <div className="gdelt-container">
      {/* 1. Header Toolbar */}
      <div className="gdelt-header-toolbar">
        <div className="toolbar-left">
          <div className="live-pulse-badge">
            <span className="pulse-dot-green" />
            <span>GDELT 2.0 // GLOBAL GEOPOLITICAL EVENT STREAM</span>
          </div>
          <span className="source-tag">
            {feedData?.source || 'Public Global Surveillance API'}
          </span>
        </div>

        <div className="toolbar-actions">
          {/* Market Pills */}
          <div className="market-pills-row">
            {['All markets', 'Ukraine', 'Pakistan', 'Uzbekistan', 'Kazakhstan', 'Bangladesh', 'Global'].map(
              (m) => (
                <button
                  key={m}
                  type="button"
                  className={selectedMarket === m ? 'market-pill active' : 'market-pill'}
                  onClick={() => setSelectedMarket(m)}
                >
                  {m}
                </button>
              )
            )}
          </div>

          <Button
            variant="outline"
            className="refresh-btn"
            onClick={() => fetchFeed(selectedMarket)}
            disabled={loading}
            title="Refresh live GDELT intelligence feed"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Geopolitical Pulse Metric Strip */}
      <div className="gdelt-pulse-strip">
        <div className="pulse-metric-card border-blue">
          <div className="metric-meta">
            <Radio size={14} className="text-sky-500" />
            <span>TRACKED SIGNALS</span>
          </div>
          <div className="metric-val">{summary?.totalEvents ?? 0}</div>
          <small className="metric-hint">Events ingested for {selectedMarket}</small>
        </div>

        <div className="pulse-metric-card border-red">
          <div className="metric-meta">
            <ShieldAlert size={14} className="text-red-500" />
            <span>CRITICAL THREATS</span>
          </div>
          <div className="metric-val text-red-500">{summary?.criticalCount ?? 0}</div>
          <small className="metric-hint">Immediate operational risk factors</small>
        </div>

        <div className="pulse-metric-card border-amber">
          <div className="metric-meta">
            {summary && summary.averageTone < 0 ? (
              <TrendingDown size={14} className="text-amber-500" />
            ) : (
              <TrendingUp size={14} className="text-emerald-500" />
            )}
            <span>NET SENTIMENT TONE</span>
          </div>
          <div
            className={`metric-val ${
              summary && summary.averageTone < -2
                ? 'text-red-500'
                : summary && summary.averageTone > 1
                ? 'text-emerald-500'
                : 'text-amber-500'
            }`}
          >
            {summary ? (summary.averageTone > 0 ? `+${summary.averageTone}` : summary.averageTone) : '0.00'}
          </div>
          <small className="metric-hint">Scale -10 (Hostile) to +10 (Stable)</small>
        </div>

        <div className="pulse-metric-card border-purple">
          <div className="metric-meta">
            <Compass size={14} className="text-purple-500" />
            <span>PRIMARY RISK DRIVER</span>
          </div>
          <div className="metric-val-text">{summary?.primaryRiskDriver ?? 'Armed conflict'}</div>
          <small className="metric-hint">Dominant surveillance theme</small>
        </div>
      </div>

      {/* 3. Search and Quick Filters */}
      <div className="gdelt-filter-bar">
        <div className="filter-search-wrap">
          <Search size={14} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search breaking events, publishers, or infrastructure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-search-input"
          />
        </div>

        <div className="filter-dropdown-group">
          {/* Driver Filter */}
          <div className="filter-select-wrap">
            <span className="filter-label">Driver:</span>
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="filter-select"
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
          <div className="filter-select-wrap">
            <span className="filter-label">Severity:</span>
            <select
              value={threatFilter}
              onChange={(e) => setThreatFilter(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
              <option value="Elevated">Elevated</option>
              <option value="Informational">Informational</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Live Events Feed List */}
      <div className="gdelt-articles-grid">
        {loading && !feedData ? (
          <div className="gdelt-loading-state">
            <RefreshCw size={24} className="animate-spin text-sky-500" />
            <p>Ingesting real-time geopolitical intelligence from GDELT 2.0...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="gdelt-empty-state">
            <Radio size={32} className="text-slate-400" />
            <p>No geopolitical events match the selected filters.</p>
            <Button variant="outline" size="sm" onClick={() => { setDriverFilter('All'); setThreatFilter('All'); setSearchQuery(''); }}>
              Reset filters
            </Button>
          </div>
        ) : (
          filteredArticles.map((art) => {
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
                        art.toneScore < -3
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
                      className="attach-btn"
                      onClick={() => {
                        setSelectedArticle(art);
                        if (situations.length > 0) setTargetSituationId(situations[0].id);
                      }}
                      title="Attach as verified source evidence to a situation"
                    >
                      <FileCheck size={13} />
                      <span>Attach Evidence</span>
                    </Button>
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="open-source-link"
                      title="Open source article"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Modal: Attach to Situation */}
      {selectedArticle && (
        <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
          <DialogContent className="attach-modal-content">
            <DialogTitle>Attach GDELT Article as Verified Evidence</DialogTitle>
            <DialogDescription>
              Promote this open-source intelligence signal into the Situation Register with an immutable audit trail.
            </DialogDescription>

            <div className="modal-article-preview">
              <h5>{selectedArticle.title}</h5>
              <div className="preview-meta">
                <span>Domain: {selectedArticle.domain}</span>
                <span>Market: {selectedArticle.market}</span>
                <span>Driver: {selectedArticle.driver}</span>
              </div>
              <a href={selectedArticle.url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">
                {selectedArticle.url}
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
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>{attachSuccess}</span>
              </div>
            )}

            <div className="modal-action-buttons">
              <Button variant="outline" onClick={() => setSelectedArticle(null)} disabled={attaching}>
                Cancel
              </Button>
              <Button
                className="bg-sky-600 hover:bg-sky-700 text-white"
                onClick={handleAttachEvidence}
                disabled={attaching || !targetSituationId}
              >
                {attaching ? 'Attaching...' : 'Confirm & Attach'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
