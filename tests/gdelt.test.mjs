import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import ts from 'typescript';

mkdirSync(new URL('../.sites-runtime/tests', import.meta.url), {recursive: true});

// Transpile reliefweb module for Node execution
const rwText = readFileSync(new URL('../lib/horizon/reliefweb.ts', import.meta.url), 'utf8');
const rwTranspiled = ts.transpileModule(rwText, {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText;
writeFileSync(new URL('../.sites-runtime/tests/reliefweb.mjs', import.meta.url), rwTranspiled);

// Transpile gdelt module for Node execution
const gdeltText = readFileSync(new URL('../lib/horizon/gdelt.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(gdeltText, {
  compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022},
}).outputText.replace(/from\s+['"]\.\/reliefweb['"]/g, "from './reliefweb.mjs'");

writeFileSync(new URL('../.sites-runtime/tests/gdelt.mjs', import.meta.url), transpiled);

const {
  BENCHMARK_GDELT_EVENTS,
  fetchLiveGdeltIntelligence,
  deduplicateAndMergeConflicts,
} = await import('../.sites-runtime/tests/gdelt.mjs');

const {
  fetchReliefWebReports,
  getBenchmarkReliefWebReports,
} = await import('../.sites-runtime/tests/reliefweb.mjs');

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
    assert(Array.isArray(found.sources) && found.sources.length >= 1, `Event for ${m} must have sources array`);
  }
});

