import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import ts from 'typescript';

// Transpile gdelt module for Node execution
const gdeltText = readFileSync(new URL('../lib/horizon/gdelt.ts', import.meta.url), 'utf8');
mkdirSync(new URL('../.sites-runtime/tests', import.meta.url), {recursive: true});

const transpiled = ts.transpileModule(gdeltText, {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;

writeFileSync(new URL('../.sites-runtime/tests/gdelt.mjs', import.meta.url), transpiled);

const {
  BENCHMARK_GDELT_EVENTS,
  fetchLiveGdeltIntelligence,
} = await import('../.sites-runtime/tests/gdelt.mjs');

test('GDELT baseline events cover all VEON operating markets and Global scope', () => {
  assert(BENCHMARK_GDELT_EVENTS.length >= 7, 'Must have at least 7 baseline events');
  const markets = ['Ukraine', 'Pakistan', 'Kazakhstan', 'Uzbekistan', 'Bangladesh', 'Global'];
  for (const m of markets) {
    const found = BENCHMARK_GDELT_EVENTS.find((e) => e.market === m);
    assert(found, `Missing benchmark GDELT event for ${m}`);
    assert(found.title, `Event for ${m} must have title`);
    assert(found.url, `Event for ${m} must have valid URL`);
    assert(typeof found.toneScore === 'number', `Event for ${m} must have numeric toneScore`);
    assert(found.driver, `Event for ${m} must have assigned risk driver`);
    assert(found.threatLevel, `Event for ${m} must have threatLevel`);
  }
});

test('GDELT fetch returns structured intelligence with summary metrics', async () => {
  const result = await fetchLiveGdeltIntelligence('All markets');
  assert.equal(result.ok, true);
  assert(result.articles.length >= 7);
  assert(result.summary);
  assert.equal(typeof result.summary.totalEvents, 'number');
  assert.equal(typeof result.summary.averageTone, 'number');
  assert(['Elevated', 'Active Watch', 'Stable'].includes(result.summary.status));
});

test('GDELT market filtering isolates target market events', async () => {
  const ukraineResult = await fetchLiveGdeltIntelligence('Ukraine');
  assert.equal(ukraineResult.ok, true);
  assert.equal(ukraineResult.market, 'Ukraine');
  assert(ukraineResult.articles.length > 0);
  for (const art of ukraineResult.articles) {
    assert(
      art.market === 'Ukraine' || art.market === 'Global',
      `Unexpected market ${art.market} in Ukraine query`
    );
  }
});

test('GDELT tone scores properly correlate with threat classifications', () => {
  for (const e of BENCHMARK_GDELT_EVENTS) {
    if (e.threatLevel === 'Critical') {
      assert(e.toneScore <= -2.5, 'Critical threat must have negative sentiment tone');
    }
    assert(e.relevanceScore >= 70, 'Benchmark events must have high relevance score');
  }
});
