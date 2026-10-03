import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import ts from 'typescript';

// Transpile worldbank & fred modules for Node execution
mkdirSync(new URL('../.sites-runtime/tests', import.meta.url), { recursive: true });

function transpileModule(path, outPath) {
  const code = readFileSync(new URL(path, import.meta.url), 'utf8');
  const out = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  writeFileSync(new URL(outPath, import.meta.url), out);
}

transpileModule('../lib/horizon/worldbank.ts', '../.sites-runtime/tests/worldbank.mjs');
transpileModule('../lib/horizon/fred.ts', '../.sites-runtime/tests/fred.mjs');

const { fetchWorldBankData, COUNTRY_MAPPINGS, TRACKED_INDICATORS } = await import(
  '../.sites-runtime/tests/worldbank.mjs'
);
const { fetchFredData, FRED_SERIES_CONFIG } = await import(
  '../.sites-runtime/tests/fred.mjs'
);

test('World Bank client maps all 5 VEON operating markets plus Global', () => {
  assert(COUNTRY_MAPPINGS['Pakistan']);
  assert.equal(COUNTRY_MAPPINGS['Pakistan'].iso3, 'PAK');
  assert(COUNTRY_MAPPINGS['Ukraine']);
  assert.equal(COUNTRY_MAPPINGS['Ukraine'].iso3, 'UKR');
  assert(COUNTRY_MAPPINGS['Kazakhstan']);
  assert.equal(COUNTRY_MAPPINGS['Kazakhstan'].iso3, 'KAZ');
  assert(COUNTRY_MAPPINGS['Uzbekistan']);
  assert.equal(COUNTRY_MAPPINGS['Uzbekistan'].iso3, 'UZB');
  assert(COUNTRY_MAPPINGS['Bangladesh']);
  assert.equal(COUNTRY_MAPPINGS['Bangladesh'].iso3, 'BGD');
  assert(COUNTRY_MAPPINGS['Global']);
});

test('World Bank fetches live sovereign development indicators for Pakistan', async () => {
  const result = await fetchWorldBankData('Pakistan');
  assert.equal(result.countryCode, 'PAK');
  assert.equal(result.countryName, 'Pakistan');
  assert(result.indicators.length > 0, 'Must have indicators');
  
  // Find GDP indicator
  const gdp = result.indicators.find(i => i.code === 'NY.GDP.MKTP.KD.ZG');
  assert(gdp, 'Must have Real GDP growth indicator');
  assert.equal(typeof gdp.latestValue, 'number');
  assert(gdp.history.length > 0, 'Must have historical observation points');

  // Find Mobile subscription indicator
  const mobile = result.indicators.find(i => i.code === 'IT.CEL.SETS.P2');
  assert(mobile, 'Must have Mobile Cellular Subscriptions indicator');
  assert.equal(typeof mobile.latestValue, 'number');
  assert(mobile.latestValue > 50, 'Pakistan mobile subscriptions per 100 people should be realistic (> 50)');
});

test('FRED client has 6 configured benchmark macro indicators', () => {
  assert.equal(FRED_SERIES_CONFIG.length, 6);
  const ids = FRED_SERIES_CONFIG.map(c => c.id);
  assert(ids.includes('DGS10'), 'Must track US 10Y Yield');
  assert(ids.includes('DCOILBRENTEU'), 'Must track Brent Crude');
  assert(ids.includes('DTWEXBGS'), 'Must track US Dollar Index');
  assert(ids.includes('FEDFUNDS'), 'Must track Fed Funds Rate');
  assert(ids.includes('T10Y2Y'), 'Must track Yield Curve Spread');
  assert(ids.includes('BAMLH0A0HYM2'), 'Must track High Yield Spread');
});

test('FRED fetches live observation series and computes delta', async () => {
  const report = await fetchFredData();
  assert(report.series.length > 0, 'Must return FRED series');
  assert(report.summary, 'Must contain summary');
  
  const tenYear = report.series.find(s => s.seriesId === 'DGS10');
  assert(tenYear, 'Must have DGS10 series');
  assert.equal(typeof tenYear.latestValue, 'number');
  assert(tenYear.latestValue > 0, '10Y Yield must be positive');
  assert(tenYear.observations.length > 0, 'Must contain time series observations');
  assert.equal(typeof tenYear.delta, 'number');
});
