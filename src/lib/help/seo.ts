import * as cheerio from 'cheerio';
import { SITE, stripHtml } from './text';
import type { HelpArticle, HelpCategory } from './data';
import type { OpeningData } from './hours';

export const articleUrl = (a: Pick<HelpArticle, 'slug'>) => `${SITE}/artikel/${a.slug}`;
export const articleMdUrl = (a: Pick<HelpArticle, 'slug'>) => `${SITE}/artikel/${a.slug}.md`;
export const categoryUrl = (c: Pick<HelpCategory, 'slug'>) => `${SITE}/kategorie/${c.slug}`;

export const STUDIO = {
  name: 'Fit-Inn Trier',
  url: 'https://fit-inn-trier.de',
  telephone: '+49 651 49368819',
  email: 'info@fit-inn-trier.de',
  whatsapp: 'https://wa.me/4951328533010',
  sameAs: ['https://www.instagram.com/fit_inn_trier/', 'https://www.facebook.com/FitInnFeyen'],
  address: { '@type': 'PostalAddress', streetAddress: 'Auf Hirtenberg 8', postalCode: '54296', addressLocality: 'Trier', addressCountry: 'DE' },
} as const;

// Kürzt auf volle Sätze (für 1-Satz-Antworten und FAQ-Antworten).
export function firstSentences(text: string, max: number): string {
  if (text.length <= max) return text;
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [];
  let out = '';
  for (const p of parts) { if ((out + p).length > max) break; out += p; }
  return out.trim() || text.slice(0, max).replace(/\s\S*$/, '') + ' …';
}

// Erster inhaltlicher Satz des Artikels: Fragen, Grußformeln und sehr kurze Sätze werden übersprungen.
export function oneSentence(html: string, max = 200): string {
  const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripHtml(m[1])).filter(Boolean);
  const text = stripHtml(html);
  const sentences = [...paras, text].flatMap((t) => t.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? []).map((x) => x.trim());
  const good = sentences.find((x) => x.length >= 35 && !x.endsWith('?')) ?? sentences.find((x) => x.length >= 20) ?? text;
  return good.length <= max ? good : good.slice(0, max).replace(/\s\S*$/, '') + ' …';
}

export const shortAnswer = (html: string, kurz: string | null) => kurz ?? firstSentences(stripHtml(html), 400);

export function openingHoursSpec(cfg: OpeningData | null) {
  if (!cfg?.openingHours) return undefined;
  const days: [string, string][] = [
    ['monday', 'Monday'], ['tuesday', 'Tuesday'], ['wednesday', 'Wednesday'], ['thursday', 'Thursday'],
    ['friday', 'Friday'], ['saturday', 'Saturday'], ['sunday', 'Sunday'],
  ];
  const spec = days.flatMap(([key, name]) => {
    const d = cfg.openingHours[key];
    if (!d || d.closed) return [];
    return d.slots.map((s) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${name}`, opens: s.open, closes: s.close }));
  });
  return spec.length ? spec : undefined;
}

export function organizationLd(cfg: OpeningData | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HealthClub',
    '@id': `${STUDIO.url}/#fitinn`,
    name: STUDIO.name,
    url: STUDIO.url,
    telephone: STUDIO.telephone,
    email: STUDIO.email,
    address: STUDIO.address,
    sameAs: STUDIO.sameAs,
    openingHoursSpecification: openingHoursSpec(cfg),
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE}/#website`,
    name: 'Hilfe-Center Fit-Inn Trier',
    url: SITE,
    inLanguage: 'de',
    publisher: { '@id': `${STUDIO.url}/#fitinn` },
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  };
}

export function articleLds(a: HelpArticle, cat: HelpCategory | undefined, answer: string) {
  const url = articleUrl(a);
  const publisher = { '@type': 'HealthClub', name: STUDIO.name, url: STUDIO.url };
  return [
    {
      '@context': 'https://schema.org', '@type': 'Article', headline: a.title, url, mainEntityOfPage: url,
      dateModified: a.updatedAt, datePublished: a.createdAt, inLanguage: 'de', author: publisher, publisher,
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: 'de', url,
      mainEntity: [{ '@type': 'Question', name: a.title, acceptedAnswer: { '@type': 'Answer', text: answer } }],
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Hilfe-Center', item: SITE },
        ...(cat ? [{ '@type': 'ListItem', position: 2, name: cat.name, item: categoryUrl(cat) }] : []),
        { '@type': 'ListItem', position: cat ? 3 : 2, name: a.title, item: url },
      ],
    },
  ];
}

