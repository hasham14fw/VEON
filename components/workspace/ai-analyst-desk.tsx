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
  Download,
  Compass,
  FileCheck,
  ShieldCheck,
  Send,
  Sliders,
  Check,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Work } from './use-workspace';
import type { Situation } from '@/lib/situations';
import type { AiEarlyPrediction } from '@/lib/horizon/ai-prediction';

export function AiAnalystDesk({
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
  const [prediction, setPrediction] = useState<AiEarlyPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executingIdx, setExecutingIdx] = useState<number | null>(null);
  const [executedActions, setExecutedActions] = useState<Record<string, { executedAt: string; notes?: string }>>({});
  const [officerNotes, setOfficerNotes] = useState<Record<string, string>>({});
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');

  useEffect(() => {
    if (market && market !== 'All markets') {
      setSelectedMarket(market);
    }
  }, [market]);

  const fetchPrediction = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/strategy?market=${encodeURIComponent(m)}`);
      const json = (await res.json()) as { ok?: boolean; prediction?: AiEarlyPrediction; error?: string };
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
    fetchPrediction(selectedMarket);
  }, [fetchPrediction, selectedMarket]);

  const handleExecuteAction = async (item: AiEarlyPrediction['playbook'][0], index: number) => {
    setExecutingIdx(index);
    const key = `${selectedMarket}-${index}`;
    try {
      const res = await fetch('/api/ai/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictionId: prediction?.id,
          market: selectedMarket,
          actionTitle: item.title,
          actionCategory: item.category,
          actionDetail: item.action,
          officerNotes: officerNotes[key] || '',
        }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (json && json.ok) {
        setExecutedActions((prev) => ({
          ...prev,
          [key]: { executedAt: new Date().toUTCString(), notes: officerNotes[key] },
        }));
        toast.success(`Decision Executed: ${item.title}`, {
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
      description: 'All operational continuity directives authorized.',
    });
  };

  const exportDecisionRecord = () => {
    if (!prediction) return;
    const data = {
      title: 'HORIZON 1440 - AI Strategic Decision Record',
      market: selectedMarket,
      generatedAt: prediction.generatedAt,
      model: prediction.model,
      incident: prediction.incidentTitle,
      escalationProbability: `${prediction.escalationProbability}%`,
      threatSeverity: prediction.threatSeverity,
      leadTime: prediction.estimatedLeadTime,
      strategicDirective: prediction.strategicDirective,
      rationale: prediction.rationale,
      decisions: prediction.playbook.map((p, idx) => ({
        ...p,
        status: executedActions[`${selectedMarket}-${idx}`] ? 'EXECUTED' : 'PENDING',
        executionAudit: executedActions[`${selectedMarket}-${idx}`] || null,
      })),
      convergingEvidence: prediction.evidenceLinks,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = `AI-Decision-Record-${selectedMarket}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
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

  return (
    <div className="space-y-7">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <Brain size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                AI ANALYST COMMAND DESK // STRATEGIC DECISION ENGINE
              </h2>
              <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                GEMINI 2.5 FLASH
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Autonomous risk synthesis, prescriptive continuity directives, and executive operational decision execution for {selectedMarket}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPrediction(selectedMarket)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold h-9 px-3.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Re-evaluate Ground Telemetry</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportDecisionRecord}
            disabled={!prediction}
            className="flex items-center gap-1.5 text-xs font-semibold h-9 px-3.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <Download size={13} />
            <span>Export Decision Record</span>
          </Button>
        </div>
      </div>

      {/* 2. Scope Selector */}
      <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1.5 px-3 text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
          <Compass size={14} className="text-sky-600" />
          <span>Theater of Operations:</span>
        </div>
        {['Pakistan', 'Ukraine', 'Kazakhstan', 'Uzbekistan', 'Bangladesh'].map((m) => (
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

      {loading && !prediction ? (
        <div className="p-16 bg-white rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw size={28} className="animate-spin text-sky-600" />
          <h3 className="text-base font-bold text-slate-900">Synthesizing Real-Time Geopolitical Telemetry</h3>
          <p className="text-xs text-slate-500 max-w-md">
            Gemini 2.5 Flash is analyzing live GDELT dispatches, UN OCHA ReliefWeb reports, and aviation exclusion zones to issue strategic directives...
          </p>
        </div>
      ) : !prediction ? (
        <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-500">
          <AlertTriangle size={32} className="mx-auto mb-2 text-amber-500" />
          <p>Failed to generate strategic prediction. Please click Re-evaluate to try again.</p>
        </div>
      ) : (
        <>
          {/* 3. Predictive Telemetry HUD & Threat Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Escalation Probability
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-3xl font-black text-rose-600">{prediction.escalationProbability}%</span>
                <span className="text-xs text-slate-500">24-72h horizon</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="h-full bg-rose-600 rounded-full"
                  style={{ width: `${prediction.escalationProbability}%` }}
                />
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Threat Classification
              </span>
              <div className="mt-1.5">
                <span
                  className={`inline-block px-3 py-1 text-xs font-bold rounded-md ${
                    prediction.threatSeverity === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : prediction.threatSeverity === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}
                >
                  {prediction.threatSeverity}
                </span>
              </div>
              <div className="text-[11.5px] text-slate-500 mt-2">
                Confidence score: <b>{prediction.confidenceScore}%</b>
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Estimated Lead Time
              </span>
              <div className="text-xl font-black text-slate-900 mt-1.5 flex items-center gap-1.5">
                <Clock size={16} className="text-slate-400" />
                <span>{prediction.estimatedLeadTime}</span>
              </div>
              <div className="text-[11.5px] text-slate-500 mt-2">Before kinetic impact on assets</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Primary Trigger Vector
              </span>
              <div className="text-sm font-bold text-slate-900 mt-1.5 truncate" title={prediction.primaryTriggerVector}>
                {prediction.primaryTriggerVector}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-2">Surveillance convergence driver</div>
            </div>
          </div>

          {/* 4. Strategic Executive Directive Banner */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs border-l-4 border-l-indigo-600">
            <div className="flex items-center justify-between gap-4 mb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  AUTHORITATIVE EXECUTIVE DIRECTIVE // {prediction.market.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                MODEL: {prediction.model}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
              {prediction.strategicDirective}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
              <strong className="text-slate-800">Strategic Rationale:</strong> {prediction.rationale}
            </p>
          </div>

          {/* 5. Prescriptive Operational Decisions & Playbook */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-sky-600" />
                  <span>PRESCRIPTIVE OPERATIONAL PLAYBOOK // TAKE DECISIONS</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Execute specific defensive directives across the 4 corporate continuity pillars.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleExecuteAll}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 h-9 px-4"
                >
                  <CheckCircle2 size={13} />
                  <span>Authorize All Decisions</span>
                </Button>
              </div>
            </div>

            {/* Playbook Items */}
            <div className="space-y-3.5">
              {prediction.playbook.map((item, idx) => {
                const key = `${selectedMarket}-${idx}`;
                const isExecuted = !!executedActions[key];
                const isExecuting = executingIdx === idx;

                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all ${
                      isExecuted
                        ? 'bg-emerald-50/30 border-emerald-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-white text-slate-800 border border-slate-200">
                            {getCategoryIcon(item.category)}
                            <span>{item.category}</span>
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.urgency.includes('Immediate')
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.urgency}
                          </span>

                          {isExecuted && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <Check size={11} />
                              <span>EXECUTED AT {executedActions[key].executedAt.slice(17, 25)} UTC</span>
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-mono bg-white p-2.5 rounded border border-slate-200">
                          {item.action}
                        </p>

                        {/* Officer Notes Input */}
                        <div className="pt-2 flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Add officer operational note or override..."
                            value={officerNotes[key] || ''}
                            onChange={(e) => setOfficerNotes((prev) => ({ ...prev, [key]: e.target.value }))}
                            disabled={isExecuted}
                            className="text-xs px-2.5 py-1.5 rounded border border-slate-200 bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>

                      {/* Decision Action Button */}
                      <div className="shrink-0 pt-1">
                        <Button
                          size="sm"
                          disabled={isExecuted || isExecuting}
                          onClick={() => handleExecuteAction(item, idx)}
                          className={`min-w-[140px] text-xs font-bold ${
                            isExecuted
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {isExecuting ? (
                            <span className="flex items-center gap-1">
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Dispatching...</span>
                            </span>
                          ) : isExecuted ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Executed</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Send size={12} />
                              <span>Take Decision</span>
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. Converging Ground-Truth Evidence Links */}
          <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Radio size={14} className="text-slate-500" />
                <span>CONVERGING SURVEILLANCE EVIDENCE INGESTED BY AI ({prediction.evidenceLinks.length})</span>
              </h4>
              <span className="text-[11px] text-slate-500">Live Wire Dispatches & UN Reports</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {prediction.evidenceLinks.map((ev, i) => (
                <a
                  key={i}
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-sky-50/50 hover:border-sky-300 transition-colors block group"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="font-semibold text-slate-700">{ev.publisher}</span>
                    <ExternalLink size={11} className="text-slate-400 group-hover:text-sky-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-sky-700 leading-snug">
                    {ev.headline}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
