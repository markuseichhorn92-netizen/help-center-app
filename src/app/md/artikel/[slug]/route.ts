import { getArticleBySlug, getCategories } from '@/lib/help/data';
import { articleMarkdown, articleUrl } from '@/lib/help/seo';

export const revalidate = 60;

export async function generateStaticParams() {
  return []; // On-Demand-ISR wie die Artikelseiten
}

// Erreichbar als /artikel/<slug>.md (Rewrite in next.config.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) return new Response('Artikel nicht gefunden\n', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  const cat = (await getCategories()).find((c) => c.id === a.category);
  return new Response(articleMarkdown(a, cat), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=600',
      link: `<${articleUrl(a)}>; rel="canonical"`,
    },
  });
}
