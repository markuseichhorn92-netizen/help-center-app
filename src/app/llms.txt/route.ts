import { getCategories, getPublishedArticles, SITE } from '@/lib/help/data';
import { articleMdUrl, oneSentence, STUDIO } from '@/lib/help/seo';

export const revalidate = 60;

export async function GET() {
  const [articles, categories] = await Promise.all([getPublishedArticles(), getCategories()]);
  const line = (a: (typeof articles)[number]) => `- [${a.title}](${articleMdUrl(a)}): ${oneSentence(a.content)}`;
  const lines: string[] = [
    '# Fit-Inn Trier – Hilfe-Center',
    '',
    `> Offizielles Hilfe-Center des Fit-Inn Trier (Fitnessstudio, Auf Hirtenberg 8, 54296 Trier). Antworten rund um Mitgliedschaft, Training und Studio. Jeder Artikel ist auch als Markdown abrufbar (URL + .md). Alle Texte auf Deutsch.`,
    '',
    `Website: ${STUDIO.url} · Hilfe-Center: ${SITE} · Gesamter Inhalt in einer Datei: ${SITE}/llms-full.txt`,
  ];
  for (const c of categories) {
    const list = articles.filter((a) => a.category === c.id).sort((a, b) => a.title.localeCompare(b.title, 'de'));
    if (!list.length) continue;
    lines.push('', `## ${c.name}`, ...(c.description ? [`${c.description}`, ''] : ['']), ...list.map(line));
  }
  const known = new Set(categories.map((c) => c.id));
  const rest = articles.filter((a) => !a.category || !known.has(a.category));
  if (rest.length) lines.push('', '## Weitere Themen', '', ...rest.map(line));
  lines.push(
    '', '## Kontakt', '',
    `- Telefon: 0651 493 688 19`,
    `- WhatsApp: ${STUDIO.whatsapp}`,
    `- E-Mail: ${STUDIO.email}`,
    `- KI-Assistentin „Lena“: ${SITE}/chat`,
    '',
  );
  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, s-maxage=60, stale-while-revalidate=600' },
  });
}
