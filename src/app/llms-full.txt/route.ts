import { getCategories, getPublishedArticles, SITE } from '@/lib/help/data';
import { articleMarkdown } from '@/lib/help/seo';

export const revalidate = 60;

export async function GET() {
  const [articles, categories] = await Promise.all([getPublishedArticles(), getCategories()]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const sorted = [...articles].sort((a, b) =>
    (catById.get(a.category ?? '')?.order ?? 99) - (catById.get(b.category ?? '')?.order ?? 99) || a.title.localeCompare(b.title, 'de'));
  const body = sorted.map((a) => articleMarkdown(a, catById.get(a.category ?? ''))).join('\n---\n\n');
  const head = `# Fit-Inn Trier – Hilfe-Center (vollständiger Inhalt)\n\n> Alle Artikel von ${SITE} als Markdown. Übersicht: ${SITE}/llms.txt\n\n---\n\n`;
  return new Response(head + body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, s-maxage=60, stale-while-revalidate=600' },
  });
}