// </script>-sicher in HTML einbetten.
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');

// ---------- HTML → Markdown (für /artikel/<slug>.md und llms-full.txt) ----------

type Node = cheerio.Cheerio<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function htmlToMarkdown(html: string): string {
  const $ = cheerio.load(`<div id="root">${html}</div>`, null, false);
  const root = $('#root');
  root.find('script,style,iframe,object,embed').remove();

  const inline = (el: Node): string => el.contents().toArray().map((n) => {
    if (n.type === 'text') return (n as unknown as { data: string }).data.replace(/\s+/g, ' ');
    if (n.type !== 'tag') return '';
    const e = $(n);
    const tag = (n as unknown as { tagName: string }).tagName;
    const inner = inline(e);
    switch (tag) {
      case 'strong': case 'b': return inner.trim() ? `**${inner.trim()}**` : '';
      case 'em': case 'i': return inner.trim() ? `*${inner.trim()}*` : '';
      case 'br': return '  \n';
      case 'a': {
        const href = e.attr('href');
        if (!href || /^javascript:/i.test(href)) return inner;
        return `[${inner.trim() || href}](${href.startsWith('/') ? SITE + href : href})`;
      }
      case 'img': return e.attr('alt') ? `(Bild: ${e.attr('alt')})` : '';
      case 'ul': case 'ol': case 'table': case 'p': case 'div': return '\n\n' + block(e) + '\n\n';
      default: return inner;
    }
  }).join('');

  const list = (el: Node, depth: number): string => {
    const ordered = (el[0] as unknown as { tagName: string }).tagName === 'ol';
    return el.children('li').toArray().map((li, i) => {
      const item = $(li);
      const nested = item.children('ul,ol');
      const text = inline(item.clone().children('ul,ol').remove().end()).replace(/\s*\n+\s*/g, ' ').trim();
      const sub = nested.toArray().map((n) => list($(n), depth + 1)).join('\n');
      return `${'  '.repeat(depth)}${ordered ? `${i + 1}.` : '-'} ${text}${sub ? '\n' + sub : ''}`;
    }).join('\n');
  };

  const table = (el: Node): string => {
    const rows = el.find('tr').toArray().map((tr) => $(tr).children('th,td').toArray().map((c) => inline($(c)).replace(/\s*\n+\s*/g, ' ').replace(/\|/g, '\\|').trim()));
    if (!rows.length) return '';
    const w = Math.max(...rows.map((r) => r.length));
    const pad = (r: string[]) => `| ${[...r, ...Array(w - r.length).fill('')].join(' | ')} |`;
    return [pad(rows[0]), `| ${Array(w).fill('---').join(' | ')} |`, ...rows.slice(1).map(pad)].join('\n');
  };

  function block(el: Node): string {
    return el.contents().toArray().map((n) => {
      if (n.type === 'text') return (n as unknown as { data: string }).data.replace(/\s+/g, ' ').trim();
      if (n.type !== 'tag') return '';
      const e = $(n);
      const tag = (n as unknown as { tagName: string }).tagName;
      const h = /^h([1-6])$/.exec(tag);
      if (h) return `\n\n${'#'.repeat(Math.min(6, Math.max(2, Number(h[1]) + 1)))} ${inline(e).trim()}\n\n`;
      if (tag === 'p') return `\n\n${inline(e).trim()}\n\n`;
      if (tag === 'ul' || tag === 'ol') return `\n\n${list(e, 0)}\n\n`;
      if (tag === 'table') return `\n\n${table(e)}\n\n`;
      if (tag === 'blockquote') return `\n\n${block(e).trim().split('\n').map((l) => `> ${l}`).join('\n')}\n\n`;
      if (tag === 'hr') return '\n\n---\n\n';
      if (tag === 'div' || tag === 'section') return `\n\n${block(e)}\n\n`;
      return inline($('<x/>').append(e.clone()));
    }).join('');
  }

  return block(root).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function articleMarkdown(a: HelpArticle, cat: HelpCategory | undefined): string {
  const date = new Date(a.updatedAt).toISOString().slice(0, 10);
  const body = htmlToMarkdown(a.content).replace(new RegExp(`^## ${a.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\n+`), '');
  return [
    `# ${a.title}`,
    '',
    `Quelle: ${articleUrl(a)}${cat ? ` · Thema: ${cat.name}` : ''} · Aktualisiert am ${date}`,
    '',
    body,
    '',
  ].join('\n');
}
