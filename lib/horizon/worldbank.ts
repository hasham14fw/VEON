/**
 * World Bank Open Data REST API Client for HORIZON-1440
 * Free public data: https://api.worldbank.org/v2/
 * No API key required.
 */

export interface WorldBankIndicator {
  id: string;
  code: string;
  name: string;
  category: 'Macro Economy' | 'Telecom & Digital' | 'Trade & Debt' | 'Inflation & Monetary';
  unit: string;
  latestValue: number | null;
  latestYear: string;
  previousValue: number | null;
  previousYear: string;
  changePct: number | null;
  trend: 'up' | 'down' | 'flat';
  status: 'Healthy' | 'Caution' | 'Severe';
  description: string;
  history: {
    year: string;
    value: number;
  }[];
}

export interface WorldBankCountryData {
  countryCode: string;
  countryName: string;
  lastUpdated: string;
  indicators: WorldBankIndicator[];
  summary: {
    gdpGrowth: number | null;
    inflationRate: number | null;
    mobileSubsPer100: number | null;
    externalDebtBillions: number | null;
    currentAccountPctGdp: number | null;
  };
}

export const COUNTRY_MAPPINGS: Record<string, { iso2: string; iso3: string; name: string }> = {
  Pakistan: { iso2: 'PK', iso3: 'PAK', name: 'Pakistan' },
  Ukraine: { iso2: 'UA', iso3: 'UKR', name: 'Ukraine' },
  Kazakhstan: { iso2: 'KZ', iso3: 'KAZ', name: 'Kazakhstan' },
  Uzbekistan: { iso2: 'UZ', iso3: 'UZB', name: 'Uzbekistan' },
  Bangladesh: { iso2: 'BD', iso3: 'BGD', name: 'Bangladesh' },
  Global: { iso2: '1W', iso3: 'WLD', name: 'World' },
  'All markets': { iso2: 'PK', iso3: 'PAK', name: 'Pakistan' },
};

export const TRACKED_INDICATORS = [
  {
    code: 'NY.GDP.MKTP.KD.ZG',
    name: 'Real GDP Growth',
    category: 'Macro Economy' as const,
    unit: '% Annual',
    description: 'Annual percentage growth rate of GDP at market prices based on constant local currency.',
  },
  {
    code: 'FP.CPI.TOTL.ZG',
    name: 'Inflation (Consumer Prices)',
    category: 'Inflation & Monetary' as const,
    unit: '% Annual',
    description: 'Annual percentage change in the cost to the average consumer of acquiring a basket of goods.',
  },
  {
    code: 'IT.CEL.SETS.P2',
    name: 'Mobile Cellular Subscriptions',
    category: 'Telecom & Digital' as const,
    unit: 'Per 100 people',
    description: 'Subscriptions to a public mobile telephone service that provide access to the PSTN using cellular technology.',
  },
  {
    code: 'BN.CAB.XOKA.GD.ZS',
    name: 'Current Account Balance',
    category: 'Trade & Debt' as const,
    unit: '% of GDP',
    description: 'Current account balance is the sum of net exports of goods and services, net primary income, and net secondary income.',
  },
  {
    code: 'BX.KLT.DINV.WD.GD.ZS',
    name: 'Foreign Direct Investment (FDI)',
    category: 'Macro Economy' as const,
    unit: '% of GDP',
    description: 'Net inflows of investment to acquire a lasting management interest in an enterprise operating in an economy other than that of the investor.',
  },
  {
    code: 'DT.DOD.DECT.CD',
    name: 'External Debt Stocks',
    category: 'Trade & Debt' as const,
    unit: 'Billion USD',
    description: 'Total external debt is debt owed to nonresidents repayable in currency, goods, or services.',
  },
  {
    code: 'FR.INR.RINR',
    name: 'Real Interest Rate',
    category: 'Inflation & Monetary' as const,
    unit: '%',
    description: 'Lending interest rate adjusted for inflation as measured by the GDP deflator.',
  },
  {
    code: 'SL.UEM.TOTL.ZS',
    name: 'Unemployment Rate',
    category: 'Macro Economy' as const,
    unit: '% of Labor Force',
    description: 'Share of the labor force that is without work but available for and seeking employment.',
  },
];

