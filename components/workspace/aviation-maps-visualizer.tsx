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
  ZoomIn,
  ZoomOut,
  MapPin,
  ChevronRight,
  Eye,
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
  altShort: string;
  altFactor: number;
  notamReference: string;
  rationale: string;
  detourImpactMinutes: number;
  effectiveDate: string;
  riskFactor: number;
  rangeBounds: {
    latMin: number;
    latMax: number;
    lonMin: number;
    lonMax: number;
    label: string;
  };
  boundaryPoints: Array<{lat: number; lon: number}>;
}

// Pre-parse sovereign country polygons for 3D Globe visualization
// Accurate sovereign airspace boundaries to prevent map distortion and false zone overlaps
export const IRAN_SOVEREIGN_AIRSPACE: Array<{lat: number; lon: number}> = [
  // Northwest (Azerbaijan/Armenia/Turkey border)
  {lat: 38.4, lon: 48.9},
  {lat: 38.9, lon: 45.6},
  {lat: 39.7, lon: 44.6},
  {lat: 38.5, lon: 44.3},
  {lat: 37.5, lon: 44.8},
  {lat: 36.3, lon: 45.4},
  {lat: 35.3, lon: 46.0},
  {lat: 34.3, lon: 45.6},
  {lat: 33.1, lon: 46.2},
  {lat: 32.2, lon: 47.4},
  {lat: 31.0, lon: 47.7},
  {lat: 30.0, lon: 48.5},
  // Northern Persian Gulf shoreline (Strictly North of Persian Gulf - Over 150km North of Dubai/UAE)
  {lat: 29.9, lon: 50.1},
  {lat: 28.9, lon: 50.8},
  {lat: 27.8, lon: 52.1},
  {lat: 27.5, lon: 52.6},
  {lat: 26.9, lon: 53.6},
  {lat: 26.5, lon: 54.8},
  {lat: 27.1, lon: 56.3}, // Bandar Abbas / North of Strait of Hormuz
  {lat: 26.8, lon: 57.0},
  {lat: 25.6, lon: 57.8}, // Jask (Gulf of Oman north coast)
  {lat: 25.4, lon: 59.2},
  {lat: 25.3, lon: 60.6}, // Chabahar
  {lat: 25.1, lon: 61.6}, // Gwadar Bay border
  // East Border (Pakistan & Afghanistan)
  {lat: 26.5, lon: 62.3},
  {lat: 27.8, lon: 62.4},
  {lat: 29.0, lon: 61.5},
  {lat: 30.8, lon: 61.8},
  {lat: 31.9, lon: 60.9},
  {lat: 34.7, lon: 60.8},
  {lat: 35.6, lon: 61.1},
  // Northeast & North (Turkmenistan border & Caspian Sea)
  {lat: 36.5, lon: 61.2},
  {lat: 37.5, lon: 58.6},
  {lat: 37.8, lon: 56.5},
  {lat: 37.4, lon: 54.5},
  {lat: 36.9, lon: 54.0},
  {lat: 36.7, lon: 52.6},
  {lat: 36.8, lon: 50.8},
  {lat: 37.5, lon: 49.5},
];

export const AFGHANISTAN_SOVEREIGN_AIRSPACE: Array<{lat: number; lon: number}> = [
  {lat: 35.6, lon: 61.2},
  {lat: 36.5, lon: 65.0},
  {lat: 37.2, lon: 67.3},
  {lat: 37.5, lon: 69.5},
  {lat: 37.0, lon: 71.5},
  {lat: 38.4, lon: 73.5},
  {lat: 37.1, lon: 74.9},
  {lat: 36.0, lon: 71.8},
  {lat: 34.5, lon: 71.1},
  {lat: 33.7, lon: 70.0},
  {lat: 32.5, lon: 69.3},
  {lat: 31.5, lon: 66.8},
  {lat: 30.5, lon: 66.3},
  {lat: 29.5, lon: 64.2},
  {lat: 29.4, lon: 61.8},
  {lat: 30.8, lon: 61.8},
  {lat: 31.9, lon: 60.9},
  {lat: 34.7, lon: 60.8},
];

