'use client';

import React, {useState, useRef, useMemo, useCallback, useEffect} from 'react';
import {
  Globe,
  Map as MapIcon,
  Layers,
  Plane,
  AlertTriangle,
  ShieldAlert,
  Compass,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Clock,
  MapPin,
  ExternalLink,
  ChevronRight,
  Shield,
  Activity,
  Filter,
  CheckCircle2,
  X,
  FileDown,
  Navigation,
  Eye,
  Radio,
  Search,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import world from '@/public/data/world.json';
import type {Work} from './use-workspace';

export interface AviationZoneGeo {
  id: string;
  name: string;
  firCode: string;
  lat: number;
  lon: number;
  radiusKm: number;
  market: string;
  status: 'Total Airspace Closure' | 'Restricted Corridor' | 'Military Buffer' | 'Active Advisory';
  severity: 'Critical' | 'Warning' | 'Elevated';
  altitude: string;
  notamReference: string;
  rationale: string;
  detourImpactMinutes: number;
  effectiveDate: string;
  riskFactor: number;
  x: number;
  y: number;
  svgX: number;
  svgY: number;
  radiusSvg: number;
}

// Convert Lat/Lon to SVG equirectangular coordinates
function geoToSvg(lat: number, lon: number) {
  const x = Math.round((((lon + 180) % 360) * 2) * 10) / 10;
  const y = Math.round(((90 - lat) * (300 / 180)) * 10) / 10;
  return {x, y, svgX: x, svgY: y};
}

// 7 Active Geopolitical No-Fly Zones in RED
export const GEO_NO_FLY_ZONES: AviationZoneGeo[] = [
  {
    id: 'NFZ-UA-01',
    name: 'Ukraine National Airspace Exclusion Zone',
    firCode: 'UKBV / UKDV / UKLV / UKOV / UKFV',
    lat: 49.0,
    lon: 31.3,
    radiusKm: 650,
    market: 'Ukraine',
    status: 'Total Airspace Closure',
    severity: 'Critical',
    altitude: 'SFC – UNL (Surface to Unlimited)',
    notamReference: 'EASA CZIB-2022-01R8 / ICAO NOTAM A0422/22',
    rationale:
      'Active military conflict, hostile surface-to-air missile threat, electronic jamming. Complete civil aviation prohibition.',
    detourImpactMinutes: 145,
    effectiveDate: '2022-02-24 (Active)',
    riskFactor: 98,
    ...geoToSvg(49.0, 31.3),
    radiusSvg: 28,
  },
  {
    id: 'NFZ-BS-01',
    name: 'Black Sea International Maritime Perimeter',
    firCode: 'UKOV / LBBB / URRV',
    lat: 43.8,
    lon: 34.5,
    radiusKm: 420,
    market: 'Global',
    status: 'Restricted Corridor',
    severity: 'Critical',
    altitude: 'SFC – UNL',
    notamReference: 'ICAO EUR Bulletin / Romanian CAA Adv',
    rationale:
      'Naval combat missile testing, anti-ship ballistic operations, severe GPS spoofing across international maritime airspace.',
    detourImpactMinutes: 55,
    effectiveDate: '2022-03-01 (Active)',
    riskFactor: 90,
    ...geoToSvg(43.8, 34.5),
    radiusSvg: 20,
  },
  {
    id: 'NFZ-IR-01',
    name: 'Middle East & Persian Gulf Transit Corridor',
    firCode: 'OIIX / OKAC / OSTT',
    lat: 32.4,
    lon: 53.6,
    radiusKm: 580,
    market: 'Global',
    status: 'Restricted Corridor',
    severity: 'Critical',
    altitude: 'Prohibited Below FL320',
    notamReference: 'FAA KICZ NOTAM A0012/26 / EASA Alert',
    rationale:
      'Elevated ballistic and drone strike threat vectors. Commercial carriers routing through northern Caspian transit corridor.',
    detourImpactMinutes: 65,
    effectiveDate: '2024-04-14 (Updated Sep 2026)',
    riskFactor: 86,
    ...geoToSvg(32.4, 53.6),
    radiusSvg: 24,
  },
  {
    id: 'NFZ-AF-01',
    name: 'Afghanistan Uncontrolled Transit FIR',
    firCode: 'OAKX (Kabul)',
    lat: 33.9,
    lon: 67.7,
    radiusKm: 480,
    market: 'Uzbekistan',
    status: 'Active Advisory',
    severity: 'Warning',
    altitude: 'Prohibited Below FL320',
    notamReference: 'FAA SFAR 115 / EASA Conflict Bulletin',
    rationale:
      'Total absence of civil air traffic control radar and emergency ground intervention. Flights to Tashkent bypass Kabul FIR.',
    detourImpactMinutes: 45,
    effectiveDate: '2021-08-18 (Standing Advisory)',
    riskFactor: 72,
    ...geoToSvg(33.9, 67.7),
    radiusSvg: 21,
  },
  {
    id: 'NFZ-PK-01',
    name: 'Pakistan Line-of-Control & Western Border Corridor',
    firCode: 'OPLR (Lahore) / OPKC (Karachi)',
    lat: 33.9,
    lon: 73.8,
    radiusKm: 320,
    market: 'Pakistan',
    status: 'Military Buffer',
    severity: 'Warning',
    altitude: 'GND – FL280 Tactical Segments',
    notamReference: 'CAA Pakistan NOTAM C0145/26',
    rationale:
      'Cross-border military alert areas and low-level tactical air operations. Civil departures diverted via southern Karachi routes.',
    detourImpactMinutes: 35,
    effectiveDate: '2026-05-10 (Continuous Review)',
    riskFactor: 64,
    ...geoToSvg(33.9, 73.8),
    radiusSvg: 16,
  },
  {
    id: 'NFZ-KZ-01',
    name: 'Northern Caspian & Volga Buffer Sector',
    firCode: 'UAAA (Almaty) / UATX (Aktau)',
    lat: 47.1,
    lon: 51.9,
    radiusKm: 360,
    market: 'Kazakhstan',
    status: 'Active Advisory',
    severity: 'Elevated',
    altitude: 'Military Operations Area Advisory',
    notamReference: 'KazAeroNavigatsia Advisory 2026/04',
    rationale:
      'Increased radar surveillance and periodic rocket launch orbital safety corridors. Flights monitored via Atyrau transit gates.',
    detourImpactMinutes: 25,
    effectiveDate: '2026-02-15 (Periodic Review)',
    riskFactor: 58,
    ...geoToSvg(47.1, 51.9),
    radiusSvg: 18,
  },
  {
    id: 'NFZ-BD-01',
    name: 'Bay of Bengal & Myanmar Border Buffer Sector',
    firCode: 'VGHS (Dhaka) / VYYY (Yangon)',
    lat: 21.5,
    lon: 92.2,
    radiusKm: 290,
    market: 'Bangladesh',
    status: 'Active Advisory',
    severity: 'Elevated',
    altitude: 'Below FL260 in Border FIR Overlaps',
    notamReference: 'CAAB Dhaka Circular A02/26',
    rationale:
      'Armed clashes and air activity along the Arakan corridor. Civil departures from Cox’s Bazar follow strict southern vectoring.',
    detourImpactMinutes: 20,
    effectiveDate: '2024-03-01 (Continuous Monitoring)',
    riskFactor: 52,
    ...geoToSvg(21.5, 92.2),
    radiusSvg: 14,
  },
];

export function AviationMapsVisualizer({w, market}: {w: Work; market?: string}) {
  const [activeTab, setActiveTab] = useState<'google' | 'globe' | 'dual'>('google');
  const [selectedZone, setSelectedZone] = useState<AviationZoneGeo | null>(GEO_NO_FLY_ZONES[0]);
  const [modalZone, setModalZone] = useState<AviationZoneGeo | null>(null);

  // Google Maps State
  const [googleMapType, setGoogleMapType] = useState<'m' | 'k' | 'p' | 'h'>('m');
  const [googleZoom, setGoogleZoom] = useState<number>(6);
  const [customSearch, setCustomSearch] = useState<string>('');
  const [searchTarget, setSearchTarget] = useState<string>('49.0,31.3');

  // 3D Canvas Globe State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<{x: number; y: number}>({x: 0.35, y: -45});
  const [autoRotate, setAutoRotate] = useState(true);
  const [globeZoom, setGlobeZoom] = useState(1);
  const isDraggingGlobe = useRef(false);
  const dragStartGlobe = useRef({x: 0, y: 0});
  const animFrameRef = useRef<number | null>(null);

  // Filtered Zones based on active market
  const displayedZones = useMemo(() => {
    return GEO_NO_FLY_ZONES.filter((z) => {
      if (market && market !== 'All markets' && market !== 'Global' && z.market !== market && z.market !== 'Global') {
        return false;
      }
      return true;
    });
  }, [market]);

  // Focus Google Map on a Specific Threat Theatre or Coordinates
  const focusOnTheatre = useCallback(
    (lat: number, lon: number, zoomLevel = 6, zoneId?: string) => {
      setSearchTarget(`${lat},${lon}`);
      setGoogleZoom(zoomLevel);
      if (zoneId) {
        const found = GEO_NO_FLY_ZONES.find((z) => z.id === zoneId);
        if (found) setSelectedZone(found);
      } else {
        const found = GEO_NO_FLY_ZONES.find((z) => Math.abs(z.lat - lat) < 1 && Math.abs(z.lon - lon) < 1);
        if (found) setSelectedZone(found);
      }

      // Also orient 3D Globe
      rotationRef.current = {
        x: (lat * Math.PI) / 180,
        y: -lon,
      };
      setGlobeZoom(1.35);
    },
    []
  );

  // Focus on Selected Zone
  const handleSelectZone = (zone: AviationZoneGeo) => {
    setSelectedZone(zone);
    setSearchTarget(`${zone.lat},${zone.lon}`);
    setGoogleZoom(6);
    rotationRef.current = {
      x: (zone.lat * Math.PI) / 180,
      y: -zone.lon,
    };
  };

  // Google Maps Search Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearch.trim()) return;
    setSearchTarget(encodeURIComponent(customSearch.trim()));
    setGoogleZoom(7);
  };

  // 3D Globe Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeTab === 'google') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 540);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    let pulsePhase = 0;

    const project = (lat: number, lon: number) => {
      const phi = (lat * Math.PI) / 180;
      const theta = ((lon + rotationRef.current.y) * Math.PI) / 180;
      const rotX = rotationRef.current.x;

      const x0 = Math.cos(phi) * Math.sin(theta);
      const y0 = Math.sin(phi);
      const z0 = Math.cos(phi) * Math.cos(theta);

      const y1 = y0 * Math.cos(rotX) - z0 * Math.sin(rotX);
      const z1 = y0 * Math.sin(rotX) + z0 * Math.cos(rotX);

      const R = Math.min(width, height) * 0.38 * globeZoom;
      const cx = width / 2;
      const cy = height / 2;

      return {
        x: cx + x0 * R,
        y: cy - y1 * R,
        visible: z1 > 0,
        depth: z1,
      };
    };

    const renderGlobe = () => {
      ctx.clearRect(0, 0, width, height);

      if (autoRotate && !isDraggingGlobe.current) {
        rotationRef.current.y += 0.22;
      }
      pulsePhase += 0.05;

      const R = Math.min(width, height) * 0.38 * globeZoom;
      const cx = width / 2;
      const cy = height / 2;

      // Space Background
      ctx.fillStyle = '#060B14';
      ctx.fillRect(0, 0, width, height);

      // Globe Ocean Gradient
      const oceanGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      oceanGrad.addColorStop(0, '#0F2744');
      oceanGrad.addColorStop(0.7, '#071626');
      oceanGrad.addColorStop(1, '#030A12');
      ctx.fillStyle = oceanGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric Atmosphere Halo
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Graticule Latitude/Longitude Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let drawn = false;
        for (let lon = -180; lon <= 180; lon += 5) {
          const pt = project(lat, lon);
          if (pt.visible) {
            if (!drawn) {
              ctx.moveTo(pt.x, pt.y);
              drawn = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            drawn = false;
          }
        }
        ctx.stroke();
      }

      // RED NO-FLY ZONES ON 3D GLOBE
      displayedZones.forEach((zone) => {
        const pt = project(zone.lat, zone.lon);
        if (!pt.visible || pt.depth <= -0.1) return;

        const isSelected = selectedZone?.id === zone.id;
        const scaleFactor = Math.max(0.4, 0.6 + pt.depth * 0.5);

        // Animated Red Threat Radius Ring
        const currentPulseRadius = (16 + Math.sin(pulsePhase * 2 + zone.riskFactor) * 6) * scaleFactor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, currentPulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.22)';
        ctx.fill();
        ctx.stroke();

        // Core Red Threat Epicenter
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5 * scaleFactor, 0, Math.PI * 2);
        ctx.fillStyle = '#DC2626';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2 * scaleFactor, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Red Zone ID Tag
        if (pt.depth > 0.2 || isSelected) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = isSelected ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
          ctx.fillText(zone.id, pt.x + 8, pt.y + 3);
        }
      });

      animFrameRef.current = requestAnimationFrame(renderGlobe);
    };

    renderGlobe();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab, autoRotate, globeZoom, displayedZones, selectedZone]);

  const activeZone = selectedZone || displayedZones[0];

  return (
    <div className="maps-visualizer-container">
      {/* Top Tactical Command Header */}
      <div className="maps-topbar">
        <div className="maps-title-wrap">
          <div className="maps-badge">
            <span className="radar-live-dot" />
            <span>GOOGLE MAPS // AIRSPACE NO-FLY VISUALIZER</span>
          </div>
          <h1>Google Maps Airspace Intelligence</h1>
        </div>

        {/* View Switcher: Google Maps | 3D Globe | Dual View */}
        <div className="maps-control-cluster">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={activeTab === 'google' ? 'active' : ''}
              onClick={() => setActiveTab('google')}
            >
              <MapIcon size={15} />
              <span>Google Maps</span>
            </button>
            <button
              type="button"
              className={activeTab === 'globe' ? 'active' : ''}
              onClick={() => setActiveTab('globe')}
            >
              <Globe size={15} />
              <span>3D Globe</span>
            </button>
            <button
              type="button"
              className={activeTab === 'dual' ? 'active' : ''}
              onClick={() => setActiveTab('dual')}
            >
              <Layers size={15} />
              <span>Dual View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Regional Theatre Jump Strip */}
      <div className="theatre-quick-strip">
        <span className="theatre-label">
          <Compass size={14} /> Focus Theatre:
        </span>
        <button
          type="button"
          className={selectedZone?.id === 'NFZ-UA-01' ? 'active-theatre' : ''}
          onClick={() => focusOnTheatre(49.0, 31.3, 6, 'NFZ-UA-01')}
        >
          🇺🇦 Ukraine
        </button>
        <button
          type="button"
          className={selectedZone?.id === 'NFZ-BS-01' ? 'active-theatre' : ''}
          onClick={() => focusOnTheatre(43.8, 34.5, 6, 'NFZ-BS-01')}
        >
          🌊 Black Sea
        </button>
        <button
          type="button"
          className={selectedZone?.id === 'NFZ-IR-01' ? 'active-theatre' : ''}
          onClick={() => focusOnTheatre(32.4, 53.6, 6, 'NFZ-IR-01')}
        >
          🇮🇷 Persian Gulf
        </button>
        <button
          type="button"
          className={selectedZone?.id === 'NFZ-AF-01' ? 'active-theatre' : ''}
          onClick={() => focusOnTheatre(33.9, 67.7, 6, 'NFZ-AF-01')}
        >
          🇦🇫 Afghanistan
        </button>
        <button
          type="button"
          className={selectedZone?.id === 'NFZ-PK-01' ? 'active-theatre' : ''}
          onClick={() => focusOnTheatre(33.9, 73.8, 7, 'NFZ-PK-01')}
        >
          🇵🇰 Pakistan LOC
        </button>
        <button
          type="button"
          className={selectedZone?.id === 'NFZ-KZ-01' ? 'active-theatre' : ''}
          onClick={() => focusOnTheatre(47.1, 51.9, 6, 'NFZ-KZ-01')}
        >
          🇰🇿 Central Asia
        </button>
        <button
          type="button"
          className={selectedZone?.id === 'NFZ-BD-01' ? 'active-theatre' : ''}
          onClick={() => focusOnTheatre(21.5, 92.2, 7, 'NFZ-BD-01')}
        >
          🇧🇩 Bay of Bengal
        </button>
        <button
          type="button"
          onClick={() => {
            setSearchTarget('40.0,55.0');
            setGoogleZoom(4);
          }}
        >
          🌍 Global Overview
        </button>
      </div>

      {/* Main Display Area */}
      <div className={`maps-viewport-layout layout-${activeTab}`}>
        {/* 1. Official Google Maps View with Red Threat HUD */}
        {(activeTab === 'google' || activeTab === 'dual') && (
          <div className="google-style-map-card">
            {/* Google Maps Layer & Zoom Controls Toolbar */}
            <div className="viewport-overlay-header">
              <div className="viewport-tag">
                <MapIcon size={14} />
                <span>OFFICIAL GOOGLE MAPS // ROADMAP · SATELLITE · TERRAIN</span>
              </div>

              {/* Map Type Switcher */}
              <div className="map-toolbar-actions">
                <div className="google-map-type-pills">
                  <button
                    type="button"
                    className={googleMapType === 'm' ? 'active' : ''}
                    onClick={() => setGoogleMapType('m')}
                    title="Google Road Map (Countries, Cities, Roads)"
                  >
                    Road Map
                  </button>
                  <button
                    type="button"
                    className={googleMapType === 'k' ? 'active' : ''}
                    onClick={() => setGoogleMapType('k')}
                    title="Google Satellite Imagery"
                  >
                    Satellite
                  </button>
                  <button
                    type="button"
                    className={googleMapType === 'p' ? 'active' : ''}
                    onClick={() => setGoogleMapType('p')}
                    title="Google Topographic Terrain"
                  >
                    Terrain
                  </button>
                  <button
                    type="button"
                    className={googleMapType === 'h' ? 'active' : ''}
                    onClick={() => setGoogleMapType('h')}
                    title="Google Hybrid (Satellite + Sovereign Borders)"
                  >
                    Hybrid
                  </button>
                </div>

                {/* Search Bar on Google Maps */}
                <form onSubmit={handleSearchSubmit} className="google-map-search-form">
                  <Search size={13} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search country or city..."
                    value={customSearch}
                    onChange={(e) => setCustomSearch(e.target.value)}
                    className="google-search-input"
                  />
                </form>

                {/* Zoom In / Out Buttons */}
                <div className="zoom-btn-group">
                  <button
                    type="button"
                    onClick={() => setGoogleZoom((z) => Math.min(18, z + 1))}
                    title="Zoom in on Google Map"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <span className="zoom-indicator-text">{googleZoom}x</span>
                  <button
                    type="button"
                    onClick={() => setGoogleZoom((z) => Math.max(3, z - 1))}
                    title="Zoom out on Google Map"
                  >
                    <ZoomOut size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Google Map Embedded Frame */}
            <div className="google-map-embed-wrapper">
              <iframe
                src={`https://maps.google.com/maps?q=${searchTarget}&t=${googleMapType}&z=${googleZoom}&output=embed`}
                className="google-maps-iframe"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps Tactical Airspace Intelligence"
              />

              {/* Floating RED No-Fly Zone Tactical HUD on Google Maps */}
              <div className="floating-red-threat-hud">
                <div className="threat-hud-header">
                  <div className="threat-header-left">
                    <span className="red-pulse-indicator" />
                    <strong>ACTIVE NO-FLY ZONES (RED)</strong>
                  </div>
                  <span className="hud-badge-red">7 RESTRICTED</span>
                </div>

                <div className="threat-zone-quicklist">
                  {displayedZones.map((zone) => {
                    const isSelected = activeZone?.id === zone.id;
                    return (
                      <div
                        key={zone.id}
                        className={`threat-zone-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectZone(zone)}
                      >
                        <div className="chip-left">
                          <span className="chip-bullet-red" />
                          <div className="chip-info">
                            <span className="chip-id">{zone.id}</span>
                            <span className="chip-name">{zone.name}</span>
                          </div>
                        </div>
                        <div className="chip-meta">
                          <span className="chip-detour">+{zone.detourImpactMinutes}m</span>
                          <span className="chip-risk">{zone.riskFactor}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Threat Card Details */}
                {activeZone && (
                  <div className="selected-threat-dossier">
                    <div className="dossier-headline">
                      <div>
                        <h4>{activeZone.name}</h4>
                        <div className="dossier-coords">
                          {activeZone.lat.toFixed(1)}° N, {activeZone.lon.toFixed(1)}° E · {activeZone.radiusKm} km radius
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="inspect-btn-red"
                        onClick={() => setModalZone(activeZone)}
                      >
                        <Eye size={12} className="mr-1" /> Dossier
                      </Button>
                    </div>

                    <div className="dossier-grid">
                      <div className="dossier-cell">
                        <small>ALTITUDE</small>
                        <strong>{activeZone.altitude}</strong>
                      </div>
                      <div className="dossier-cell">
                        <small>NOTAM REF</small>
                        <code>{activeZone.notamReference}</code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. 3D Tactical Globe View */}
        {(activeTab === 'globe' || activeTab === 'dual') && (
          <div className="globe-canvas-card">
            <div className="globe-header-overlay">
              <div className="globe-tag">
                <Globe size={14} />
                <span>3D TACTICAL AIRSPACE GLOBE // RED THREAT RADAR</span>
              </div>
              <div className="globe-quick-controls">
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`ctrl-btn ${autoRotate ? 'active' : ''}`}
                  title="Toggle Auto-Rotation"
                >
                  {autoRotate ? <Pause size={13} /> : <Play size={13} />}
                  <span>{autoRotate ? 'Pause' : 'Spin'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGlobeZoom((z) => Math.min(2.5, z * 1.25))}
                  className="ctrl-btn"
                  title="Zoom In Globe"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setGlobeZoom((z) => Math.max(0.65, z * 0.8))}
                  className="ctrl-btn"
                  title="Zoom Out Globe"
                >
                  <ZoomOut size={13} />
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              className="globe-canvas"
              onMouseDown={(e) => {
                isDraggingGlobe.current = true;
                dragStartGlobe.current = {x: e.clientX, y: e.clientY};
              }}
              onMouseMove={(e) => {
                if (!isDraggingGlobe.current) return;
                const dx = e.clientX - dragStartGlobe.current.x;
                const dy = e.clientY - dragStartGlobe.current.y;
                dragStartGlobe.current = {x: e.clientX, y: e.clientY};
                rotationRef.current.y += dx * 0.5;
                rotationRef.current.x = Math.max(-1.2, Math.min(1.2, rotationRef.current.x + dy * 0.005));
              }}
              onMouseUp={() => {
                isDraggingGlobe.current = false;
              }}
              onMouseLeave={() => {
                isDraggingGlobe.current = false;
              }}
            />
          </div>
        )}
      </div>

      {/* Comprehensive Intelligence Modal for Selected Zone */}
      {modalZone && (
        <Dialog open={!!modalZone} onOpenChange={(open) => !open && setModalZone(null)}>
          <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl">
            <div className="p-6 bg-slate-900 text-white relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-red-600 text-white">
                  {modalZone.status}
                </span>
                <span className="text-xs text-slate-400 font-mono">NOTAM: {modalZone.notamReference}</span>
              </div>
              <DialogTitle className="text-xl font-bold text-white mb-1">{modalZone.name}</DialogTitle>
              <DialogDescription className="text-sm text-slate-300">
                Geopolitical threat evaluation, commercial aviation diversion corridors, and airspace restriction data.
              </DialogDescription>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <small className="block text-[10px] font-bold uppercase text-slate-500 mb-1">FIR AFFECTED</small>
                  <strong className="text-xs text-slate-900 font-mono">{modalZone.firCode}</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <small className="block text-[10px] font-bold uppercase text-slate-500 mb-1">FLIGHT DETOUR</small>
                  <strong className="text-xs text-red-600 font-bold">+{modalZone.detourImpactMinutes} min</strong>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <small className="block text-[10px] font-bold uppercase text-slate-500 mb-1">RISK INDEX</small>
                  <strong className="text-xs text-red-600 font-bold">{modalZone.riskFactor} / 100</strong>
                </div>
              </div>

              <div className="space-y-1">
                <h5 className="text-xs font-bold uppercase text-slate-700">Restricted Altitudes</h5>
                <p className="text-sm text-slate-600 bg-red-50/50 p-2.5 rounded-lg border border-red-100 font-mono text-xs">
                  {modalZone.altitude}
                </p>
              </div>

              <div className="space-y-1">
                <h5 className="text-xs font-bold uppercase text-slate-700">Geopolitical Threat Vector & Rationale</h5>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {modalZone.rationale}
                </p>
              </div>

              <div className="space-y-1">
                <h5 className="text-xs font-bold uppercase text-slate-700">Standing Date & Lineage</h5>
                <p className="text-xs text-slate-500">
                  Effective from {modalZone.effectiveDate}. Continuous satellite surveillance and real-time civil aviation
                  notices updated hourly.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalZone(null)}>
                Dismiss
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  focusOnTheatre(modalZone.lat, modalZone.lon, 7, modalZone.id);
                  setModalZone(null);
                }}
              >
                <MapPin size={13} className="mr-1.5" /> Center on Google Map
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