// In-memory cache to maintain high responsiveness
const wbCache = new Map<string, { data: WorldBankCountryData; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour (World Bank annual data updates periodically)

export async function fetchWorldBankData(market: string = 'Pakistan'): Promise<WorldBankCountryData> {
  const mapping = COUNTRY_MAPPINGS[market] || COUNTRY_MAPPINGS['Pakistan'];
  const cacheKey = `wb:${mapping.iso3}`;
  const now = Date.now();
  const cached = wbCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const indicatorResults: WorldBankIndicator[] = [];

  // Query indicators concurrently
  await Promise.all(
    TRACKED_INDICATORS.map(async (ind) => {
      try {
        const url = `https://api.worldbank.org/v2/country/${mapping.iso3}/indicator/${ind.code}?format=json&per_page=12`;
        const res = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (Array.isArray(json) && json.length > 1 && Array.isArray(json[1])) {
          const rawEntries = json[1] as Array<{ date: string; value: number | null }>;
          
          // Filter valid values
          const validHistory = rawEntries
            .filter((e) => e.value !== null && !isNaN(e.value))
            .map((e) => ({
              year: e.date,
              value: ind.code === 'DT.DOD.DECT.CD' ? Number((e.value! / 1e9).toFixed(2)) : Number(e.value!.toFixed(2)),
            }))
            .sort((a, b) => Number(a.year) - Number(b.year)); // ascending for charts

          const latest = validHistory[validHistory.length - 1] || null;
          const prev = validHistory[validHistory.length - 2] || null;

          let changePct: number | null = null;
          let trend: 'up' | 'down' | 'flat' = 'flat';

          if (latest && prev && prev.value !== 0) {
            changePct = Number((((latest.value - prev.value) / Math.abs(prev.value)) * 100).toFixed(1));
            trend = changePct > 0.5 ? 'up' : changePct < -0.5 ? 'down' : 'flat';
          }

          // Compute risk status
          let status: 'Healthy' | 'Caution' | 'Severe' = 'Healthy';
          if (ind.code === 'FP.CPI.TOTL.ZG') {
            // Inflation
            if (latest && latest.value > 20) status = 'Severe';
            else if (latest && latest.value > 10) status = 'Caution';
          } else if (ind.code === 'NY.GDP.MKTP.KD.ZG') {
            // GDP growth
            if (latest && latest.value < 0) status = 'Severe';
            else if (latest && latest.value < 2) status = 'Caution';
          } else if (ind.code === 'BN.CAB.XOKA.GD.ZS') {
            // Current account deficit
            if (latest && latest.value < -5) status = 'Severe';
            else if (latest && latest.value < -2.5) status = 'Caution';
          }

          indicatorResults.push({
            id: ind.code,
            code: ind.code,
            name: ind.name,
            category: ind.category,
            unit: ind.unit,
            latestValue: latest ? latest.value : null,
            latestYear: latest ? latest.year : 'N/A',
            previousValue: prev ? prev.value : null,
            previousYear: prev ? prev.year : 'N/A',
            changePct,
            trend,
            status,
            description: ind.description,
            history: validHistory,
          });
        }
      } catch (err) {
        console.error(`Error fetching WB indicator ${ind.code} for ${mapping.iso3}:`, err);
      }
    })
  );

  // Quick lookup helpers for summary
  const getIndVal = (code: string) => indicatorResults.find((i) => i.code === code)?.latestValue ?? null;

  const result: WorldBankCountryData = {
    countryCode: mapping.iso3,
    countryName: mapping.name,
    lastUpdated: new Date().toISOString(),
    indicators: indicatorResults,
    summary: {
      gdpGrowth: getIndVal('NY.GDP.MKTP.KD.ZG'),
      inflationRate: getIndVal('FP.CPI.TOTL.ZG'),
      mobileSubsPer100: getIndVal('IT.CEL.SETS.P2'),
      externalDebtBillions: getIndVal('DT.DOD.DECT.CD'),
      currentAccountPctGdp: getIndVal('BN.CAB.XOKA.GD.ZS'),
    },
  };

  wbCache.set(cacheKey, { data: result, timestamp: now });
  return result;
}