export const UAE_SOVEREIGN_TERRITORY: Array<{lat: number; lon: number}> = [
  {lat: 24.12, lon: 51.75},
  {lat: 24.11, lon: 52.73},
  {lat: 24.08, lon: 53.65},
  {lat: 24.47, lon: 54.37},
  {lat: 25.20, lon: 55.27}, // Dubai
  {lat: 25.40, lon: 55.45},
  {lat: 25.79, lon: 55.95},
  {lat: 26.02, lon: 56.08},
  {lat: 25.61, lon: 56.28},
  {lat: 25.03, lon: 56.36},
  {lat: 24.21, lon: 55.76},
  {lat: 22.70, lon: 55.20},
  {lat: 22.85, lon: 53.80},
  {lat: 24.00, lon: 51.60},
];

interface CountryPoly {
  name: string;
  isVeonMarket: boolean;
  polygons: Array<Array<{lat: number; lon: number}>>;
}

const PARSED_COUNTRIES: CountryPoly[] = (world as Array<{name: string; d: string}>).map((c) => {
  if (c.name === 'Iran') {
    return {
      name: 'Iran',
      isVeonMarket: false,
      polygons: [IRAN_SOVEREIGN_AIRSPACE],
    };
  }
  if (c.name === 'Afghanistan') {
    return {
      name: 'Afghanistan',
      isVeonMarket: false,
      polygons: [AFGHANISTAN_SOVEREIGN_AIRSPACE],
    };
  }
  if (c.name === 'United Arab Emirates') {
    return {
      name: 'United Arab Emirates',
      isVeonMarket: false,
      polygons: [UAE_SOVEREIGN_TERRITORY],
    };
  }
  return {
    name: c.name,
    isVeonMarket: ['Ukraine', 'Kazakhstan', 'Uzbekistan', 'Pakistan', 'Bangladesh'].includes(c.name),
    polygons: c.d
      .split('Z')
      .filter(Boolean)
      .map((sub) =>
        sub
          .split(/[ML]/)
          .filter(Boolean)
          .map((p) => {
            const [x, y] = p.split(',').map(Number);
            return {
              lat: 90 - (y * 180) / 300,
              lon: x / 2 - 180,
            };
          })
      ),
  };
});

// Helper to extract sovereign border points for No-Fly Zone boundaries
function getCountryBoundary(countryName: string): Array<{lat: number; lon: number}> {
  const found = PARSED_COUNTRIES.find((c) => c.name === countryName);
  return found && found.polygons.length > 0 ? found.polygons[0] : [];
}

// Named Seas and Oceans for 3D Globe Visualization
export const WORLD_SEAS = [
  {name: 'Atlantic Ocean', lat: 26.0, lon: -40.0},
  {name: 'South Atlantic', lat: -22.0, lon: -18.0},
  {name: 'Pacific Ocean', lat: 18.0, lon: -155.0},
  {name: 'Indian Ocean', lat: -12.0, lon: 74.0},
  {name: 'Arctic Ocean', lat: 82.0, lon: 0.0},
  {name: 'Black Sea', lat: 43.5, lon: 34.5},
  {name: 'Mediterranean Sea', lat: 35.5, lon: 18.0},
  {name: 'Caspian Sea', lat: 42.0, lon: 51.0},
  {name: 'Red Sea', lat: 21.0, lon: 38.0},
  {name: 'Persian Gulf', lat: 26.5, lon: 52.0},
  {name: 'Arabian Sea', lat: 15.0, lon: 64.0},
  {name: 'Bay of Bengal', lat: 15.0, lon: 88.0},
  {name: 'South China Sea', lat: 12.0, lon: 114.0},
  {name: 'Baltic Sea', lat: 58.0, lon: 20.0},
  {name: 'North Sea', lat: 56.0, lon: 3.5},
];

// Major Countries, States and Regional Hubs for 3D Globe Visualization
export interface RegionItem {
  name: string;
  lat: number;
  lon: number;
  isMarket?: boolean;
  isCity?: boolean;
  isOpenAirspace?: boolean;
}

