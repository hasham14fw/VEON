import {fetchLiveGdeltIntelligence} from '@/lib/horizon/gdelt';
import {actor, mutationGuard} from '@/lib/horizon/auth';
import {audit} from '@/lib/horizon/storage';
import {database} from '@/db/store';
import {situationSchema, type Situation} from '@/lib/situations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const market = url.searchParams.get('market') || 'All markets';
    const driver = url.searchParams.get('driver') || undefined;

    const feed = await fetchLiveGdeltIntelligence(market);

    let filteredArticles = feed.articles;
    if (driver && driver !== 'All drivers') {
      filteredArticles = filteredArticles.filter((a) => a.driver === driver);
    }

    return Response.json({
      ok: true,
      data: {
        ...feed,
        articles: filteredArticles,
      },
      asOf: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return Response.json(
      {
        ok: false,
        error: (err as Error).message || 'Failed to fetch GDELT geopolitical intelligence',
      },
      {status: 500}
    );
  }
}

/**
 * POST /api/gdelt: Attach a verified GDELT event directly to a Situation as external evidence
 */
export async function POST(request: Request) {
  try {
    mutationGuard(request);
    const who = actor(request);
    const body = (await request.json().catch(() => ({}))) as {
      situationId: string;
      article: {
        title: string;
        url: string;
        domain?: string;
        publishedAt?: string;
      };
    };

    if (!body.situationId || !body.article || !body.article.title || !body.article.url) {
      return Response.json(
        {error: 'Situation ID, article title, and verified article URL are required.'},
        {status: 400}
      );
    }

    const db = database();
    const existing = await db
      .prepare('SELECT data, updated FROM situations WHERE id = ?')
      .bind(body.situationId)
      .first<{data: string; updated: string}>();

    if (!existing) {
      return Response.json({error: 'Situation not found.'}, {status: 404});
    }

    const situation = JSON.parse(existing.data) as Situation;
    const nowIso = new Date().toISOString();

    // Check if already attached
    const exists = situation.sources.some((s) => s.url === body.article.url);
    if (!exists) {
      situation.sources.push({
        title: `[GDELT] ${body.article.title} (${body.article.domain || 'Global Press'})`,
        url: body.article.url,
        date: (body.article.publishedAt || nowIso).slice(0, 10),
      });
      situation.illustrative = false; // Validated by real-world source
      situation.updated = nowIso;

      // Update database
      await db
        .prepare('UPDATE situations SET data = ?, updated = ? WHERE id = ?')
        .bind(JSON.stringify(situation), nowIso, situation.id)
        .run();

      // Log into immutable audit trail
      await audit(
        'gdelt_evidence_attached',
        situation.id,
        {
          articleTitle: body.article.title,
          sourceUrl: body.article.url,
          domain: body.article.domain,
          attachedBy: who,
          timestamp: nowIso,
        },
        who
      );
    }

    return Response.json({
      ok: true,
      message: 'GDELT intelligence article successfully attached as verified source evidence.',
      situation,
    });
  } catch (err: unknown) {
    return Response.json(
      {error: (err as Error).message || 'Failed to attach GDELT intelligence evidence'},
      {status: 500}
    );
  }
}
