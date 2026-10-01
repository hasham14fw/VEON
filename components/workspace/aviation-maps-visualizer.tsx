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
  svgX: number;
  svgY: number;
  radiusSvg: number;
}

// Convert Lat/Lon to SVG viewBox (720 x 300) equirectangular coordinates
function geoToSvg(lat: number, lon: number) {
  const x = Math.round((((lon + 180) % 360) * 2) * 10) / 10;
  const y = Math.round(((90 - lat) * (300 / 180)) * 10) / 10;
  return {x, y, svgX: x, svgY: y};
}

// 7 Active No-Fly Zones with strict RED threat color scheme
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
    effectiveDate: '2026-01-15 (Periodic activation)',
    riskFactor: 52,
    ...geoToSvg(47.1, 51.9),
    radiusSvg: 17,
  },
  {
    id: 'NFZ-BD-01',
    name: 'Bay of Bengal & Myanmar Border Buffer',
    firCode: 'VGHS (Dhaka) / VYYY (Yangon Buffer)',
    lat: 21.5,
    lon: 92.2,
    radiusKm: 260,
    market: 'Bangladesh',
    status: 'Active Advisory',
    severity: 'Elevated',
    altitude: 'Below FL260 Advisory',
    notamReference: 'CAAB NOTAM A0112/26',
    rationale:
      'Rakhine state border hostilities. Civil traffic transiting Cox’s Bazar instructed to maintain Oceanic corridor waypoints.',
    detourImpactMinutes: 20,
    effectiveDate: '2024-02-15 (Monitored)',
    riskFactor: 48,
    ...geoToSvg(21.5, 92.2),
    radiusSvg: 13,
  },
];

// Proper Countries & Cities like Google Maps
export const WORLD_CITIES = [
  // Ukraine
  {name: 'Kyiv', country: 'Ukraine', lat: 50.45, lon: 30.52, type: 'capital', market: 'Ukraine'},
  {name: 'Kharkiv', country: 'Ukraine', lat: 49.99, lon: 36.23, type: 'major', market: 'Ukraine'},
  {name: 'Odesa', country: 'Ukraine', lat: 46.48, lon: 30.72, type: 'major', market: 'Ukraine'},
  {name: 'Lviv', country: 'Ukraine', lat: 49.84, lon: 24.03, type: 'major', market: 'Ukraine'},
  {name: 'Dnipro', country: 'Ukraine', lat: 48.46, lon: 35.04, type: 'major', market: 'Ukraine'},

  // Kazakhstan
  {name: 'Astana', country: 'Kazakhstan', lat: 51.17, lon: 71.45, type: 'capital', market: 'Kazakhstan'},
  {name: 'Almaty', country: 'Kazakhstan', lat: 43.22, lon: 76.85, type: 'major', market: 'Kazakhstan'},
  {name: 'Shymkent', country: 'Kazakhstan', lat: 42.34, lon: 69.6, type: 'major', market: 'Kazakhstan'},
  {name: 'Aktau', country: 'Kazakhstan', lat: 43.65, lon: 51.17, type: 'major', market: 'Kazakhstan'},
  {name: 'Atyrau', country: 'Kazakhstan', lat: 47.12, lon: 51.88, type: 'major', market: 'Kazakhstan'},

  // Uzbekistan
  {name: 'Tashkent', country: 'Uzbekistan', lat: 41.3, lon: 69.24, type: 'capital', market: 'Uzbekistan'},
  {name: 'Samarkand', country: 'Uzbekistan', lat: 39.63, lon: 66.97, type: 'major', market: 'Uzbekistan'},
  {name: 'Bukhara', country: 'Uzbekistan', lat: 39.77, lon: 64.42, type: 'major', market: 'Uzbekistan'},
  {name: 'Namangan', country: 'Uzbekistan', lat: 40.99, lon: 71.67, type: 'major', market: 'Uzbekistan'},

  // Pakistan
  {name: 'Islamabad', country: 'Pakistan', lat: 33.68, lon: 73.05, type: 'capital', market: 'Pakistan'},
  {name: 'Lahore', country: 'Pakistan', lat: 31.52, lon: 74.36, type: 'major', market: 'Pakistan'},
  {name: 'Karachi', country: 'Pakistan', lat: 24.86, lon: 67.0, type: 'major', market: 'Pakistan'},
  {name: 'Rawalpindi', country: 'Pakistan', lat: 33.6, lon: 73.04, type: 'major', market: 'Pakistan'},
  {name: 'Peshawar', country: 'Pakistan', lat: 34.02, lon: 71.52, type: 'major', market: 'Pakistan'},
  {name: 'Quetta', country: 'Pakistan', lat: 30.18, lon: 66.98, type: 'major', market: 'Pakistan'},

  // Bangladesh
  {name: 'Dhaka', country: 'Bangladesh', lat: 23.81, lon: 90.41, type: 'capital', market: 'Bangladesh'},
  {name: 'Chittagong', country: 'Bangladesh', lat: 22.36, lon: 91.78, type: 'major', market: 'Bangladesh'},
  {name: 'Sylhet', country: 'Bangladesh', lat: 24.89, lon: 91.87, type: 'major', market: 'Bangladesh'},
  {name: 'Khulna', country: 'Bangladesh', lat: 22.84, lon: 89.54, type: 'major', market: 'Bangladesh'},

  // Key Strategic & Regional Hubs
  {name: 'Dubai', country: 'UAE', lat: 25.2, lon: 55.27, type: 'major'},
  {name: 'Abu Dhabi', country: 'UAE', lat: 24.45, lon: 54.38, type: 'capital'},
  {name: 'Doha', country: 'Qatar', lat: 25.29, lon: 51.53, type: 'capital'},
  {name: 'Riyadh', country: 'Saudi Arabia', lat: 24.71, lon: 46.68, type: 'capital'},
  {name: 'Tehran', country: 'Iran', lat: 35.69, lon: 51.39, type: 'capital'},
  {name: 'Kabul', country: 'Afghanistan', lat: 34.56, lon: 69.21, type: 'capital'},
  {name: 'Istanbul', country: 'Turkiye', lat: 41.01, lon: 28.98, type: 'major'},
  {name: 'Ankara', country: 'Turkiye', lat: 39.93, lon: 32.86, type: 'capital'},
  {name: 'Baku', country: 'Azerbaijan', lat: 40.41, lon: 49.87, type: 'capital'},
  {name: 'Tbilisi', country: 'Georgia', lat: 41.72, lon: 44.79, type: 'capital'},
  {name: 'Yerevan', country: 'Armenia', lat: 40.18, lon: 44.51, type: 'capital'},
  {name: 'New Delhi', country: 'India', lat: 28.61, lon: 77.21, type: 'capital'},
  {name: 'Mumbai', country: 'India', lat: 19.08, lon: 72.88, type: 'major'},
  {name: 'London', country: 'UK', lat: 51.51, lon: -0.13, type: 'capital'},
  {name: 'Warsaw', country: 'Poland', lat: 52.23, lon: 21.01, type: 'capital'},
  {name: 'Frankfurt', country: 'Germany', lat: 50.11, lon: 8.68, type: 'major'},
  {name: 'Singapore', country: 'Singapore', lat: 1.35, lon: 103.82, type: 'capital'},
].map((city) => ({
  ...city,
  ...geoToSvg(city.lat, city.lon),
}));

