import * as cheerio from 'cheerio';
import { stripHtml } from './data';

export interface Section { id: string; title: string; html: string }
export interface ParsedArticle {
  kurz: string | null;
  introHtml: string;
  sections: Section[]; // h2-Abschnitte
  numbered: boolean;
  headings: { id: string; text: string }[];
}

const slug = (t: string) =>
  t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'abschnitt';

function firstSentences(text: string, max = 260): string {
  if (text.length <= max) return text;
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [];
  let out = '';
  for (const p of parts) { if ((out + p).length > max) break; out += p; }
  return out.trim() || text.slice(0, max).replace(/\s\S*$/, '') + ' …';
}

export function parseArticle(html: string): ParsedArticle {
  const $ = cheerio.load(`<div id="root">${html}</div>`, null, false);
  const root = $('#root');
  // Härtung: nichts Ausführbares aus dem Redaktionssystem durchreichen.
  root.find('script,style,iframe,object,embed').remove();
  root.find('*').each((_, el) => {
    for (const name of Object.keys((el as { attribs?: Record<string, string> }).attribs ?? {})) {
      if (name.startsWith('on')) $(el).removeAttr(name);
    }
  });
  root.find('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (/^javascript:/i.test(href)) $(a).removeAttr('href');
    if (/^https?:/i.test(href)) $(a).attr('target', '_blank').attr('rel', 'noopener noreferrer');
    $(a).removeAttr('class');
  });
  // Doppelte Überschrift (h1 = Seitentitel) entfernen, weitere h1 → h2
  root.find('h1').each((i, h) => {
    if (i === 0 && root.children().first().is('h1')) { $(h).remove(); return; }
    (h as { tagName: string }).tagName = 'h2';
  });

  const kids = root.children().toArray();
  const firstH2 = kids.findIndex((k) => (k as { tagName?: string }).tagName === 'h2');
  const introEls = firstH2 === -1 ? kids : kids.slice(0, firstH2);
  const secEls = firstH2 === -1 ? [] : kids.slice(firstH2);

  const used = new Set<string>();
  const uid = (t: string) => { let s = slug(t), n = 1, c = s; while (used.has(c)) c = `${s}-${n++}`; used.add(c); return c; };

  const sections: Section[] = [];
  let cur: Section | null = null;
  for (const el of secEls) {
    if ((el as { tagName?: string }).tagName === 'h2') {
      const title = stripHtml($.html(el));
      cur = { id: uid(title), title, html: '' };
      sections.push(cur);
    } else if (cur) cur.html += $.html(el);
  }

  // „Kurz gesagt“: erster Absatz der Einleitung – nur wenn danach noch mehr Inhalt folgt.
  let kurz: string | null = null;
  const firstP = introEls.findIndex((e) => (e as { tagName?: string }).tagName === 'p' && stripHtml($.html(e)).length > 20);
  const hasMore = sections.length > 0 || introEls.length > 3;
  let introHtml = '';
  introEls.forEach((el, i) => {
    if (i === firstP && hasMore) {
      const text = stripHtml($.html(el));
      kurz = firstSentences(text);
      if (kurz.length >= text.length - 2) return; // vollständig übernommen → nicht doppelt anzeigen
    }
    introHtml += $.html(el);
  });

  // Überschriften h3 in Einleitung/Abschnitten für Sprungmarken
  const headings = sections.map((s) => ({ id: s.id, text: s.title }));
  return { kurz, introHtml, sections, numbered: sections.length >= 2 && sections.length <= 6, headings };
}