test('GDELT fetch returns structured intelligence with summary metrics defaulting to Pakistan', async () => {
  const result = await fetchLiveGdeltIntelligence();
  assert.equal(result.ok, true);
  assert.equal(result.market, 'Pakistan');
  assert(result.articles.length > 0);
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

test('GDELT items have complete verifiable empirical news evidence and citations', () => {
  for (const art of BENCHMARK_GDELT_EVENTS) {
    assert(art.evidence, `Article ${art.id} must contain evidence object`);
    const ev = art.evidence;

    // Observable Fact
    assert(typeof ev.observedFact === 'string' && ev.observedFact.length >= 20, `Article ${art.id} must have detailed observedFact`);
    // Verbatim Excerpt
    assert(typeof ev.verbatimExcerpt === 'string' && ev.verbatimExcerpt.length >= 20, `Article ${art.id} must have verbatimExcerpt`);
    // Publisher & Domain
    assert(ev.publisher && ev.publisher.length > 0, `Article ${art.id} must have publisher`);
    assert(ev.sourceDomain && ev.sourceDomain.length > 0, `Article ${art.id} must have sourceDomain`);
    // Direct News URL
    assert(ev.newsUrl && ev.newsUrl.startsWith('http'), `Article ${art.id} must have direct newsUrl`);
    // Citation format
    assert(ev.citationFormat && (ev.citationFormat.includes(ev.publisher) || ev.citationFormat.includes(ev.sourceDomain)), `Article ${art.id} citation must include publisher or source domain`);
  }
});

test('Live GDELT feed items contain genuine news evidence and verifiable URLs', async () => {
  const feed = await fetchLiveGdeltIntelligence('All markets');
  assert(feed.articles.length > 0, 'Feed must return articles');
  for (const art of feed.articles) {
    assert(art.evidence, `Article ${art.id} from feed must contain evidence`);
    assert(art.evidence.observedFact, `Article ${art.id} must contain observedFact`);
    assert(art.evidence.publisher, `Article ${art.id} must contain publisher`);
    assert(art.evidence.newsUrl, `Article ${art.id} must contain newsUrl`);
    assert(art.evidence.citationFormat, `Article ${art.id} must contain citationFormat`);
    assert(Array.isArray(art.sources) && art.sources.length >= 1, `Article ${art.id} must have sources`);
  }
});

test('ReliefWeb reports are fetched and parsed accurately', async () => {
  const reports = await fetchReliefWebReports('Pakistan');
  assert(reports.length > 0, 'ReliefWeb must return reports for Pakistan');
  for (const r of reports) {
    assert(r.title, 'ReliefWeb report must have title');
    assert(r.url.startsWith('https://'), 'ReliefWeb report must have valid URL');
    assert(r.publisher, 'ReliefWeb report must have publisher');
    assert(r.sourceLinks.length >= 1, 'ReliefWeb report must have at least 1 source link');
  }
});

test('Conflict deduplication merges overlapping incidents into 1 visible conflict with multiple sources', () => {
  const sampleConflicts = [
    {
      id: 'c1',
      title: 'Torkham border crossing halted amid regional security tensions',
      url: 'https://dawn.com/news/12345',
      publishedAt: '2026-10-01T10:00:00Z',
      market: 'Pakistan',
      driver: 'Armed conflict',
      threatLevel: 'Warning',
      toneScore: -4.0,
      relevanceScore: 90,
      summary: 'Truck transit suspended at western corridor.',
      isLive: true,
      domain: 'dawn.com',
      sourcecountry: 'Pakistan',
      language: 'English',
      seendate: '20261001100000',
      evidence: {
        sourceDomain: 'dawn.com',
        publisher: 'Dawn News',
        observedFact: 'Border convoy halted at Torkham checkpoint.',
        verbatimExcerpt: 'Truck transit suspended at western corridor.',
        reportingDate: '2026-10-01',
        reportingCountry: 'Pakistan',
        newsUrl: 'https://dawn.com/news/12345',
        citationFormat: 'Dawn News (2026). Torkham border crossing halted.',
      },
      sources: [
        {
          sourceName: 'Dawn News Wire',
          url: 'https://dawn.com/news/12345',
          publisher: 'Dawn News',
          publishedAt: '2026-10-01T10:00:00Z',
          sourceType: 'National Press',
        },
      ],
    },
    {
      id: 'c2',
      title: 'UNHCR-IOM Flash Update: Torkham border crossing transit and flow monitoring',
      url: 'https://reliefweb.int/report/pakistan/torkham-update',
      publishedAt: '2026-10-01T11:00:00Z',
      market: 'Pakistan',
      driver: 'Armed conflict',
      threatLevel: 'Critical',
      toneScore: -6.0,
      relevanceScore: 95,
      summary: 'Humanitarian teams monitor Torkham border checkpoint flow.',
      isLive: true,
      domain: 'reliefweb.int',
      sourcecountry: 'Pakistan',
      language: 'English',
      seendate: '20261001110000',
      evidence: {
        sourceDomain: 'reliefweb.int',
        publisher: 'UNHCR / IOM',
        observedFact: 'Humanitarian flow monitoring at Torkham.',
        verbatimExcerpt: 'Humanitarian teams monitor Torkham border checkpoint flow.',
        reportingDate: '2026-10-01',
        reportingCountry: 'Pakistan',
        newsUrl: 'https://reliefweb.int/report/pakistan/torkham-update',
        citationFormat: 'UNHCR / IOM (2026). Torkham flow monitoring.',
      },
      sources: [
        {
          sourceName: 'UN OCHA / UNHCR / IOM ReliefWeb',
          url: 'https://reliefweb.int/report/pakistan/torkham-update',
          publisher: 'UNHCR / IOM',
          publishedAt: '2026-10-01T11:00:00Z',
          sourceType: 'UN OCHA',
        },
      ],
    },
    {
      id: 'c3',
      title: 'State Bank of Pakistan foreign exchange reserves update',
      url: 'https://tribune.com.pk/story/reserves',
      publishedAt: '2026-10-01T12:00:00Z',
      market: 'Pakistan',
      driver: 'Political & regulatory',
      threatLevel: 'Elevated',
      toneScore: 2.0,
      relevanceScore: 80,
      summary: 'Reserves remain steady at $9.4B.',
      isLive: true,
      domain: 'tribune.com.pk',
      sourcecountry: 'Pakistan',
      language: 'English',
      seendate: '20261001120000',
      evidence: {
        sourceDomain: 'tribune.com.pk',
        publisher: 'The Express Tribune',
        observedFact: 'Central bank liquid reserves reported at $9.4B.',
        verbatimExcerpt: 'Reserves remain steady at $9.4B.',
        reportingDate: '2026-10-01',
        reportingCountry: 'Pakistan',
        newsUrl: 'https://tribune.com.pk/story/reserves',
        citationFormat: 'The Express Tribune (2026). Forex reserves.',
      },
      sources: [
        {
          sourceName: 'The Express Tribune',
          url: 'https://tribune.com.pk/story/reserves',
          publisher: 'The Express Tribune',
          publishedAt: '2026-10-01T12:00:00Z',
          sourceType: 'National Press',
        },
      ],
    },
  ];

  const deduplicated = deduplicateAndMergeConflicts(sampleConflicts);

  // c1 and c2 are both about Torkham border crossing in Pakistan -> should be merged into 1 conflict!
  // c3 is an independent economic topic -> remains 1 conflict!
  assert.equal(deduplicated.length, 2, '3 raw items with 1 overlapping pair must deduplicate to 2 items');
  const torkhamConflict = deduplicated.find((c) => c.title.toLowerCase().includes('torkham'));
  assert(torkhamConflict, 'Must preserve Torkham conflict');
  assert.equal(torkhamConflict.sources.length, 2, 'Merged Torkham conflict must contain 2 source links (Dawn + UN OCHA)');
  assert(torkhamConflict.sources.some((s) => s.sourceType === 'UN OCHA'), 'Must include UN OCHA source link');
  assert(torkhamConflict.sources.some((s) => s.sourceType === 'National Press'), 'Must include Dawn News wire source link');
  assert.equal(torkhamConflict.threatLevel, 'Critical', 'Merged incident should adopt higher threat level');
});
