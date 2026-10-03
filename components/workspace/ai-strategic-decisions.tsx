'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  ShieldAlert,
  Zap,
  Clock,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Fuel,
  Radio,
  Users,
  Building2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { AiEarlyPrediction } from '@/lib/horizon/ai-prediction';

interface AiStrategicDecisionsProps {
  market: string;
}

export function AiStrategicDecisions({ market }: AiStrategicDecisionsProps) {
  const [prediction, setPrediction] = useState<AiEarlyPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executingIdx, setExecutingIdx] = useState<number | null>(null);
  const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});

  const fetchPrediction = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/strategy?market=${encodeURIComponent(m)}`);
      const json = (await res.json()) as any;
      if (json && json.ok && json.prediction) {
        setPrediction(json.prediction);
      }
    } catch (err) {
      console.error('Failed to fetch AI strategy:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrediction(market);
  }, [fetchPrediction, market]);

  const handleExecuteAction = async (item: AiEarlyPrediction['playbook'][0], index: number) => {
    setExecutingIdx(index);
    try {
      const res = await fetch('/api/ai/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionId: prediction?.id,
          market,
          actionTitle: item.title,
          actionCategory: item.category,
          actionDetail: item.action,
        }),
      });

      const json = (await res.json()) as any;
      if (json && json.ok) {
        setExecutedActions(prev => ({ ...prev, [`${market}-${index}`]: true }));
        toast.success(`Action Executed: ${item.title}`, {
          description: 'Logged to corporate continuity audit trail.',
        });
      } else {
        toast.error(json?.error || 'Failed to dispatch action');
      }
    } catch {
      toast.error('Network error dispatching operational decision');
    } finally {
      setExecutingIdx(null);
    }
  };

  const handleExecuteAll = async () => {
    if (!prediction) return;
    for (let i = 0; i < prediction.playbook.length; i++) {
      await handleExecuteAction(prediction.playbook[i], i);
    }
    toast.success('Complete Strategic Playbook Dispatched', {
      description: 'All 4 operational continuity pillars activated.',
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Network & Continuity':
        return <Radio size={14} className="text-sky-600" />;
      case 'Supply Chain & Fuel':
        return <Fuel size={14} className="text-amber-600" />;
      case 'Personnel Security':
        return <Users size={14} className="text-rose-600" />;
      case 'Treasury & Regulatory':
        return <Building2 size={14} className="text-emerald-600" />;
      default:
        return <Zap size={14} className="text-indigo-600" />;
    }
  };

  if (loading && !prediction) {
    return (
      <div className="ai-strategy-card p-6 bg-slate-900 border border-slate-800 rounded-xl text-white flex items-center justify-center gap-3">
        <RefreshCw size={20} className="animate-spin text-sky-400" />
        <span className="text-sm font-medium text-slate-300">
          Gemini 2.5 Flash evaluating multi-source telemetry for {market}...
        </span>
      </div>
    );
  }

  if (!prediction) return null;

  return (
    <div className="ai-strategy-container mb-6">
      <div className="ai-strategy-card">
        {/* Top Header */}
        <div className="ai-strat-top">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="ai-gemini-badge">
              <Sparkles size={13} className="text-sky-400" />
              <span>GEMINI 2.5 FLASH REASONER</span>
            </div>
            <span className="ai-theater-tag">{market} OPERATIONAL THEATER</span>
            <span className="ai-threat-severity-pill">
              {prediction.threatSeverity}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="ai-refresh-btn"
              onClick={() => fetchPrediction(market)}
              disabled={loading}
              title="Re-run Gemini AI prediction"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Re-evaluate</span>
            </Button>
            <Button
              size="sm"
              className="ai-execute-all-btn"
              onClick={handleExecuteAll}
            >
              <Zap size={13} className="mr-1" />
              <span>Execute All Playbooks</span>
            </Button>
          </div>
        </div>

        {/* Prediction Headline & Probability Grid */}
        <div className="ai-strat-body">
          <div className="ai-incident-box">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">
              <AlertTriangle size={13} />
              <span>ACTIVE ISSUE IDENTIFIED</span>
            </div>
            <h3 className="ai-incident-title">{prediction.incidentTitle}</h3>
            <p className="ai-rationale-text">{prediction.rationale}</p>
          </div>

          {/* Telemetry Metrics */}
          <div className="ai-metrics-grid">
            <div className="ai-metric-item">
              <span className="metric-lbl">ESCALATION PROBABILITY</span>
              <div className="flex items-baseline gap-1.5">
                <span className="metric-val text-rose-600">{prediction.escalationProbability}%</span>
                <span className="text-[10px] font-bold text-rose-500 uppercase">HIGH RISK</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${prediction.escalationProbability}%` }}
                />
              </div>
            </div>

            <div className="ai-metric-item">
              <span className="metric-lbl">PREDICTED LEAD TIME</span>
              <div className="flex items-baseline gap-1.5">
                <span className="metric-val text-amber-600">{prediction.estimatedLeadTime}</span>
              </div>
              <span className="metric-sub">Warning decision window</span>
            </div>

            <div className="ai-metric-item">
              <span className="metric-lbl">PRIMARY TRIGGER VECTOR</span>
              <span className="metric-val text-slate-800 text-sm truncate">{prediction.primaryTriggerVector}</span>
              <span className="metric-sub">Confidence: {prediction.confidenceScore}%</span>
            </div>
          </div>
        </div>

        {/* Strategic Directive Banner */}
        <div className="ai-directive-banner">
          <div className="flex items-start gap-2">
            <Brain size={16} className="text-sky-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="directive-lbl">AI STRATEGIC CONTINUITY DIRECTIVE:</span>
              <p className="directive-quote">"{prediction.strategicDirective}"</p>
            </div>
          </div>
        </div>

        {/* 4 Categorized Playbooks */}
        <div className="ai-playbooks-section">
          <div className="playbooks-heading">
            <ShieldAlert size={14} className="text-slate-700" />
            <h4>PRESCRIPTIVE OPERATIONAL DECISIONS (4 PILLARS)</h4>
          </div>

          <div className="playbooks-grid">
            {prediction.playbook.map((item, idx) => {
              const isExecuted = executedActions[`${market}-${idx}`];
              const isExecuting = executingIdx === idx;

              return (
                <div key={idx} className={`playbook-card ${isExecuted ? 'executed' : ''}`}>
                  <div className="playbook-card-top">
                    <div className="flex items-center gap-1.5">
                      {getCategoryIcon(item.category)}
                      <span className="playbook-cat">{item.category}</span>
                    </div>
                    <span className="playbook-urgency">{item.urgency}</span>
                  </div>

                  <h5 className="playbook-title">{item.title}</h5>
                  <p className="playbook-action">{item.action}</p>

                  <div className="playbook-card-bottom">
                    {isExecuted ? (
                      <span className="executed-badge">
                        <CheckCircle2 size={12} className="text-emerald-600 mr-1" />
                        Dispatched & Logged
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="execute-btn"
                        onClick={() => handleExecuteAction(item, idx)}
                        disabled={isExecuting}
                      >
                        <Zap size={11} className={isExecuting ? 'animate-pulse' : ''} />
                        <span>{isExecuting ? 'Dispatching...' : 'Execute Playbook'}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Converging Real Evidence Footnote */}
        {prediction.evidenceLinks && prediction.evidenceLinks.length > 0 && (
          <div className="ai-evidence-footer">
            <span className="evidence-lbl">Converging Real-World Evidence Dispatches:</span>
            <div className="evidence-links-row">
              {prediction.evidenceLinks.slice(0, 3).map((ev, i) => (
                <a
                  key={i}
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="evidence-link-pill"
                >
                  <span className="pub">{ev.publisher}:</span>
                  <span className="head">{ev.headline}</span>
                  <ExternalLink size={10} className="ml-1" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