export const MAJOR_COUNTRIES_AND_STATES: RegionItem[] = [
  {name: 'Ukraine', lat: 49.0, lon: 31.3, isMarket: true},
  {name: 'Kyiv', lat: 50.45, lon: 30.52, isCity: true},
  {name: 'Odesa', lat: 46.48, lon: 30.73, isCity: true},
  {name: 'Lviv', lat: 49.84, lon: 24.03, isCity: true},
  {name: 'Kazakhstan', lat: 48.0, lon: 66.9, isMarket: true},
  {name: 'Astana', lat: 51.16, lon: 71.43, isCity: true},
  {name: 'Almaty', lat: 43.25, lon: 76.95, isCity: true},
  {name: 'Uzbekistan', lat: 41.37, lon: 64.58, isMarket: true},
  {name: 'Tashkent', lat: 41.31, lon: 69.28, isCity: true},
  {name: 'Pakistan', lat: 30.37, lon: 69.34, isMarket: true},
  {name: 'Islamabad', lat: 33.72, lon: 73.06, isCity: true},
  {name: 'Karachi', lat: 24.86, lon: 67.01, isCity: true},
  {name: 'Lahore', lat: 31.55, lon: 74.36, isCity: true},
  {name: 'Bangladesh', lat: 23.68, lon: 90.35, isMarket: true},
  {name: 'Dhaka', lat: 23.81, lon: 90.41, isCity: true},
  {name: 'United Kingdom', lat: 55.37, lon: -3.43},
  {name: 'Germany', lat: 51.16, lon: 10.45},
  {name: 'France', lat: 46.22, lon: 2.21},
  {name: 'Poland', lat: 51.91, lon: 19.14},
  {name: 'Turkey', lat: 38.96, lon: 35.24},
  {name: 'Saudi Arabia', lat: 23.88, lon: 45.07},
  {name: 'United Arab Emirates', lat: 24.4, lon: 54.3},
  {name: 'Dubai', lat: 25.2, lon: 55.27, isCity: true, isOpenAirspace: true},
  {name: 'Iran', lat: 32.42, lon: 53.68},
  {name: 'India', lat: 20.59, lon: 78.96},
  {name: 'China', lat: 35.86, lon: 104.19},
  {name: 'United States', lat: 37.09, lon: -95.71},
  {name: 'Canada', lat: 56.13, lon: -106.34},
  {name: 'Brazil', lat: -14.23, lon: -51.92},
  {name: 'South Africa', lat: -30.55, lon: 22.93},
  {name: 'Egypt', lat: 26.82, lon: 30.8},
  {name: 'Japan', lat: 36.2, lon: 138.25},
  {name: 'Australia', lat: -25.27, lon: 133.77},
];