// Flight corridors with detour waypoints
export const FLIGHT_CORRIDORS = [
  {
    id: 'FL-LHR-TAS',
    flightNumber: 'HY 202',
    airline: 'Uzbekistan Airways',
    from: 'London LHR',
    to: 'Tashkent TAS',
    detourMin: 110,
    avoidedZone: 'Ukraine & Black Sea',
    points: [
      geoToSvg(51.5, -0.4),
      geoToSvg(46.0, 14.5),
      geoToSvg(41.0, 29.0),
      geoToSvg(41.5, 44.0),
      geoToSvg(40.0, 53.0),
      geoToSvg(41.2, 69.2),
    ],
  },
  {
    id: 'FL-DXB-ISB',
    flightNumber: 'EK 614',
    airline: 'Emirates',
    from: 'Dubai DXB',
    to: 'Islamabad ISB',
    detourMin: 45,
    avoidedZone: 'Iran & Afghan Corridor',
    points: [
      geoToSvg(25.2, 55.3),
      geoToSvg(23.5, 60.0),
      geoToSvg(24.8, 67.0),
      geoToSvg(29.5, 71.0),
      geoToSvg(33.6, 72.8),
    ],
  },
  {
    id: 'FL-ALA-IST',
    flightNumber: 'KC 901',
    airline: 'Air Astana',
    from: 'Almaty ALA',
    to: 'Istanbul IST',
    detourMin: 85,
    avoidedZone: 'Black Sea Exclusion Zone',
    points: [
      geoToSvg(43.3, 76.9),
      geoToSvg(44.0, 65.0),
      geoToSvg(43.5, 52.0),
      geoToSvg(41.5, 48.0),
      geoToSvg(41.0, 36.0),
      geoToSvg(41.2, 28.7),
    ],
  },
];

