import { stripHtml, type HelpArticle, type HelpCategory } from './data';
import type { SearchDoc } from './search';

export function headingsOf(html: string): string[] {
  return [...html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)].map((m) => stripHtml(m[1])).filter(Boolean);
}

export function buildSearchDocs(articles: HelpArticle[], categories: HelpCategory[]): SearchDoc[] {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    category: (a.category && catName.get(a.category)) || '',
    headings: headingsOf(a.content).join(' · '),
    text: stripHtml(a.content).slice(0, 3000),
  }));
}