// 7 Active Geopolitical No-Fly Zones with Proper Multi-Point Boundaries (RED) and Altitude Ceilings (ORANGE)
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
    altShort: 'SFC – UNL',
    altFactor: 0.08,
    notamReference: 'EASA CZIB-2022-01R8 / ICAO NOTAM A0422/22',
    rationale:
      'Active military conflict, hostile surface-to-air missile threat, electronic jamming. Complete civil aviation prohibition.',
    detourImpactMinutes: 145,
    effectiveDate: '2022-02-24 (Active)',
    riskFactor: 98,
    rangeBounds: {
      latMin: 44.3,
      latMax: 52.4,
      lonMin: 22.1,
      lonMax: 40.2,
      label: '44.3°N – 52.4°N · 22.1°E – 40.2°E',
    },
    boundaryPoints: getCountryBoundary('Ukraine'),
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
    altitude: 'SFC – UNL (Surface to Unlimited)',
    altShort: 'SFC – UNL',
    altFactor: 0.075,
    notamReference: 'ICAO EUR Bulletin / Romanian CAA Adv',
    rationale:
      'Naval combat missile testing, anti-ship ballistic operations, severe GPS spoofing across international maritime airspace.',
    detourImpactMinutes: 55,
    effectiveDate: '2022-03-01 (Active)',
    riskFactor: 90,
    rangeBounds: {
      latMin: 41.0,
      latMax: 46.5,
      lonMin: 27.5,
      lonMax: 41.5,
      label: '41.0°N – 46.5°N · 27.5°E – 41.5°E',
    },
    boundaryPoints: [
      {lat: 46.5, lon: 30.7},
      {lat: 46.6, lon: 32.5},
      {lat: 45.3, lon: 36.5},
      {lat: 44.7, lon: 37.8},
      {lat: 43.5, lon: 39.8},
      {lat: 41.6, lon: 41.6},
      {lat: 41.0, lon: 39.7},
      {lat: 42.0, lon: 35.1},
      {lat: 41.2, lon: 29.0},
      {lat: 42.5, lon: 27.5},
      {lat: 44.2, lon: 28.7},
      {lat: 45.4, lon: 29.8},
    ],
  },
  {
    id: 'NFZ-IR-01',
    name: 'Middle East & Persian Gulf Transit Corridor',
    firCode: 'OIIX (Tehran FIR)',
    lat: 32.4,
    lon: 53.6,
    radiusKm: 580,
    market: 'Global',
    status: 'Restricted Corridor',
    severity: 'Critical',
    altitude: 'Prohibited Below FL320',
    altShort: 'BELOW FL320',
    altFactor: 0.055,
    notamReference: 'FAA KICZ NOTAM A0012/26 / EASA Alert',
    rationale:
      'Elevated ballistic and drone strike threat vectors in Tehran FIR (OIIX). Sovereign UAE and Dubai (OMAE) airspace is completely open and operates normal international arrivals and departures.',
    detourImpactMinutes: 65,
    effectiveDate: '2024-04-14 (Updated Sep 2026)',
    riskFactor: 86,
    rangeBounds: {
      latMin: 25.1,
      latMax: 39.7,
      lonMin: 44.0,
      lonMax: 63.3,
      label: '25.1°N – 39.7°N · 44.0°E – 63.3°E (Tehran FIR · Excludes Open UAE/Dubai)',
    },
    boundaryPoints: IRAN_SOVEREIGN_AIRSPACE,
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
    altShort: 'BELOW FL320',
    altFactor: 0.05,
    notamReference: 'FAA SFAR 115 / EASA Conflict Bulletin',
    rationale:
      'Total absence of civil air traffic control radar and emergency ground intervention. Flights to Tashkent bypass Kabul FIR.',
    detourImpactMinutes: 45,
    effectiveDate: '2021-08-18 (Standing Advisory)',
    riskFactor: 72,
    rangeBounds: {
      latMin: 29.4,
      latMax: 38.5,
      lonMin: 60.5,
      lonMax: 74.9,
      label: '29.4°N – 38.5°N · 60.5°E – 74.9°E',
    },
    boundaryPoints: AFGHANISTAN_SOVEREIGN_AIRSPACE,
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
    altShort: 'BELOW FL280',
    altFactor: 0.045,
    notamReference: 'CAA Pakistan NOTAM C0145/26',
    rationale:
      'Cross-border military alert areas and low-level tactical air operations. Civil departures diverted via southern Karachi routes.',
    detourImpactMinutes: 35,
    effectiveDate: '2026-05-10 (Continuous Review)',
    riskFactor: 64,
    rangeBounds: {
      latMin: 30.0,
      latMax: 37.1,
      lonMin: 69.2,
      lonMax: 77.8,
      label: '30.0°N – 37.1°N · 69.2°E – 77.8°E',
    },
    boundaryPoints: [
      {lat: 36.8, lon: 74.8},
      {lat: 35.5, lon: 76.2},
      {lat: 34.6, lon: 74.8},
      {lat: 33.6, lon: 74.2},
      {lat: 32.5, lon: 74.6},
      {lat: 31.6, lon: 74.5},
      {lat: 31.5, lon: 72.8},
      {lat: 32.8, lon: 71.5},
      {lat: 34.2, lon: 71.3},
      {lat: 36.0, lon: 71.8},
    ],
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
    altitude: 'Military Operations Area (SFC – FL290)',
    altShort: 'BELOW FL290',
    altFactor: 0.045,
    notamReference: 'KazAeroNavigatsia Advisory 2026/04',
    rationale:
      'Increased radar surveillance and periodic rocket launch orbital safety corridors. Flights monitored via Atyrau transit gates.',
    detourImpactMinutes: 25,
    effectiveDate: '2026-02-15 (Periodic Review)',
    riskFactor: 58,
    rangeBounds: {
      latMin: 44.5,
      latMax: 50.0,
      lonMin: 46.5,
      lonMax: 55.0,
      label: '44.5°N – 50.0°N · 46.5°E – 55.0°E',
    },
    boundaryPoints: [
      {lat: 49.2, lon: 47.5},
      {lat: 47.8, lon: 51.5},
      {lat: 46.5, lon: 53.5},
      {lat: 44.5, lon: 51.5},
      {lat: 44.0, lon: 49.2},
      {lat: 45.2, lon: 47.6},
      {lat: 47.0, lon: 47.8},
    ],
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
    altShort: 'BELOW FL260',
    altFactor: 0.04,
    notamReference: 'CAAB Dhaka Circular A02/26',
    rationale:
      'Armed clashes and air activity along the Arakan corridor. Civil departures from Cox’s Bazar follow strict southern vectoring.',
    detourImpactMinutes: 20,
    effectiveDate: '2024-03-01 (Continuous Monitoring)',
    riskFactor: 52,
    rangeBounds: {
      latMin: 19.0,
      latMax: 24.2,
      lonMin: 89.0,
      lonMax: 94.5,
      label: '19.0°N – 24.2°N · 89.0°E – 94.5°E',
    },
    boundaryPoints: [
      {lat: 23.5, lon: 91.5},
      {lat: 21.6, lon: 92.5},
      {lat: 20.2, lon: 92.6},
      {lat: 19.5, lon: 91.0},
      {lat: 21.2, lon: 90.0},
      {lat: 22.8, lon: 91.2},
    ],
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
        const found = GEO_NO_FLY_ZONES.find((z) => Math.abs(z.lat - lat) < 1.5 && Math.abs(z.lon - lon) < 1.5);
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

  // 3D Globe Render Loop - WITH EXACT NO-FLY BOUNDARIES (RED) & ALTITUDE CEILINGS (ORANGE)
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

    // 3D Projection with Altitude Layering Support
    const projectAlt = (lat: number, lon: number, altFactor = 0) => {
      const phi = (lat * Math.PI) / 180;
      const theta = ((lon + rotationRef.current.y) * Math.PI) / 180;
      const rotX = rotationRef.current.x;

      const x0 = Math.cos(phi) * Math.sin(theta);
      const y0 = Math.sin(phi);
      const z0 = Math.cos(phi) * Math.cos(theta);

      const y1 = y0 * Math.cos(rotX) - z0 * Math.sin(rotX);
      const z1 = y0 * Math.sin(rotX) + z0 * Math.cos(rotX);

      const R = Math.min(width, height) * 0.38 * globeZoom * (1 + altFactor);
      const cx = width / 2;
      const cy = height / 2;

      if (z1 >= 0) {
        return {
          x: cx + x0 * R,
          y: cy - y1 * R,
          visible: true,
          depth: z1,
        };
      } else {
        const len = Math.hypot(x0, -y1) || 1;
        return {
          x: cx + (x0 / len) * R,
          y: cy + (-y1 / len) * R,
          visible: false,
          depth: z1,
        };
      }
    };

    const renderGlobe = () => {
      ctx.clearRect(0, 0, width, height);

      if (autoRotate && !isDraggingGlobe.current) {
        rotationRef.current.y += 0.2;
      }

      const R = Math.min(width, height) * 0.38 * globeZoom;
      const cx = width / 2;
      const cy = height / 2;

      // 1. Deep Space Backdrop with Stars
      ctx.fillStyle = '#050B14';
      ctx.fillRect(0, 0, width, height);

      // 2. Atmospheric Halo
      const haloGrad = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.08);
      haloGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      haloGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.15)');
      haloGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2);
      ctx.fill();

      // 3. Globe Sphere Disk Clipping
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      // 4. Oceans & Seas Deep Water Gradient
      const oceanGrad = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
      oceanGrad.addColorStop(0, '#0F3057');
      oceanGrad.addColorStop(0.55, '#0B2545');
      oceanGrad.addColorStop(0.85, '#071A31');
      oceanGrad.addColorStop(1, '#040F1E');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      // 5. Graticule Latitude/Longitude Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let drawn = false;
        for (let lon = -180; lon <= 180; lon += 4) {
          const pt = projectAlt(lat, lon, 0);
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

      // 6. PROPER VISUALIZATION OF COUNTRIES, STATES & SOVEREIGN BORDERS
      for (const country of PARSED_COUNTRIES) {
        const isMarket = country.isVeonMarket;

        for (const poly of country.polygons) {
          let hasVisible = false;
          for (let i = 0; i < poly.length; i += 3) {
            if (projectAlt(poly[i].lat, poly[i].lon, 0).visible) {
              hasVisible = true;
              break;
            }
          }
          if (!hasVisible) continue;

          ctx.beginPath();
          poly.forEach((pt, idx) => {
            const p = projectAlt(pt.lat, pt.lon, 0);
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();

          // Fill Sovereign Landmass
          if (isMarket) {
            ctx.fillStyle = 'rgba(2, 132, 199, 0.85)';
          } else {
            ctx.fillStyle = 'rgba(28, 52, 40, 0.88)';
          }
          ctx.fill();

          // Stroke Sovereign Country Borders
          ctx.strokeStyle = isMarket ? '#38BDF8' : 'rgba(148, 163, 184, 0.45)';
          ctx.lineWidth = isMarket ? 1.6 : 0.65;
          ctx.stroke();
        }
      }

      // 7. PROPER VISUALIZATION OF SEAS & OCEANS
      for (const sea of WORLD_SEAS) {
        const sp = projectAlt(sea.lat, sea.lon, 0);
        if (sp.visible && sp.depth > 0.2) {
          ctx.fillStyle = 'rgba(186, 230, 253, 0.8)';
          ctx.font = 'italic 10.5px Inter, sans-serif';
          ctx.fillText(sea.name, sp.x - 24, sp.y);
        }
      }

      // 8. PROPER VISUALIZATION OF COUNTRIES, STATES & CITIES
      for (const item of MAJOR_COUNTRIES_AND_STATES) {
        const cp = projectAlt(item.lat, item.lon, 0);
        if (cp.visible && cp.depth > 0.22) {
          if (item.isOpenAirspace) {
            // Prominent Green Marker for Open Airspace Hub (Dubai DXB)
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#10B981';
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glow / Pulse Ring
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 7.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Open Airspace Status Tag
            const tag = 'Dubai (DXB) · AIRSPACE OPEN';
            ctx.font = 'bold 9.5px Inter, sans-serif';
            const tagW = ctx.measureText(tag).width;

            ctx.fillStyle = 'rgba(6, 78, 59, 0.9)';
            ctx.strokeStyle = '#10B981';
            ctx.lineWidth = 1;
            ctx.fillRect(cp.x + 8, cp.y - 12, tagW + 8, 15);
            ctx.strokeRect(cp.x + 8, cp.y - 12, tagW + 8, 15);

            ctx.fillStyle = '#6EE7B7';
            ctx.fillText(tag, cp.x + 12, cp.y - 1);
          } else if (item.isCity) {
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = item.isMarket ? '#FACC15' : '#FFFFFF';
            ctx.fill();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(item.name, cp.x + 5, cp.y + 3);
          } else {
            ctx.fillStyle = item.isMarket ? '#38BDF8' : '#E2E8F0';
            ctx.font = item.isMarket ? 'bold 11px Inter, sans-serif' : '10px Inter, sans-serif';
            ctx.fillText(item.name, cp.x - 16, cp.y - 4);
          }
        }
      }

      // 9. PROPER BOUNDARIES FOR NO-FLY ZONES (RED) & ALTITUDE RESTRICTIONS (ORANGE)
      displayedZones.forEach((zone) => {
        const pts = zone.boundaryPoints;
        if (!pts || pts.length === 0) return;

        const isSelected = selectedZone?.id === zone.id;

        // Check if any point in the zone boundary is facing the camera
        let anyVisible = false;
        for (let i = 0; i < pts.length; i += 2) {
          if (projectAlt(pts[i].lat, pts[i].lon, 0).visible) {
            anyVisible = true;
            break;
          }
        }
        if (!anyVisible) return;

        // A. SURFACE NO-FLY BOUNDARY IN RED
        ctx.beginPath();
        pts.forEach((pt, idx) => {
          const pGnd = projectAlt(pt.lat, pt.lon, 0);
          if (idx === 0) ctx.moveTo(pGnd.x, pGnd.y);
          else ctx.lineTo(pGnd.x, pGnd.y);
        });
        ctx.closePath();
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = isSelected ? 3.4 : 2.0;
        ctx.stroke();
        ctx.fillStyle = isSelected ? 'rgba(220, 38, 38, 0.42)' : 'rgba(220, 38, 38, 0.22)';
        ctx.fill();

        // B. ALTITUDE RESTRICTION CEILING BOUNDARY IN ORANGE
        ctx.beginPath();
        pts.forEach((pt, idx) => {
          const pCeil = projectAlt(pt.lat, pt.lon, zone.altFactor);
          if (idx === 0) ctx.moveTo(pCeil.x, pCeil.y);
          else ctx.lineTo(pCeil.x, pCeil.y);
        });
        ctx.closePath();
        ctx.strokeStyle = '#EA580C';
        ctx.lineWidth = isSelected ? 2.6 : 1.6;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = isSelected ? 'rgba(249, 115, 22, 0.25)' : 'rgba(249, 115, 22, 0.12)';
        ctx.fill();

        // C. VERTICAL 3D AIRSPACE WALL PILLARS (CONNECTING RED GROUND TO ORANGE ALTITUDE)
        const step = Math.max(1, Math.floor(pts.length / 8));
        for (let i = 0; i < pts.length; i += step) {
          const pGnd = projectAlt(pts[i].lat, pts[i].lon, 0);
          const pCeil = projectAlt(pts[i].lat, pts[i].lon, zone.altFactor);
          if (pGnd.visible || pCeil.visible) {
            ctx.beginPath();
            ctx.moveTo(pGnd.x, pGnd.y);
            ctx.lineTo(pCeil.x, pCeil.y);
            ctx.strokeStyle = '#F97316';
            ctx.lineWidth = 1.3;
            ctx.stroke();
          }
        }

        // D. ELEVATED ORANGE ALTITUDE RESTRICTION TAG
        const pCenterCeil = projectAlt(zone.lat, zone.lon, zone.altFactor);
        if (pCenterCeil.visible && pCenterCeil.depth > 0.12) {
          const altText = `ALT: ${zone.altShort}`;
          ctx.font = 'bold 9.5px monospace';
          const txtW = ctx.measureText(altText).width;

          ctx.fillStyle = 'rgba(255, 247, 237, 0.95)';
          ctx.strokeStyle = '#FDBA74';
          ctx.lineWidth = 1;
          ctx.fillRect(pCenterCeil.x - txtW / 2 - 5, pCenterCeil.y - 18, txtW + 10, 15);
          ctx.strokeRect(pCenterCeil.x - txtW / 2 - 5, pCenterCeil.y - 18, txtW + 10, 15);

          ctx.fillStyle = '#EA580C';
          ctx.fillText(altText, pCenterCeil.x - txtW / 2, pCenterCeil.y - 7);
        }

        // E. GROUND RED NO-FLY ZONE BADGE
        const pCenterGnd = projectAlt(zone.lat, zone.lon, 0);
        if (pCenterGnd.visible && pCenterGnd.depth > 0.12) {
          const idText = `${zone.id}`;
          ctx.font = 'bold 10px monospace';
          const txtW = ctx.measureText(idText).width;

          ctx.fillStyle = '#DC2626';
          ctx.fillRect(pCenterGnd.x - txtW / 2 - 5, pCenterGnd.y - 7, txtW + 10, 14);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(idText, pCenterGnd.x - txtW / 2, pCenterGnd.y + 4);
        }
      });

      // 10. Sphere Specular Light & 3D Curvature Gloss
      const glossGrad = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.45, R * 0.1, cx, cy, R);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      glossGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');
      glossGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.15)');
      glossGrad.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = glossGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // Restore from globe disk clipping

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
          className="theatre-open-hub"
          onClick={() => focusOnTheatre(25.2, 55.27, 7)}
          title="Dubai International (DXB) - Open Airspace Civil Hub"
        >
          🟢 Dubai (DXB · Open)
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

      {/* Main Display Area: Clean Google Map (NO OVERLAPPING HUDs) */}
      <div className={`maps-viewport-layout layout-${activeTab}`}>
        {/* 1. Official Google Maps View */}
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

            {/* Google Map Embedded Frame - Completely Unobstructed */}
            <div className="google-map-embed-wrapper">
              <iframe
                src={`https://maps.google.com/maps?q=${searchTarget}&t=${googleMapType}&z=${googleZoom}&output=embed`}
                className="google-maps-iframe"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps Tactical Airspace Intelligence"
              />
            </div>

            {/* Map Status Bar showing active range border */}
            {activeZone && (
              <div className="map-bottom-status-strip">
                <div className="status-strip-left">
                  <span className="status-dot-red" />
                  <span className="status-label">ACTIVE SECTOR:</span>
                  <strong className="status-title">{activeZone.name}</strong>
                  <span className="status-altitude-tag">
                    <ShieldAlert size={12} className="inline mr-1" />
                    ALTITUDE: {activeZone.altitude}
                  </span>
                </div>
                <div className="status-strip-right">
                  <span className="status-range-border">
                    BORDER OF RANGE: <code>{activeZone.rangeBounds.label}</code>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. 3D Tactical Globe View - Proper Boundaries for No-Fly Zones (RED) & Altitude Restrictions (ORANGE) */}
        {(activeTab === 'globe' || activeTab === 'dual') && (
          <div className="globe-canvas-card">
            <div className="globe-header-overlay">
              <div className="globe-tag">
                <Globe size={14} />
                <span>3D GLOBE // SOVEREIGN NO-FLY BORDERS (RED) & ALTITUDE CEILINGS (ORANGE)</span>
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

      {/* DEDICATED ACTIVE NO-FLY ZONES (RED) SECTION - PLACED DIRECTLY BELOW THE MAP */}
      <section className="active-no-fly-zones-section">
        <div className="zones-section-header">
          <div className="zones-header-title-wrap">
            <span className="red-pulse-indicator" />
            <div>
              <h2>ACTIVE NO-FLY ZONES (RED)</h2>
              <p>
                Sovereign conflict airspace boundaries showing exact border of ranges and restricted flight altitudes.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge-altitude-orange">
              <ShieldAlert size={12} className="inline mr-1" />
              ALTITUDE RESTRICTIONS: ORANGE
            </span>
            <span className="hud-badge-red">7 RESTRICTED CORRIDORS</span>
          </div>
        </div>

        {/* Grid of All 7 Active No-Fly Zones */}
        <div className="no-fly-zones-grid">
          {displayedZones.map((zone) => {
            const isSelected = activeZone?.id === zone.id;
            return (
              <div
                key={zone.id}
                className={`zone-range-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectZone(zone)}
              >
                {/* Card Header */}
                <div className="zone-card-top">
                  <div className="flex items-center gap-2">
                    <span className="zone-id-tag">{zone.id}</span>
                    <span className="zone-status-pill">{zone.status}</span>
                  </div>
                  <span className="zone-risk-score">RISK {zone.riskFactor}%</span>
                </div>

                {/* Zone Title */}
                <h3 className="zone-card-title">{zone.name}</h3>

                {/* BORDER OF RANGE (RED) */}
                <div className="range-border-container">
                  <div className="range-border-header">
                    <span className="range-border-tag">BORDER OF RANGE (RED)</span>
                    <span className="range-radius-tag">{zone.radiusKm} km radius</span>
                  </div>
                  <div className="range-coords-value">{zone.rangeBounds.label}</div>
                  <div className="range-center-coords">
                    Center: {zone.lat.toFixed(1)}° N, {zone.lon.toFixed(1)}° E
                  </div>
                </div>

                {/* ALTITUDE RESTRICTIONS (ORANGE) */}
                <div className="altitude-orange-box">
                  <div className="altitude-box-title">
                    <ShieldAlert size={13} className="text-orange-600 inline" />
                    <span>ALTITUDE RESTRICTION</span>
                  </div>
                  <div className="altitude-box-value">{zone.altitude}</div>
                </div>

                {/* Operational Details */}
                <div className="zone-card-footer-info">
                  <div className="info-cell">
                    <small>FIR CORRIDOR</small>
                    <code>{zone.firCode}</code>
                  </div>
                  <div className="info-cell">
                    <small>FLIGHT DETOUR</small>
                    <strong className="text-red-600">+{zone.detourImpactMinutes} min</strong>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="zone-card-actions">
                  <Button
                    size="sm"
                    className="zone-center-map-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      focusOnTheatre(zone.lat, zone.lon, 6, zone.id);
                      window.scrollTo({top: 0, behavior: 'smooth'});
                    }}
                  >
                    <MapPin size={12} className="mr-1" /> Center Map
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="zone-dossier-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalZone(zone);
                    }}
                  >
                    <Eye size={12} className="mr-1" /> NOTAM Dossier
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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

              {/* BORDER OF RANGE IN MODAL (RED) */}
              <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl space-y-1">
                <h5 className="text-[11px] font-bold uppercase text-red-700 tracking-wider">
                  BORDER OF RANGE (COORDINATES)
                </h5>
                <div className="text-sm font-bold text-slate-900 font-mono">{modalZone.rangeBounds.label}</div>
                <small className="text-xs text-slate-600 block">
                  Perimeter Envelope: {modalZone.radiusKm} km radius centered at {modalZone.lat.toFixed(2)}° N,{' '}
                  {modalZone.lon.toFixed(2)}° E
                </small>
              </div>

              {/* ALTITUDE RESTRICTION IN MODAL (ORANGE) */}
              <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-orange-700 tracking-wider">
                  <ShieldAlert size={14} className="text-orange-600" />
                  RESTRICTED ALTITUDES (ORANGE)
                </div>
                <p className="text-sm font-bold text-orange-900 font-mono">{modalZone.altitude}</p>
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
                  window.scrollTo({top: 0, behavior: 'smooth'});
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
