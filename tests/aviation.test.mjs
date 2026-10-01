import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import ts from 'typescript';

// Transpile aviation module for Node execution
const aviationText = readFileSync(new URL('../lib/horizon/aviation.ts', import.meta.url), 'utf8');
mkdirSync(new URL('../.sites-runtime/tests', import.meta.url), {recursive: true});

// Mock env import
const transpiled = ts.transpileModule(
  aviationText.replace("import {env} from './env';", "const env = { AVIATIONSTACK_API_KEY: '0c860a2636ed208c3d2ad59887a9ccef', AVIATIONSTACK_API_URL: 'http://api.aviationstack.com/v1' };"),
  {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}
).outputText;

writeFileSync(new URL('../.sites-runtime/tests/aviation.mjs', import.meta.url), transpiled);

const {
  ACTIVE_NO_FLY_ZONES,
  BENCHMARK_DEVIATIONS,
  MARKET_AIRSPACE_STATUS,
  getLiveAviationIntelligence,
} = await import('../.sites-runtime/tests/aviation.mjs');

test('Active No-Fly Zones have valid critical and warning classifications', () => {
  assert(ACTIVE_NO_FLY_ZONES.length >= 6);
  const ukraineZone = ACTIVE_NO_FLY_ZONES.find((z) => z.market === 'Ukraine');
  assert(ukraineZone, 'Ukraine No-Fly Zone must exist');
  assert.equal(ukraineZone.status, 'Total Airspace Closure');
  assert.equal(ukraineZone.severity, 'Critical');
  assert(ukraineZone.riskFactor >= 95);
  assert(ukraineZone.detourImpactMinutes >= 120);
});

test('Pakistan border buffer and Afghan FIR advisory corridors exist', () => {
  const pkZone = ACTIVE_NO_FLY_ZONES.find((z) => z.market === 'Pakistan');
  assert(pkZone, 'Pakistan buffer must exist');
  assert.equal(pkZone.status, 'Military Buffer');

  const afZone = ACTIVE_NO_FLY_ZONES.find((z) => z.id === 'NFZ-AF-01');
  assert(afZone, 'Afghan FIR zone must exist');
  assert.equal(afZone.status, 'Active Advisory');
});

test('Benchmark flight deviations contain realistic geopolitical diversions', () => {
  assert(BENCHMARK_DEVIATIONS.length >= 6);
  for (const dev of BENCHMARK_DEVIATIONS) {
    assert(dev.flightNumber, 'Flight number must be populated');
    assert(dev.airline, 'Airline must be populated');
    assert(dev.detourMinutes > 0, 'Detour overhead minutes must be positive');
    assert(dev.affectedAirspace, 'Affected airspace must be detailed');
    assert(dev.geopoliticalReason, 'Geopolitical reason must be provided');
  }
});

test('Aviation intelligence report returns properly computed summary and filters', async () => {
  const report = await getLiveAviationIntelligence('All markets');
  assert(report.summary.activeNoFlyZones >= 6);
  assert(report.summary.totalDeviationsLogged >= 6);
  assert(report.summary.avgDetourMinutes > 0);
  assert(report.summary.airspaceRiskIndex > 0);
  assert(report.flightDeviations.length >= 6);
  assert(report.noFlyZones.length >= 6);
});

test('Market filtering restricts scope accurately', async () => {
  const ukraineReport = await getLiveAviationIntelligence('Ukraine');
  assert(ukraineReport.noFlyZones.some((z) => z.market === 'Ukraine'));
  // All returned zones are either Ukraine or Global
  for (const z of ukraineReport.noFlyZones) {
    assert(z.market === 'Ukraine' || z.market === 'Global');
  }
});

test('Market airspace assessments cover all 5 VEON markets', () => {
  const required = ['Ukraine', 'Pakistan', 'Uzbekistan', 'Kazakhstan', 'Bangladesh'];
  for (const m of required) {
    assert(MARKET_AIRSPACE_STATUS[m], `Missing airspace status for ${m}`);
    assert(typeof MARKET_AIRSPACE_STATUS[m].diversionBurdenPct === 'number');
  }
});