export function AviationMapsVisualizer({w, market}: {w: Work; market?: string}) {
  const [activeTab, setActiveTab] = useState<'map' | 'globe' | 'dual'>('map');
  const [selectedZone, setSelectedZone] = useState<AviationZoneGeo | null>(null);
  const [showFlightRoutes, setShowFlightRoutes] = useState(true);
  const [showCities, setShowCities] = useState(true);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  // Map Zoom & Pan State (Centered initially on Eurasia / VEON Operating Corridor)
  // Base SVG viewBox: width=720, height=300
  const [zoom, setZoom] = useState(2.2);
  const [center, setCenter] = useState({x: 460, y: 105}); // Centered over Ukraine/Caspian/Pakistan
  const isDraggingMap = useRef(false);
  const dragStartPos = useRef({x: 0, y: 0});
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Compute current dynamic SVG ViewBox
  const currentViewBox = useMemo(() => {
    const w = 720 / zoom;
    const h = 300 / zoom;
    const minX = Math.max(0, Math.min(720 - w, center.x - w / 2));
    const minY = Math.max(0, Math.min(300 - h, center.y - h / 2));
    return `${minX} ${minY} ${w} ${h}`;
  }, [zoom, center]);

  // Mouse Wheel Zoom In / Out on Cursor Pass
  const handleMapWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = mapContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseFracX = (e.clientX - rect.left) / rect.width;
    const mouseFracY = (e.clientY - rect.top) / rect.height;

    const zoomDelta = e.deltaY < 0 ? 1.25 : 0.8;
    setZoom((prevZoom) => {
      const nextZoom = Math.max(1, Math.min(8.5, prevZoom * zoomDelta));

      // Re-center around cursor point
      setCenter((prevCenter) => {
        if (nextZoom === 1) return {x: 360, y: 150};
        const prevW = 720 / prevZoom;
        const prevH = 300 / prevZoom;
        const cursorSvgX = prevCenter.x - prevW / 2 + mouseFracX * prevW;
        const cursorSvgY = prevCenter.y - prevH / 2 + mouseFracY * prevH;

        const nextW = 720 / nextZoom;
        const nextH = 300 / nextZoom;
        const nextCenterX = cursorSvgX + (0.5 - mouseFracX) * nextW;
        const nextCenterY = cursorSvgY + (0.5 - mouseFracY) * nextH;

        return {
          x: Math.max(nextW / 2, Math.min(720 - nextW / 2, nextCenterX)),
          y: Math.max(nextH / 2, Math.min(300 - nextH / 2, nextCenterY)),
        };
      });

      return nextZoom;
    });
  };

  // Map Drag-to-Pan Handlers
  const handleMapMouseDown = (e: React.MouseEvent) => {
    isDraggingMap.current = true;
    dragStartPos.current = {x: e.clientX, y: e.clientY};
  };

  const handleMapMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMap.current) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    dragStartPos.current = {x: e.clientX, y: e.clientY};

    const container = mapContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    // Map screen pixel delta to SVG coordinate delta
    const svgDeltaX = (dx / rect.width) * (720 / zoom);
    const svgDeltaY = (dy / rect.height) * (300 / zoom);

    setCenter((prev) => {
      const w = 720 / zoom;
      const h = 300 / zoom;
      return {
        x: Math.max(w / 2, Math.min(720 - w / 2, prev.x - svgDeltaX)),
        y: Math.max(h / 2, Math.min(300 - h / 2, prev.y - svgDeltaY)),
      };
    });
  };

  const handleMapMouseUp = () => {
    isDraggingMap.current = false;
  };

  // Focus on Specific Regional Theatre
  const focusOnTheatre = useCallback((lat: number, lon: number, zoomLevel = 3.6) => {
    const pt = geoToSvg(lat, lon);
    setCenter(pt);
    setZoom(zoomLevel);

    // Also orient 3D Globe
    rotationRef.current = {
      x: (lat * Math.PI) / 180,
      y: -lon,
    };
    setGlobeZoom(1.35);
  }, []);

  // 3D Globe Render Loop with Glowing Red No-Fly Zones
  useEffect(() => {
    if (activeTab === 'map') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let pulsePhase = 0;

    const renderGlobe = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const R = Math.min(width, height) * 0.42 * globeZoom;

      if (autoRotate && !isDraggingGlobe.current) {
        rotationRef.current.y += 0.25;
      }
      pulsePhase += 0.045;

      const rotX = rotationRef.current.x;
      const rotY = (rotationRef.current.y * Math.PI) / 180;

      // 1. Atmosphere Radial Glow
      const atmoGrad = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.25);
      atmoGrad.addColorStop(0, 'rgba(239, 68, 68, 0.22)');
      atmoGrad.addColorStop(0.5, 'rgba(2, 132, 199, 0.1)');
      atmoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = atmoGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // 2. Base Earth Sphere
      const oceanGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
      oceanGrad.addColorStop(0, '#1E293B');
      oceanGrad.addColorStop(0.65, '#0F172A');
      oceanGrad.addColorStop(1, '#050B14');
      ctx.fillStyle = oceanGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Glowing Sphere Border
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3D Projection Helper
      const project = (latDeg: number, lonDeg: number) => {
        const phi = (latDeg * Math.PI) / 180;
        const theta = (lonDeg * Math.PI) / 180 + rotY;
        const x3d = R * Math.cos(phi) * Math.sin(theta);
        const y3d = -R * Math.sin(phi);
        const z3d = R * Math.cos(phi) * Math.cos(theta);
        const yRot = y3d * Math.cos(rotX) - z3d * Math.sin(rotX);
        const zRot = y3d * Math.sin(rotX) + z3d * Math.cos(rotX);
        return {
          x: cx + x3d,
          y: cy + yRot,
          visible: zRot > -R * 0.05,
          depth: zRot / R,
        };
      };

      // Graticule Lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 0.8;
      for (const lat of [-60, -30, 0, 30, 60]) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 6) {
          const pt = project(lat, lon);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Draw Flight Corridors on 3D Globe
      if (showFlightRoutes) {
        FLIGHT_CORRIDORS.forEach((corr) => {
          ctx.beginPath();
          let drawn = false;
          corr.points.forEach((wp) => {
            const lon = (wp.x / 2) - 180;
            const lat = 90 - (wp.y / (300 / 180));
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
          });
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // RED NO-FLY ZONES ON 3D GLOBE
      displayedZones.forEach((zone) => {
        const pt = project(zone.lat, zone.lon);
        if (!pt.visible || pt.depth <= -0.1) return;

        const isHovered = hoveredZoneId === zone.id || selectedZone?.id === zone.id;
        const scaleFactor = Math.max(0.4, 0.6 + pt.depth * 0.5);

        // Animated Red Threat Radius Ring
        const currentPulseRadius = (16 + Math.sin(pulsePhase * 2 + zone.riskFactor) * 6) * scaleFactor;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, currentPulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = isHovered ? 2.8 : 1.5;
        ctx.fillStyle = isHovered ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.22)';
        ctx.fill();
        ctx.stroke();

        // Core Red Threat Epicenter
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5 * scaleFactor, 0, Math.PI * 2);
        ctx.fillStyle = '#DC2626';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2 * scaleFactor, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Red Zone ID Tag
        if (pt.depth > 0.2 || isHovered) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = isHovered ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
          ctx.fillText(zone.id, pt.x + 8, pt.y + 3);
        }
      });

      // Sphere Specular Gloss
      const glossGrad = ctx.createLinearGradient(cx - R * 0.8, cy - R * 0.8, cx + R * 0.4, cy + R * 0.4);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      glossGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.04)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glossGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(renderGlobe);
    };

    renderGlobe();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTab, autoRotate, globeZoom, displayedZones, showFlightRoutes, hoveredZoneId, selectedZone]);

  return (
    <div className="maps-visualizer-container">
      {/* Top Tactical Command Header */}
      <div className="maps-topbar">
        <div className="maps-title-wrap">
          <div className="maps-badge">
            <span className="radar-live-dot" />
            <span>INTERACTIVE AIRSPACE NO-FLY VISUALIZER</span>
          </div>
          <h1>Tactical Airspace Map & 3D Globe</h1>
          <p>
            High-fidelity geospatial intelligence featuring proper sovereign boundaries, cities, road networks, and
            highlighted <strong>RED exclusion zones</strong> with cursor-pass mouse-wheel zooming.
          </p>
        </div>

        {/* View Switcher: Interactive Map | 3D Globe | Dual View */}
        <div className="maps-control-cluster">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={activeTab === 'map' ? 'active' : ''}
              onClick={() => setActiveTab('map')}
            >
              <MapIcon size={15} />
              <span>Interactive Map</span>
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

          <Button
            variant="outline"
            className="theatre-btn"
            onClick={() => {
              const dataStr =
                'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(GEO_NO_FLY_ZONES, null, 2));
              const downloadAnchor = document.createElement('a');
              downloadAnchor.setAttribute('href', dataStr);
              downloadAnchor.setAttribute('download', 'VEON-NoFlyZones-Geospatial.json');
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
          >
            <FileDown size={14} />
            <span>Export Intel</span>
          </Button>
        </div>
      </div>

      {/* Regional Theatre Jump Strip */}
      <div className="theatre-quick-strip">
        <span className="theatre-label">
          <Compass size={14} /> Focus Theatre:
        </span>
        <button type="button" onClick={() => focusOnTheatre(49.0, 31.3, 4.2)}>
          🇺🇦 Ukraine Airspace Closure
        </button>
        <button type="button" onClick={() => focusOnTheatre(43.8, 34.5, 4.5)}>
          🌊 Black Sea Maritime Corridor
        </button>
        <button type="button" onClick={() => focusOnTheatre(32.4, 53.6, 3.8)}>
          🇮🇷 Persian Gulf & Iran Corridor
        </button>
        <button type="button" onClick={() => focusOnTheatre(33.9, 73.8, 4.5)}>
          🇵🇰 Pakistan LOC & Afghan FIR
        </button>
        <button type="button" onClick={() => focusOnTheatre(47.1, 51.9, 3.8)}>
          🇰🇿 Caspian & Central Asia
        </button>
        <button type="button" onClick={() => focusOnTheatre(21.5, 92.2, 5.0)}>
          🇧🇩 Bay of Bengal & Myanmar Buffer
        </button>
        <button
          type="button"
          onClick={() => {
            setCenter({x: 460, y: 105});
            setZoom(2.2);
          }}
          style={{marginLeft: 'auto', background: '#EFF6FF', color: '#0284C7', borderColor: '#BFDBFE'}}
        >
          <RotateCcw size={12} style={{display: 'inline', marginRight: '4px'}} /> Reset Overview
        </button>
      </div>

      {/* Main Display Area: Interactive Google-Maps-Style Vector Map & 3D Globe */}
      <div className={`maps-viewport-layout layout-${activeTab}`}>
        {/* 1. Real Google-Maps-Style Map with Countries, Cities & RED No-Fly Zones */}
        {(activeTab === 'map' || activeTab === 'dual') && (
          <div className="google-style-map-card">
            <div className="viewport-overlay-header">
              <div className="viewport-tag">
                <MapIcon size={14} />
                <span>GOOGLE MAPS STYLE // SCROLL MOUSE WHEEL TO ZOOM</span>
              </div>

              <div className="map-toolbar-actions">
                <button
                  type="button"
                  className={`toolbar-btn ${showCities ? 'active' : ''}`}
                  onClick={() => setShowCities(!showCities)}
                  title="Toggle City Labels"
                >
                  <MapPin size={13} />
                  <span>Cities</span>
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${showFlightRoutes ? 'active' : ''}`}
                  onClick={() => setShowFlightRoutes(!showFlightRoutes)}
                  title="Toggle Flight Deviations"
                >
                  <Plane size={13} />
                  <span>Reroutes</span>
                </button>
                <div className="zoom-btn-group">
                  <button type="button" onClick={() => setZoom((z) => Math.min(8.5, z * 1.3))} title="Zoom In">
                    <ZoomIn size={14} />
                  </button>
                  <button type="button" onClick={() => setZoom((z) => Math.max(1, z * 0.77))} title="Zoom Out">
                    <ZoomOut size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Vector Map Container with Mouse-Wheel Zooming */}
            <div
              ref={mapContainerRef}
              className="google-map-interactive-viewport"
              onWheel={handleMapWheel}
              onMouseDown={handleMapMouseDown}
              onMouseMove={handleMapMouseMove}
              onMouseUp={handleMapMouseUp}
              onMouseLeave={handleMapMouseUp}
              style={{cursor: isDraggingMap.current ? 'grabbing' : 'grab'}}
            >
              <svg
                viewBox={currentViewBox}
                className="google-style-svg-map"
                role="img"
                aria-label="Interactive world map with cities and red no fly zones"
              >
                <defs>
                  {/* Google Maps Ocean Gradient */}
                  <linearGradient id="googleOceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#CBE5F5" />
                    <stop offset="100%" stopColor="#BCE0F3" />
                  </linearGradient>

                  {/* Red Threat Hazard Hatch */}
                  <pattern
                    id="redHazardPattern"
                    width="6"
                    height="6"
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                  >
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#DC2626" strokeWidth="1.8" strokeOpacity="0.45" />
                  </pattern>

                  {/* Red Radar Radial Gradient */}
                  <radialGradient id="redRadarGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.7" />
                    <stop offset="70%" stopColor="#DC2626" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.05" />
                  </radialGradient>
                </defs>

                {/* Ocean Backdrop */}
                <rect x="0" y="0" width="720" height="300" fill="url(#googleOceanGrad)" />

                {/* Latitude & Longitude Coordinate Grid */}
                {[75, 150, 225].map((y) => (
                  <line
                    key={`h-${y}`}
                    x1="0"
                    y1={y}
                    x2="720"
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                  />
                ))}
                {[180, 360, 540].map((x) => (
                  <line
                    key={`v-${x}`}
                    x1={x}
                    y1="0"
                    x2={x}
                    y2="300"
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                  />
                ))}

                {/* Sovereign Landmass Polygons from world.json */}
                {world.map((country) => {
                  const isVeonMarket = ['Ukraine', 'Kazakhstan', 'Uzbekistan', 'Pakistan', 'Bangladesh'].includes(
                    country.name
                  );
                  return (
                    <path
                      key={country.name}
                      d={country.d}
                      fill={isVeonMarket ? '#EBF5FB' : '#FAF8F5'}
                      stroke={isVeonMarket ? '#0284C7' : '#D1D5DB'}
                      strokeWidth={isVeonMarket ? (0.9 / Math.sqrt(zoom)) : (0.45 / Math.sqrt(zoom))}
                      className="google-country-path"
                    >
                      <title>{country.name}</title>
                    </path>
                  );
                })}

                {/* Commercial Flight Detour Corridors */}
                {showFlightRoutes &&
                  FLIGHT_CORRIDORS.map((corr) => {
                    const pointsStr = corr.points.map((p) => `${p.x},${p.y}`).join(' ');
                    return (
                      <g key={corr.id} className="flight-detour-group">
                        <polyline
                          points={pointsStr}
                          fill="none"
                          stroke="#0284C7"
                          strokeWidth={1.8 / Math.sqrt(zoom)}
                          strokeDasharray={`${4 / Math.sqrt(zoom)} ${4 / Math.sqrt(zoom)}`}
                          opacity="0.85"
                        />
                        {/* Waypoints */}
                        {corr.points.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={1.8 / Math.sqrt(zoom)}
                            fill="#0284C7"
                            stroke="#FFFFFF"
                            strokeWidth={0.6 / Math.sqrt(zoom)}
                          />
                        ))}
                      </g>
                    );
                  })}

                {/* ALL NO-FLY ZONES IN BOLD VIBRANT RED */}
                {displayedZones.map((zone) => {
                  const isHovered = hoveredZoneId === zone.id || selectedZone?.id === zone.id;
                  const strokeW = (isHovered ? 2.8 : 1.6) / Math.sqrt(zoom);

                  return (
                    <g
                      key={zone.id}
                      className="red-no-fly-zone-group"
                      onClick={() => setSelectedZone(zone)}
                      onMouseEnter={() => setHoveredZoneId(zone.id)}
                      onMouseLeave={() => setHoveredZoneId(null)}
                      style={{cursor: 'pointer'}}
                    >
                      {/* 1. Main Red Hazard Exclusion Radius */}
                      <circle
                        cx={zone.svgX}
                        cy={zone.svgY}
                        r={zone.radiusSvg}
                        fill="url(#redHazardPattern)"
                        stroke="#DC2626"
                        strokeWidth={strokeW}
                        className="red-hazard-area"
                      />

                      {/* 2. Red Radial Shading Fill */}
                      <circle
                        cx={zone.svgX}
                        cy={zone.svgY}
                        r={zone.radiusSvg}
                        fill="url(#redRadarGlow)"
                        opacity={isHovered ? '0.9' : '0.6'}
                      />

                      {/* 3. Outer Red Pulsing Warning Perimeter */}
                      <circle
                        cx={zone.svgX}
                        cy={zone.svgY}
                        r={zone.radiusSvg * 1.15}
                        fill="none"
                        stroke="#EF4444"
                        strokeWidth={1 / Math.sqrt(zoom)}
                        strokeDasharray={`${3 / Math.sqrt(zoom)} ${3 / Math.sqrt(zoom)}`}
                        opacity="0.8"
                      />

                      {/* 4. Core Threat Epicenter */}
                      <circle
                        cx={zone.svgX}
                        cy={zone.svgY}
                        r={3.8 / Math.sqrt(zoom)}
                        fill="#DC2626"
                        stroke="#FFFFFF"
                        strokeWidth={1 / Math.sqrt(zoom)}
                      />

                      {/* 5. High-Contrast Red NOTAM Label Tag */}
                      <g transform={`translate(${zone.svgX}, ${zone.svgY - zone.radiusSvg - 6 / Math.sqrt(zoom)})`}>
                        <rect
                          x={-24 / Math.sqrt(zoom)}
                          y={-9 / Math.sqrt(zoom)}
                          width={48 / Math.sqrt(zoom)}
                          height={12 / Math.sqrt(zoom)}
                          rx={3 / Math.sqrt(zoom)}
                          fill="#DC2626"
                          stroke="#FFFFFF"
                          strokeWidth={0.8 / Math.sqrt(zoom)}
                        />
                        <text
                          x="0"
                          y={-1 / Math.sqrt(zoom)}
                          fill="#FFFFFF"
                          fontSize={6.5 / Math.sqrt(zoom)}
                          fontWeight="800"
                          textAnchor="middle"
                          fontFamily="Montserrat, sans-serif"
                        >
                          {zone.id}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {/* Proper World Cities with Google Maps Labels */}
                {showCities &&
                  WORLD_CITIES.map((city) => {
                    const isCapital = city.type === 'capital';
                    const markerRadius = (isCapital ? 2.5 : 1.8) / Math.sqrt(zoom);
                    const fontSize = (isCapital ? 6.2 : 5.0) / Math.sqrt(zoom);

                    return (
                      <g key={city.name} className="google-city-marker" style={{pointerEvents: 'none'}}>
                        {/* City Dot */}
                        <circle
                          cx={city.x}
                          cy={city.y}
                          r={markerRadius}
                          fill={isCapital ? '#1E293B' : '#64748B'}
                          stroke="#FFFFFF"
                          strokeWidth={0.6 / Math.sqrt(zoom)}
                        />

                        {/* City Name with Google-style white outline */}
                        <text
                          x={city.x + (isCapital ? 3.5 : 2.5) / Math.sqrt(zoom)}
                          y={city.y + (isCapital ? 2.0 : 1.5) / Math.sqrt(zoom)}
                          fontSize={fontSize}
                          fontWeight={isCapital ? '700' : '500'}
                          fill="#1E293B"
                          stroke="#FFFFFF"
                          strokeWidth={1.8 / Math.sqrt(zoom)}
                          strokeLinejoin="round"
                          paintOrder="stroke"
                          fontFamily="Inter, Roboto, sans-serif"
                        >
                          {city.name}
                        </text>
                      </g>
                    );
                  })}
              </svg>
            </div>

            {/* Bottom Legend */}
            <div className="map-bottom-legend">
              <div className="legend-item">
                <span className="legend-box red-hazard" />
                <span>
                  <strong>RED Airspace Exclusion Zone</strong> (SFC – UNL Prohibition)
                </span>
              </div>
              <div className="legend-item">
                <span className="legend-box blue-route" />
                <span>Commercial Flight Detour Waypoints</span>
              </div>
              <div className="legend-item">
                <span className="legend-box city-point" />
                <span>Capital & Frontier Cities</span>
              </div>
              <div className="legend-hint">
                <span>Pass cursor over map and scroll mouse wheel to zoom in/out anywhere</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. 3D Interactive Spinning Globe Section */}
        {(activeTab === 'globe' || activeTab === 'dual') && (
          <div className="globe-viewport-card">
            <div className="viewport-overlay-header">
              <div className="viewport-tag">
                <Globe size={14} />
                <span>3D ORTHOGRAPHIC PROJECTION</span>
              </div>
              <div className="globe-hud-controls">
                <button
                  type="button"
                  title={autoRotate ? 'Pause Rotation' : 'Auto Rotate'}
                  onClick={() => setAutoRotate(!autoRotate)}
                >
                  {autoRotate ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button
                  type="button"
                  title="Zoom In"
                  onClick={() => setGlobeZoom((z) => Math.min(2.2, z + 0.2))}
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  title="Zoom Out"
                  onClick={() => setGlobeZoom((z) => Math.max(0.7, z - 0.2))}
                >
                  <ZoomOut size={13} />
                </button>
                <button
                  type="button"
                  title="Reset Orientation"
                  onClick={() => {
                    rotationRef.current = {x: 0.35, y: -45};
                    setGlobeZoom(1);
                  }}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            <div className="globe-canvas-wrap">
              <canvas
                ref={canvasRef}
                width={700}
                height={550}
                onWheel={(e) => {
                  e.preventDefault();
                  setGlobeZoom((prev) => Math.max(0.65, Math.min(2.5, prev - e.deltaY * 0.0018)));
                }}
                onMouseDown={(e) => {
                  isDraggingGlobe.current = true;
                  dragStartGlobe.current = {x: e.clientX, y: e.clientY};
                }}
                onMouseMove={(e) => {
                  if (!isDraggingGlobe.current) return;
                  const dx = e.clientX - dragStartGlobe.current.x;
                  const dy = e.clientY - dragStartGlobe.current.y;
                  dragStartGlobe.current = {x: e.clientX, y: e.clientY};
                  rotationRef.current.y += dx * 0.4;
                  rotationRef.current.x = Math.max(-1.1, Math.min(1.1, rotationRef.current.x - dy * 0.005));
                }}
                onMouseUp={() => (isDraggingGlobe.current = false)}
                onMouseLeave={() => (isDraggingGlobe.current = false)}
                onClick={(e) => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const rect = canvas.getBoundingClientRect();
                  const mouseX = e.clientX - rect.left;
                  const mouseY = e.clientY - rect.top;
                  const width = canvas.width;
                  const height = canvas.height;
                  const cx = width / 2;
                  const cy = height / 2;
                  const R = Math.min(width, height) * 0.42 * globeZoom;
                  const rotX = rotationRef.current.x;
                  const rotY = (rotationRef.current.y * Math.PI) / 180;

                  for (const zone of displayedZones) {
                    const phi = (zone.lat * Math.PI) / 180;
                    const theta = (zone.lon * Math.PI) / 180 + rotY;
                    const x3d = R * Math.cos(phi) * Math.sin(theta);
                    const y3d = -R * Math.sin(phi);
                    const z3d = R * Math.cos(phi) * Math.cos(theta);
                    const yRot = y3d * Math.cos(rotX) - z3d * Math.sin(rotX);
                    const zRot = y3d * Math.sin(rotX) + z3d * Math.cos(rotX);

                    if (zRot > 0) {
                      const ptX = cx + x3d;
                      const ptY = cy + yRot;
                      if (Math.hypot(mouseX - ptX, mouseY - ptY) < 24) {
                        setSelectedZone(zone);
                        return;
                      }
                    }
                  }
                }}
                style={{cursor: isDraggingGlobe.current ? 'grabbing' : 'grab'}}
              />
            </div>

            <div className="globe-canvas-instructions">
              <span>Scroll mouse wheel to zoom · Drag to rotate sphere · Click red beacons for NOTAM details</span>
            </div>
          </div>
        )}
      </div>

      {/* Tactical Airspace Intelligence Matrix Cards */}
      <div className="airspace-matrix-strip">
        <div className="matrix-strip-header">
          <h3>
            <ShieldAlert size={16} style={{color: '#DC2626'}} /> Active Red No-Fly Zones ({displayedZones.length})
          </h3>
          <span>Click any zone to focus map and view official aviation safety bulletin</span>
        </div>

        <div className="zone-cards-scroll-grid">
          {displayedZones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            return (
              <div
                key={zone.id}
                className={`zone-dossier-card red-theme ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedZone(zone);
                  focusOnTheatre(zone.lat, zone.lon, 4.5);
                }}
              >
                <div className="card-top-row">
                  <span className="severity-tag red-critical">{zone.severity}</span>
                  <span className="detour-badge">+{zone.detourImpactMinutes}m detour</span>
                </div>
                <h4>{zone.name}</h4>
                <div className="card-meta-line">
                  <span className="fir-code">{zone.firCode}</span>
                  <span className="market-name">{zone.market}</span>
                </div>
                <div className="altitude-cap">
                  <strong>Altitude:</strong> {zone.altitude}
                </div>
                <p className="card-rationale">{zone.rationale}</p>
                <div className="card-footer-action">
                  <span>Focus on Map & Inspect NOTAM</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zone Detail Modal / Inspector Drawer */}
      {selectedZone && (
        <Dialog open={Boolean(selectedZone)} onOpenChange={(open) => !open && setSelectedZone(null)}>
          <DialogContent className="tactical-zone-modal">
            <div className="modal-header-banner" style={{borderTopColor: '#DC2626'}}>
              <div className="modal-title-row">
                <div>
                  <div className="modal-eyebrow">
                    <span className="modal-sev-pill red-critical">
                      {selectedZone.severity.toUpperCase()}
                    </span>
                    <span>{selectedZone.status}</span>
                  </div>
                  <DialogTitle>{selectedZone.name}</DialogTitle>
                  <DialogDescription>
                    {selectedZone.firCode} · Operational Territory: {selectedZone.market}
                  </DialogDescription>
                </div>
                <button
                  type="button"
                  className="modal-close-cross"
                  onClick={() => setSelectedZone(null)}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="modal-body-scroll">
              <div className="modal-kpi-grid">
                <div className="modal-kpi-cell">
                  <span className="cell-label">Altitude Restrictions</span>
                  <strong>{selectedZone.altitude}</strong>
                </div>
                <div className="modal-kpi-cell">
                  <span className="cell-label">Avg Commercial Detour</span>
                  <strong style={{color: '#DC2626'}}>+{selectedZone.detourImpactMinutes} min</strong>
                </div>
                <div className="modal-kpi-cell">
                  <span className="cell-label">Risk Severity Index</span>
                  <strong style={{color: '#DC2626'}}>{selectedZone.riskFactor} / 100</strong>
                </div>
                <div className="modal-kpi-cell">
                  <span className="cell-label">NOTAM Classification</span>
                  <strong>{selectedZone.notamReference}</strong>
                </div>
              </div>

              <div className="modal-detail-section">
                <h5>Operational Conflict Rationale</h5>
                <p>{selectedZone.rationale}</p>
              </div>

              <div className="modal-detail-section">
                <h5>Geospatial Coordinate Envelope</h5>
                <code>
                  {selectedZone.lat}° N, {selectedZone.lon}° E (Effective Threat Radius: {selectedZone.radiusKm} km)
                </code>
                <small>Updated via ICAO Safety Database & Regional Civil Aviation Bulletins</small>
              </div>

              <div className="modal-detail-section">
                <h5>Associated Commercial Flight Circumventions</h5>
                <div className="diversion-mini-list">
                  {FLIGHT_CORRIDORS.filter((c) => c.avoidedZone.includes(selectedZone.name)).length > 0 ? (
                    FLIGHT_CORRIDORS.filter((c) => c.avoidedZone.includes(selectedZone.name)).map((corr) => (
                      <div key={corr.id} className="mini-diversion-item">
                        <div className="diversion-head">
                          <strong>
                            {corr.flightNumber} ({corr.airline})
                          </strong>
                          <span className="delay-badge">+{corr.detourMin} min</span>
                        </div>
                        <p>
                          {corr.from} ➔ {corr.to} (Rerouted around {selectedZone.name})
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="no-flights-note">
                      Civil airlines maintain standing perimeter circumvention of at least 80 nautical miles outside
                      this sector.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer-action-bar">
              <Button variant="outline" onClick={() => setSelectedZone(null)}>
                Close Dossier
              </Button>
              <Button
                className="primary-action-btn"
                style={{background: '#DC2626'}}
                onClick={() => {
                  focusOnTheatre(selectedZone.lat, selectedZone.lon, 4.5);
                  setSelectedZone(null);
                }}
              >
                <Navigation size={14} />
                <span>Center Map on Zone</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
