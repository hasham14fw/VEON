'use client';
import {useState, useEffect} from 'react';
import {
  Globe2,
  LayoutGrid,
  Radio,
  FileText,
  BookOpen,
  Plus,
  ArrowUpRight,
  ChevronRight,
  Download,
  Plane,
  Shield,
  TrendingUp,
  Search,
  Check,
  Activity,
  LogOut,
  Layers,
  AlertTriangle,
  ShieldCheck,
  X,
  Globe,
  Map as MapIcon,
  MapPin,
  Newspaper,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {seed, markets, blankSituation, type Situation, type ScenarioName} from '@/lib/situations';
import {
  useWorkspace,
  MarketSignals,
  AssessmentDesk,
  AlertQueue,
  SourceRegistry,
  CoverageMap,
  BriefArchive,
  ValidationLab,
  SituationFilters,
  matchesSituation,
  defaultFilters,
  CountryDomains,
  AviationRadar,
  AviationMapsVisualizer,
  GdeltIntelligenceFeed,
} from '@/components/horizon-workspace';

const codes: Record<string, string> = {
  Ukraine: 'UA',
  Pakistan: 'PK',
  Uzbekistan: 'UZ',
  Kazakhstan: 'KZ',
  Bangladesh: 'BD',
  Global: 'GL',
};

// Highlighted executive Blue palette: distinct shades of blue for Situation landscape matrix
function matrixColor(x: number, y: number) {
  const bluePalette = [
    '#EDF5FF',   // Sum 0: Low disruption / short duration (soft icy blue tint)
    '#DBEAFE',   // Sum 1: Moderate (clear light sky blue)
    '#BFDBFE',   // Sum 2: Significant / medium (crisp azure blue)
    '#93C5FD',   // Sum 3: Warning / elevated (vibrant cerulean blue)
    '#60A5FA',   // Sum 4: Structural / prolonged (bold highlighted royal blue)
  ];
  return bluePalette[x + y - 2] || bluePalette[0];
}

const levels = ['Low', 'Moderate', 'High'],
  durations = ['Short-term', 'Medium-term', 'Prolonged'];

function Badge({status}: {status: string}) {
  return (
    <span className={'badge ' + status.toLowerCase()}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}

function Mini({s}: {s: {severity: number; duration: number}}) {
  return (
    <div className="mini">
      {[3, 2, 1].flatMap((y) =>
        [1, 2, 3].map((x) => (
          <i
            key={x + '-' + y}
            className={x === s.duration && y === s.severity ? 'chosen' : ''}
            style={{background: matrixColor(x, y)}}
          />
        ))
      )}
    </div>
  );
}

export default function Home() {
  const w = useWorkspace();
  const [assessmentId, setAssessmentId] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [saved, setSaved] = useState<Situation[]>([]);
  const [market, setMarket] = useState('All markets');
  const [view, setView] = useState('Overview');
  const [scenario, setScenario] = useState<ScenarioName>('Base');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Situation | null>(null);
  const [editing, setEditing] = useState<Situation | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const [showExamples, setShowExamples] = useState(true);
  const [cell, setCell] = useState<string | null>(null);
  const [utcTime, setUtcTime] = useState('');

  // Live real-time surveillance clock in UTC
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  async function refresh() {
    try {
      const r = await fetch('/api/situations');
      if (!r.ok) return;
      setSaved(await r.json());
      setError('');
    } catch {
      setError('');
    }
  }

  useEffect(() => {
    async function verifySession() {
      try {
        const r = await fetch('/api/auth/me');
        if (!r.ok) {
          window.location.href = '/login';
          return;
        }
      } catch {
        window.location.href = '/login';
        return;
      }
      refresh();
    }
    verifySession();
  }, []);

  const all = [...(showExamples ? seed.filter((s) => !saved.some((x) => x.id === s.id)) : []), ...saved].filter(
    (s) => showExamples || !s.illustrative
  );

  const filtered = all
    .filter(
      (s) =>
        (market === 'All markets' || market === 'Global'
          ? market === 'All markets' || s.scope === 'Global'
          : s.markets.includes(market as (typeof markets)[number])) &&
        (s.title + ' ' + s.driver).toLowerCase().includes(query.toLowerCase())
    )
    .filter((s) => matchesSituation(s, w.data, filters));

  const visible = filtered.filter(
    (s) => !cell || `${s.scenarios[scenario].duration}-${s.scenarios[scenario].severity}` === cell
  );

  async function save(s: Situation) {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/situations', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(s),
      });
      const d = (await r.json()) as Situation & {error?: string};
      if (!r.ok) throw Error(d.error);
      setSaved((p) => [...p.filter((x) => x.id !== d.id), d]);
      setEditing(null);
      if (selected?.id === d.id) setSelected(d);
      setNotice('Situation saved');
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const context = (document as unknown as {modelContext?: {registerTool: Function}}).modelContext;
    if (!context) return;
    const controller = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: 'list_horizon_situations',
            description:
              'Read the situations currently displayed in HORIZON 1440, including illustrative labels and scenario positions.',
            inputSchema: {type: 'object', properties: {}, additionalProperties: false},
            annotations: {readOnlyHint: true, untrustedContentHint: true},
            execute: (input: unknown) => {
              if (!input || typeof input !== 'object' || Object.keys(input).length) throw Error('Expected an empty object');
              return filtered.map((s) => ({
                id: s.id,
                title: s.title,
                scope: s.scope,
                illustrative: s.illustrative,
                status: s.status,
                scenario: s.scenarios[scenario],
              }));
            },
          },
          {signal: controller.signal}
        )
      ).catch(() => {});
    } catch {}
    return () => controller.abort();
  }, [saved, market, showExamples, query, scenario]);

  function download() {
    const data = {
      title: 'HORIZON 1440 — Board brief',
      generated: new Date().toISOString(),
      scope: market,
      scenario,
      situations: filtered,
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
    a.download = 'HORIZON-1440-brief.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <SidebarProvider>
      <Sidebar className="horizon-sidebar">
        <SidebarHeader>
          <div className="brand">
            <img className="veon-masterbrand" src="/brand/veon-logo-yellow.svg" alt="VEON" width="110" height="50" />
            <div className="product-brand">
              <div className="product-title">
                HORIZON <b>1440</b>
              </div>
              <small className="product-subtitle">Geopolitical intelligence</small>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-label">Workspace</div>
          <SidebarMenu>
            {[
              ['Overview', LayoutGrid],
              ['Signals', Radio],
              ['Market signals', TrendingUp],
              ['GDELT Intelligence', Newspaper],
              ['Airspace & No-Fly', Plane],
              ['Google Maps', Globe],
              ['Assessment', Shield],
              ['Alert queue', Activity],
              ['Evidence', BookOpen],
              ['Board brief', FileText],
              ['Sources & settings', Globe2],
              ['Validation', Check],
            ].map(([name, Icon]) => (
              <SidebarMenuItem key={String(name)}>
                <SidebarMenuButton isActive={view === name} onClick={() => setView(String(name))}>
                  <Icon />
                  <span>{String(name)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
          <div className="nav-label markets-label">Geographic scope</div>
          <SidebarMenu>
            {['All markets', 'Global', ...markets].map((m) => (
              <SidebarMenuItem key={m}>
                <SidebarMenuButton
                  isActive={market === m}
                  onClick={() => {
                    setMarket(m);
                    setCell(null);
                  }}
                >
                  {m === 'All markets' || m === 'Global' ? (
                    <Globe2 />
                  ) : (
                    <span className={'country-dot ' + codes[m]}>{codes[m]}</span>
                  )}
                  <span>{m}</span>
                  <span className="nav-count">
                    {
                      all.filter((s) =>
                        m === 'All markets' || (m === 'Global' ? s.scope === 'Global' : s.markets.includes(m as (typeof markets)[number]))
                      ).length
                    }
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="sidebar-foot">
            <p>Corporate Affairs</p>
            <small>Group intelligence command</small>
          </div>
        </SidebarFooter>
      </Sidebar>

      <main>
        {/* Dynamic Topbar with live UTC surveillance telemetry */}
        <header className="topbar">
          <div>
            <SidebarTrigger />
            <span>Intelligence workspace</span>
            <ChevronRight size={14} />
            <strong>{view}</strong>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div className="topbar-telemetry">
              <span className="beacon-pulse" />
              <span>LIVE FEED · {utcTime || 'SYNCHRONIZING'}</span>
            </div>
            <button
              type="button"
              className="sign-out-btn"
              onClick={async () => {
                await fetch('/api/auth/logout', {method: 'POST'});
                window.location.href = '/login';
              }}
              title="Sign out of workspace"
            >
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <div className="workspace">
          {/* Page Heading & Tactical Action Strip */}
          <div className="page-heading">
            <div>
              <h1>
                {view === 'Overview'
                  ? market === 'All markets'
                    ? 'Global perspective. Local exposure.'
                    : market + ' perspective.'
                  : view}
              </h1>
              {view === 'Overview' && (
                <p>Real-time geopolitical early-warning, scenario stress-testing, and automated risk correlation.</p>
              )}
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <Button
                variant="outline"
                className="maps-quick-btn"
                onClick={() => setView('Google Maps')}
                title="Visualize No-Fly Zones on Google Maps"
              >
                <MapPin size={15} style={{color: '#DC2626'}} />
                <span>Google Maps</span>
                <span className="maps-btn-badge" style={{background: '#DC2626', color: '#FFF'}}>7 RED NFZ</span>
              </Button>
              <Button className="primary-add-btn" onClick={() => setEditing(blankSituation())}>
                <Plus size={16} />
                <span>Add situation</span>
              </Button>
            </div>
          </div>

          {notice && (
            <div className="notice" role="status">
              <Check size={15} />
              <span>{notice}</span>
              <button onClick={() => setNotice('')}>Dismiss</button>
            </div>
          )}

          {/* KPI Metrics Strip with glowing containers */}
          <div className="metrics">
            <div className="metric-card metric-card-blue">
              <div className="metric-header">
                <span>Situations in view</span>
                <div className="metric-icon-wrap">
                  <Layers size={14} />
                </div>
              </div>
              <strong>{filtered.length.toString().padStart(2, '0')}</strong>
              <small>
                {filtered.filter((s) => s.scope === 'Global').length} global ·{' '}
                {filtered.filter((s) => s.scope !== 'Global').length} market-specific
              </small>
            </div>

            <div className="metric-card metric-card-rose">
              <div className="metric-header">
                <span>Leadership attention</span>
                <div className="metric-icon-wrap">
                  <AlertTriangle size={14} />
                </div>
              </div>
              <strong>
                {filtered.filter((s) => s.status === 'Escalate').length.toString().padStart(2, '0')}
                <ArrowUpRight size={16} style={{color: '#EF4444'}} />
              </strong>
              <small>Critical cases flagged for executive escalation</small>
            </div>

            <div className="metric-card metric-card-amber">
              <div className="metric-header">
                <span>Markets covered</span>
                <div className="metric-icon-wrap">
                  <Globe2 size={14} />
                </div>
              </div>
              <strong>
                {new Set(filtered.flatMap((s) => s.markets)).size}
                <span className="metric-denominator"> / 5</span>
              </strong>
              <small>Unified cross-border early-warning grid</small>
            </div>

            <div className="metric-card metric-card-emerald">
              <div className="metric-header">
                <span>Evidence coverage</span>
                <div className="metric-icon-wrap">
                  <ShieldCheck size={14} />
                </div>
              </div>
              <strong>
                {filtered.filter((s) => !s.illustrative && s.sources.length > 0).length.toString().padStart(2, '0')}
                <ShieldCheck size={16} style={{color: '#10B981'}} />
              </strong>
              <small>Verified sources attached with lineage</small>
            </div>
          </div>

          {/* VIEW: OVERVIEW */}
          {view === 'Overview' && (
            <>
              <SituationFilters value={filters} onChange={setFilters} />
              <CountryDomains w={w} situations={filtered} market={market} />

              <div className="overview-grid">
                {/* Situation Landscape Matrix */}
                <section className="panel matrix-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Situation landscape</h2>
                      <p>Degree × duration of disruption</p>
                    </div>
                    <Tabs
                      value={scenario}
                      onValueChange={(v) => {
                        setScenario(v as ScenarioName);
                        setCell(null);
                      }}
                    >
                      <TabsList>
                        {['Optimistic', 'Base', 'Pessimistic'].map((s) => (
                          <TabsTrigger key={s} value={s}>
                            {s}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="matrix-wrap">
                    <div className="y-label">DEGREE OF DISRUPTION</div>
                    <div className="y-ticks">
                      <span>High</span>
                      <span>Moderate</span>
                      <span>Low</span>
                    </div>

                    <div className="matrix">
                      {[3, 2, 1].flatMap((y) =>
                        [1, 2, 3].map((x) => (
                          <div
                            className={'matrix-cell ' + (cell === `${x}-${y}` ? 'active-cell' : '')}
                            key={x + '-' + y}
                            style={{background: matrixColor(x, y)}}
                          >
                            <button
                              className="cell-filter"
                              aria-label={`Filter ${levels[y - 1]} disruption, ${durations[x - 1]}`}
                              onClick={() => setCell(cell === `${x}-${y}` ? null : `${x}-${y}`)}
                            />
                            <span className="cell-caption">
                              {y === 3 && x === 3 ? 'STRUCTURAL DISRUPTION' : y === 1 && x === 1 ? 'CONTAINED IMPACT' : ''}
                            </span>
                            <div className="pins">
                              {filtered
                                .filter(
                                  (s) =>
                                    s.scenarios[scenario].severity === y &&
                                    s.scenarios[scenario].duration === x
                                )
                                .map((s) => (
                                  <button
                                    key={s.id}
                                    className={'pin ' + (s.scope === 'Global' ? 'global-pin' : '')}
                                    onClick={() => setSelected(s)}
                                    title={s.title}
                                  >
                                    <span>[{s.id.length < 8 ? s.id : codes[s.scope]}]</span>
                                    {s.title}
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="x-ticks">
                      <span>≤30 days</span>
                      <span>31–180 days</span>
                      <span>&gt;180 days</span>
                    </div>
                    <div className="x-label">DURATION OF DISRUPTION →</div>
                  </div>

                  <div className="matrix-footer">
                    <span>
                      <i className="legend-dot" /> Market situation <i className="legend-dot global" /> Global situation
                    </span>
                    <span>Click a situation to investigate</span>
                  </div>
                </section>
              </div>

              {/* Coverage Map */}
              <CoverageMap w={w} situations={all} onMarket={setMarket} />

              {/* Situation Register Table */}
              <section className="panel register">
                <div className="panel-heading">
                  <div>
                    <h2>
                      Situation register <span className="count">{visible.length}</span>
                    </h2>
                    <p>
                      {market === 'All markets'
                        ? 'Global and market-specific situations'
                        : market + ' situations and relevant global spillovers'}
                    </p>
                  </div>
                  <div className="search">
                    <Search size={16} />
                    <Input
                      placeholder="Search active situations, drivers or scopes…"
                      aria-label="Search situations"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        style={{
                          background: 'transparent',
                          border: 0,
                          color: '#8B9BB4',
                          padding: '0 4px',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {cell && (
                  <button className="clear-filter" onClick={() => setCell(null)}>
                    Clear matrix filter ×
                  </button>
                )}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Situation</th>
                        <th>Scope</th>
                        <th>Posture</th>
                        <th>Disruption</th>
                        <th>Duration</th>
                        <th>Confidence</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((s) => (
                        <tr key={s.id} onClick={() => setSelected(s)}>
                          <td>
                            <button className="situation-title" onClick={() => setSelected(s)}>
                              <span className="id-label">{s.id.length < 8 ? s.id : codes[s.scope]}</span>
                              {s.title}
                            </button>
                            <small>
                              {s.driver}
                              {s.illustrative ? ' · Illustrative' : ''}
                            </small>
                          </td>
                          <td>
                            <span className={`country-dot ${codes[s.scope] || 'GL'}`}>{s.scope}</span>
                          </td>
                          <td>
                            <Badge status={s.status} />
                          </td>
                          <td>{levels[s.scenarios[scenario].severity - 1]}</td>
                          <td>{durations[s.scenarios[scenario].duration - 1]}</td>
                          <td>{s.confidence}</td>
                          <td>
                            <ChevronRight size={17} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <div className="empty">No situations match this view. Add a situation or adjust your filters.</div>
                  )}
                </div>
              </section>
            </>
          )}

          {view === 'Market signals' && <MarketSignals w={w} market={market} />}
          {view === 'Airspace & No-Fly' && (
            <AviationRadar w={w} market={market} onOpenMaps={() => setView('Google Maps')} />
          )}
          {(view === 'Maps & Globe' || view === 'Google Maps') && <AviationMapsVisualizer w={w} market={market} />}
          {view === 'Assessment' && (
            <AssessmentDesk key={market + assessmentId} w={w} situations={filtered} initial={assessmentId} />
          )}
          {view === 'Alert queue' && <AlertQueue w={w} situations={filtered} />}
          {view === 'GDELT Intelligence' && (
            <GdeltIntelligenceFeed w={w} market={market} situations={all} />
          )}
          {view === 'Sources & settings' && <SourceRegistry w={w} />}
          {view === 'Validation' && <ValidationLab w={w} />}

          {/* VIEW: SIGNALS */}
          {view === 'Signals' && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Signal monitoring</h2>
                  <p>Shared signal families · compare observations with review thresholds</p>
                </div>
                <Badge status="Monitor" />
              </div>
              <div className="signal-grid">
                {filtered.map((s) => (
                  <article className="signal-situation" key={s.id}>
                    <h3>{s.title}</h3>
                    <small>
                      {s.scope} · {s.illustrative ? 'Synthetic observations' : 'Analyst-entered observations'}
                    </small>
                    {s.signals.map((sig, i) => (
                      <div className="signal" key={i}>
                        <div>
                          {i === 0 ? <Plane size={17} /> : i === 1 ? <Shield size={17} /> : <TrendingUp size={17} />}
                          <strong>{sig.name}</strong>
                          <Badge status={sig.value >= sig.threshold ? 'Watch' : 'Monitor'} />
                        </div>
                        <b>
                          {sig.value} <small>{sig.unit}</small>
                        </b>
                        <div className="signal-track">
                          <i style={{width: Math.min(100, (sig.value / Math.max(1, sig.threshold)) * 75) + '%'}} />
                        </div>
                        <small>
                          Baseline {sig.baseline} · Review ≥ {sig.threshold} · {sig.date}
                        </small>
                      </div>
                    ))}
                    {!s.signals.length && <p>No observations recorded.</p>}
                    <Button variant="outline" onClick={() => setEditing(structuredClone(s))}>
                      Update observations
                    </Button>
                  </article>
                ))}
              </div>
              <div className="method-note">
                Threshold crossings flag analyst review; they do not establish causation or predict conflict. Specialist
                intelligence is recorded as source evidence.
              </div>
            </section>
          )}

          {/* VIEW: EVIDENCE */}
          {view === 'Evidence' && (
            <>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Source evidence & analyst review</h2>
                    <p>Keep observations separate from assessment</p>
                  </div>
                </div>
                {filtered.map((s) => (
                  <div className="evidence-row" key={s.id}>
                    <div>
                      <h3>{s.title}</h3>
                      <p>
                        {s.sources.length ? (
                          s.sources.map((x, i) => (
                            <span key={i}>
                              {x.url ? (
                                <a href={x.url} target="_blank" rel="noreferrer">
                                  {x.title} ↗
                                </a>
                              ) : (
                                x.title
                              )}{' '}
                              · {x.date}
                              <br />
                            </span>
                          ))
                        ) : (
                          'No event evidence attached. This assessment is unverified.'
                        )}
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => setSelected(s)}>
                      Review situation
                    </Button>
                  </div>
                ))}
              </section>

              <section className="panel methodology">
                <h2>Framework & reference materials</h2>
                <p>
                  <b>HORIZON 1440:</b> commercial signals support human judgment, protecting people, sustaining connectivity
                  and informing investment.
                </p>
                <p>
                  <b>McKinsey:</b> map disruption by degree and duration; link scenarios to indicators, accountable owners and
                  action playbooks.
                </p>
                <p>
                  <b>KPMG:</b> commercial intelligence can reveal operational costs and indirect dependencies earlier. Aviation
                  cost estimates are not VEON forecasts.
                </p>
                <p>
                  Working scale: low = localized, manageable effects; moderate = material operating friction; high = critical
                  continuity or strategic exposure. Short-term = up to 30 days; medium-term = 31–180 days; prolonged = beyond
                  180 days. These are configurable working conventions, not source-prescribed thresholds.
                </p>
                <div className="reference-links">
                  <a href="/references/horizon.pdf" target="_blank">
                    HORIZON 1440 concept ↗
                  </a>
                  <a href="/references/mckinsey.pdf" target="_blank">
                    McKinsey report ↗
                  </a>
                  <a href="/references/kpmg.pdf" target="_blank">
                    KPMG report ↗
                  </a>
                </div>
              </section>
            </>
          )}

          {/* VIEW: BOARD BRIEF */}
          {view === 'Board brief' && <BriefArchive w={w} situations={filtered} scope={market} />}
          {view === 'Board brief' && (
            <section className="panel board">
              <div className="brief-brand">
                <img src="/brand/veon-logo-yellow.svg" alt="VEON" width="140" height="65" />
                <span>HORIZON 1440</span>
              </div>
              <div className="panel-heading">
                <div>
                  <div className="eyebrow">Corporate Affairs · Decision brief</div>
                  <h2>
                    {market} / {scenario} scenario
                  </h2>
                  <p>Prepared {new Date().toLocaleDateString('en-GB')} · Analyst review required</p>
                </div>
                <div className="button-row">
                  <Button variant="outline" onClick={download}>
                    <Download size={16} /> Export data
                  </Button>
                  <Button onClick={() => window.print()}>Print / PDF</Button>
                </div>
              </div>
              {filtered.map((s) => (
                <article className="brief-item" key={s.id}>
                  <div>
                    <Badge status={s.status} />
                    <small>
                      {s.scope}
                      {s.illustrative ? ' · ILLUSTRATIVE' : ''}
                    </small>
                  </div>
                  <h2>{s.title}</h2>
                  <div className="brief-columns">
                    <div>
                      <h4>WHAT MAY BE CHANGING</h4>
                      <p>{s.scenarios[scenario].description}</p>
                      <h4>WHERE WE ARE EXPOSED</h4>
                      <p>{s.exposure || 'Assessment required'}</p>
                    </div>
                    <div>
                      <h4>DECISION / ACTION</h4>
                      <p>{s.scenarios[scenario].action || 'Action required'}</p>
                      <h4>OWNER & ESCALATION TRIGGER</h4>
                      <p>
                        {s.owner} · {s.scenarios[scenario].trigger}
                      </p>
                    </div>
                    <div>
                      <h4>UPSIDE TO INVESTIGATE</h4>
                      <p>{s.opportunity || 'Not yet assessed'}</p>
                      <h4>EVIDENCE & CONFIDENCE</h4>
                      <p>
                        {s.sources.length} source(s) · {s.confidence} confidence
                      </p>
                    </div>
                  </div>
                </article>
              ))}
              {!filtered.length && <div className="empty">Add situations to prepare a brief.</div>}
            </section>
          )}

          <footer className="workspace-footer">
            <span>HORIZON 1440 · Corporate Affairs</span>
            <span>Human judgment at the centre. Earlier insight at the edge.</span>
          </footer>
        </div>
      </main>

      {/* DETAIL MODAL DIALOG */}
      <Dialog
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="detail-modal">
          <DialogTitle>{selected?.title}</DialogTitle>
          <DialogDescription>
            {selected?.scope} · {selected?.driver}
            {selected?.illustrative ? ' · Illustrative example' : ''}
          </DialogDescription>
          {selected && (
            <>
              <div className="detail-top">
                <Badge status={selected.status} />
                <span>{selected.confidence} confidence</span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(structuredClone(selected));
                    setSelected(null);
                  }}
                >
                  Edit assessment
                </Button>
              </div>
              <p>{selected.summary}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setAssessmentId(selected.id);
                  setView('Assessment');
                  setSelected(null);
                }}
              >
                Open assessment & evidence workspace
              </Button>
              <h3>Business exposure</h3>
              <p>{selected.exposure}</p>
              <h3>Opportunity to investigate</h3>
              <p>{selected.opportunity}</p>
              <h3>Scenario assessment</h3>
              {(['Optimistic', 'Base', 'Pessimistic'] as ScenarioName[]).map((name) => (
                <div className="detail-scenario" key={name}>
                  <Mini s={selected.scenarios[name]} />
                  <div>
                    <h3>
                      {name}{' '}
                      <small>
                        {levels[selected.scenarios[name].severity - 1]} ·{' '}
                        {durations[selected.scenarios[name].duration - 1]}
                      </small>
                    </h3>
                    <p>{selected.scenarios[name].description}</p>
                    <p>
                      <b>Trigger:</b> {selected.scenarios[name].trigger || 'Not defined'}
                    </p>
                    <p>
                      <b>Action:</b> {selected.scenarios[name].action || 'Not defined'}
                    </p>
                  </div>
                </div>
              ))}
              <h3>Evidence</h3>
              {selected.sources.length ? (
                selected.sources.map((s, i) => (
                  <p key={i}>
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer">
                        {s.title} ↗
                      </a>
                    ) : (
                      s.title
                    )}{' '}
                    · {s.date}
                  </p>
                ))
              ) : (
                <p>No sources attached. Verify before acting.</p>
              )}
              <h3>Analyst notes</h3>
              {selected.notes.map((n, i) => (
                <div className="note" key={i}>
                  <small>{new Date(n.date).toLocaleString()}</small>
                  <p>{n.text}</p>
                </div>
              ))}
              <Textarea
                placeholder="Record assessment, decision or observed outcome…"
                aria-label="Analyst note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                disabled={!note.trim() || saving}
                onClick={async () => {
                  if (
                    await save({
                      ...selected,
                      notes: [...selected.notes, {text: note.trim(), date: new Date().toISOString()}],
                    })
                  )
                    setNote('');
                }}
              >
                Save analyst note
              </Button>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <small>
                Owner: {selected.owner} · Updated {new Date(selected.updated).toLocaleString()}
              </small>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL DIALOG */}
      <Dialog
        open={!!editing}
        onOpenChange={(v) => {
          if (!v && !saving) setEditing(null);
        }}
      >
        <DialogContent className="edit-modal">
          <DialogTitle>{editing?.title ? 'Edit situation' : 'Add a situation'}</DialogTitle>
          <DialogDescription>Capture the situation, evidence and scenario-specific decisions.</DialogDescription>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(editing);
              }}
            >
              <label>
                Situation title
                <Input
                  required
                  minLength={3}
                  maxLength={180}
                  value={editing.title}
                  onChange={(e) => setEditing({...editing, title: e.target.value})}
                />
              </label>
              <div className="form-grid">
                {(['scope', 'driver', 'status', 'confidence'] as const).map((field) => (
                  <label key={field}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                    <select
                      value={editing[field]}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [field]: e.target.value,
                          ...(field === 'scope' && e.target.value !== 'Global' ? {markets: [e.target.value]} : {}),
                        } as Situation)
                      }
                    >
                      {(field === 'scope'
                        ? ['Global', ...markets]
                        : field === 'driver'
                        ? [
                            'Armed conflict',
                            'Technology controls',
                            'Trade & sanctions',
                            'Political & regulatory',
                            'Energy & infrastructure',
                          ]
                        : field === 'status'
                        ? ['Monitor', 'Watch', 'Escalate', 'Resolved']
                        : ['Low', 'Medium', 'High']
                      ).map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label>Exposed markets</label>
              <div className="market-checks">
                {markets.map((m) => (
                  <label key={m}>
                    <input
                      type="checkbox"
                      checked={editing.markets.includes(m)}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          markets: e.target.checked ? [...editing.markets, m] : editing.markets.filter((x) => x !== m),
                        })
                      }
                    />
                    {m}
                  </label>
                ))}
              </div>
              {editing.scope === 'Global' &&
                editing.markets.map((m) => (
                  <label key={m}>
                    Spillover rationale · {m}
                    <Input
                      value={editing.marketReasons?.[m] || ''}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          marketReasons: {...editing.marketReasons, [m]: e.target.value},
                        })
                      }
                    />
                  </label>
                ))}
              <label>
                Accountable owner
                <Input value={editing.owner} onChange={(e) => setEditing({...editing, owner: e.target.value})} />
              </label>
              {(['summary', 'exposure', 'opportunity'] as const).map((f) => (
                <label key={f}>
                  {f === 'summary'
                    ? 'What may be changing'
                    : f === 'exposure'
                    ? 'Business exposure'
                    : 'Opportunity to investigate'}
                  <Textarea value={editing[f]} onChange={(e) => setEditing({...editing, [f]: e.target.value})} />
                </label>
              ))}
              {(['Optimistic', 'Base', 'Pessimistic'] as ScenarioName[]).map((name) => (
                <fieldset key={name}>
                  <legend>{name} scenario</legend>
                  <div className="form-grid">
                    {(['severity', 'duration'] as const).map((f) => (
                      <label key={f}>
                        {f === 'severity' ? 'Degree of disruption' : 'Duration'}
                        <select
                          value={editing.scenarios[name][f] || ''}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              scenarios: {
                                ...editing.scenarios,
                                [name]: {...editing.scenarios[name], [f]: Number(e.target.value)},
                              },
                            })
                          }
                        >
                          {(f === 'severity' ? levels : durations).map((v, i) => (
                            <option value={i + 1} key={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {(
                    [
                      'description',
                      'assumptions',
                      'implications',
                      'supportingEvidence',
                      'conflictingEvidence',
                      'owner',
                      'reviewDue',
                      'trigger',
                      'action',
                    ] as const
                  ).map((f) => (
                    <label key={f}>
                      {f === 'trigger'
                        ? 'Early-warning / escalation trigger'
                        : f === 'action'
                        ? 'Business action'
                        : f === 'description'
                        ? 'Scenario description'
                        : f === 'supportingEvidence'
                        ? 'Supporting evidence'
                        : f === 'conflictingEvidence'
                        ? 'Conflicting evidence'
                        : f === 'reviewDue'
                        ? 'Scenario review due'
                        : f.charAt(0).toUpperCase() + f.slice(1)}
                      <Textarea
                        value={editing.scenarios[name][f] || ''}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            scenarios: {
                              ...editing.scenarios,
                              [name]: {...editing.scenarios[name], [f]: e.target.value},
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </fieldset>
              ))}
              <h3>Source evidence</h3>
              {editing.sources.map((s, i) => (
                <div className="source-form" key={i}>
                  <Input
                    required
                    aria-label="Source title"
                    placeholder="Source title"
                    value={s.title}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        sources: editing.sources.map((x, j) => (j === i ? {...x, title: e.target.value} : x)),
                      })
                    }
                  />
                  <Input
                    type="url"
                    aria-label="Source URL"
                    placeholder="https://…"
                    value={s.url}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        sources: editing.sources.map((x, j) => (j === i ? {...x, url: e.target.value} : x)),
                      })
                    }
                  />
                  <Input
                    type="date"
                    aria-label="Source date"
                    value={s.date}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        sources: editing.sources.map((x, j) => (j === i ? {...x, date: e.target.value} : x)),
                      })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setEditing({...editing, sources: editing.sources.filter((_, j) => j !== i)})
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    sources: [
                      ...editing.sources,
                      {title: '', url: '', date: new Date().toISOString().slice(0, 10)},
                    ],
                  })
                }
              >
                + Add evidence
              </Button>
              <h3>Signal observations</h3>
              {editing.signals.map((sig, i) => (
                <fieldset key={i}>
                  <Input
                    aria-label="Signal family"
                    value={sig.name}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        signals: editing.signals.map((s, j) => (j === i ? {...s, name: e.target.value} : s)),
                      })
                    }
                  />
                  <div className="form-grid">
                    {(['value', 'baseline', 'threshold', 'unit', 'date'] as const).map((f) => (
                      <label key={f}>
                        {f}
                        <Input
                          type={f === 'unit' ? 'text' : f === 'date' ? 'date' : 'number'}
                          step="any"
                          required
                          value={sig[f]}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              signals: editing.signals.map((s, j) =>
                                j === i
                                  ? {
                                      ...s,
                                      [f]: ['value', 'baseline', 'threshold'].includes(f)
                                        ? Number(e.target.value)
                                        : e.target.value,
                                    }
                                  : s
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setEditing({...editing, signals: editing.signals.filter((_, j) => j !== i)})
                    }
                  >
                    Remove observation
                  </Button>
                </fieldset>
              ))}
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  setEditing({
                    ...editing,
                    signals: [
                      ...editing.signals,
                      {
                        name: 'Aviation activity',
                        value: 0,
                        baseline: 0,
                        threshold: 1,
                        unit: 'index',
                        date: new Date().toISOString().slice(0, 10),
                      },
                    ],
                  })
                }
              >
                + Add observation
              </Button>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={editing.illustrative}
                  onChange={(e) => setEditing({...editing, illustrative: e.target.checked})}
                />{' '}
                Illustrative / synthetic data
              </label>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save situation'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
