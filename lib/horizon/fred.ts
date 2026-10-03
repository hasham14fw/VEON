/**
 * FRED (Federal Reserve Bank of St. Louis Economic Data) Client for HORIZON-1440
 * Direct observations endpoint via public CSV format:
 * https://fred.stlouisfed.org/graph/fredgraph.csv?id=...
 * No API key required.
 */

export interface FredObservation {
  date: string;
  value: number;
}

export interface FredSeriesData {
  seriesId: string;
  name: string;
  shortName: string;
  category: 'Monetary Policy' | 'Commodities & Energy' | 'Sovereign Yields' | 'FX & Liquidity' | 'Credit Risk';
  unit: string;
  frequency: string;
  latestDate: string;
  latestValue: number;
  previousValue: number;
  delta: number;
  deltaPct: number;
  trend: 'up' | 'down' | 'flat';
  status: 'Nominal' | 'Elevated' | 'Critical';
  macroSignificance: string;
  observations: FredObservation[];
}

export interface FredReport {
  lastUpdated: string;
  source: string;
  series: FredSeriesData[];
  summary: {
    tenYearYield: number | null;
    brentCrude: number | null;
    dollarIndex: number | null;
    fedFundsRate: number | null;
    yieldCurveSpread: number | null;
  };
}

export const FRED_SERIES_CONFIG = [
  {
    id: 'DGS10',
    name: '10-Year Treasury Constant Maturity Rate',
    shortName: 'US 10Y Yield',
    category: 'Sovereign Yields' as const,
    unit: '%',
    frequency: 'Daily',
    macroSignificance: 'Benchmark global risk-free rate; higher yields increase sovereign borrowing costs for emerging frontier markets.',
  },
  {
    id: 'DCOILBRENTEU',
    name: 'Crude Oil Prices: Brent - Europe',
    shortName: 'Brent Crude Spot',
    category: 'Commodities & Energy' as const,
    unit: 'USD / Barrel',
    frequency: 'Daily',
    macroSignificance: 'Crucial determinant of frontier import bills, energy generation costs for telecom towers, and current account pressure.',
  },
  {
    id: 'DTWEXBGS',
    name: 'Trade Weighted U.S. Dollar Index: Broad',
    shortName: 'US Dollar Index',
    category: 'FX & Liquidity' as const,
    unit: 'Index (2006=100)',
    frequency: 'Daily',
    macroSignificance: 'Measures trade-weighted USD strength. Rapid appreciation exerts severe depreciation pressure on PKR, UAH, and BDT.',
  },
  {
    id: 'FEDFUNDS',
    name: 'Federal Funds Effective Rate',
    shortName: 'Fed Funds Rate',
    category: 'Monetary Policy' as const,
    unit: '%',
    frequency: 'Monthly',
    macroSignificance: 'US benchmark policy rate governing global dollar liquidity and foreign capital flows into emerging markets.',
  },
  {
    id: 'T10Y2Y',
    name: '10-Year minus 2-Year Treasury Yield Spread',
    shortName: 'Yield Curve (10Y-2Y)',
    category: 'Sovereign Yields' as const,
    unit: '% Points',
    frequency: 'Daily',
    macroSignificance: 'Foremost leading indicator of global recession. An inverted curve (< 0) signals impending economic slowdown.',
  },
  {
    id: 'BAMLH0A0HYM2',
    name: 'ICE BofA US High Yield Index Option-Adjusted Spread',
    shortName: 'High Yield Credit Spread',
    category: 'Credit Risk' as const,
    unit: '% Points',
    frequency: 'Daily',
    macroSignificance: 'Measures risk premium demanded by investors. Spikes indicate risk-off flight from frontier and corporate debt.',
  },
];

// In-memory cache for fast response
let fredCache: { data: FredReport; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function fetchFredData(): Promise<FredReport> {
  const now = Date.now();
  if (fredCache && now - fredCache.timestamp < CACHE_TTL_MS) {
    return fredCache.data;
  }

  const seriesResults: FredSeriesData[] = [];

  await Promise.all(
    FRED_SERIES_CONFIG.map(async (cfg) => {
      try {
        const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${cfg.id}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'HORIZON-1440/1.0' }, next: { revalidate: 1800 } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const csvText = await res.text();

        const lines = csvText.trim().split('\n');
        const observations: FredObservation[] = [];

        // Parse CSV lines
        for (let i = 1; i < lines.length; i++) {
          const [date, valStr] = lines[i].split(',');
          if (date && valStr && valStr.trim() !== '.' && valStr.trim() !== '') {
            const val = parseFloat(valStr.trim());
            if (!isNaN(val)) {
              observations.push({ date: date.trim(), value: Number(val.toFixed(2)) });
            }
          }
        }

        if (observations.length > 0) {
          const latest = observations[observations.length - 1];
          const prev = observations.length > 1 ? observations[observations.length - 2] : latest;

          const delta = Number((latest.value - prev.value).toFixed(2));
          const deltaPct = prev.value !== 0 ? Number(((delta / Math.abs(prev.value)) * 100).toFixed(2)) : 0;
          const trend = delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat';

          // Status assessment
          let status: 'Nominal' | 'Elevated' | 'Critical' = 'Nominal';
          if (cfg.id === 'DCOILBRENTEU' && latest.value > 100) status = 'Critical';
          else if (cfg.id === 'DCOILBRENTEU' && latest.value > 85) status = 'Elevated';
          else if (cfg.id === 'T10Y2Y' && latest.value < 0) status = 'Critical'; // Inverted yield curve
          else if (cfg.id === 'DGS10' && latest.value > 5.0) status = 'Elevated';

          // Keep last 30 observations for fast UI rendering
          const recentObs = observations.slice(-30);

          seriesResults.push({
            seriesId: cfg.id,
            name: cfg.name,
            shortName: cfg.shortName,
            category: cfg.category,
            unit: cfg.unit,
            frequency: cfg.frequency,
            latestDate: latest.date,
            latestValue: latest.value,
            previousValue: prev.value,
            delta,
            deltaPct,
            trend,
            status,
            macroSignificance: cfg.macroSignificance,
            observations: recentObs,
          });
        }
      } catch (err) {
        console.error(`Error fetching FRED series ${cfg.id}:`, err);
      }
    })
  );

  const getLatest = (id: string) => seriesResults.find((s) => s.seriesId === id)?.latestValue ?? null;

  const report: FredReport = {
    lastUpdated: new Date().toISOString(),
    source: 'Federal Reserve Bank of St. Louis (FRED)',
    series: seriesResults,
    summary: {
      tenYearYield: getLatest('DGS10'),
      brentCrude: getLatest('DCOILBRENTEU'),
      dollarIndex: getLatest('DTWEXBGS'),
      fedFundsRate: getLatest('FEDFUNDS'),
      yieldCurveSpread: getLatest('T10Y2Y'),
    },
  };

  fredCache = { data: report, timestamp: now };
  return report;
}
