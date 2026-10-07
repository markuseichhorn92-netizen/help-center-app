// Tolerante Client-Suche: Umlaut-Normalisierung, Wortstämme, Synonyme, Gewichtung Titel > Überschrift > Text.
export interface SearchDoc {
  id: string;
  title: string;
  category: string; // Kategoriename
  headings: string;
  text: string; // Klartext (gekürzt)
}

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  excerpt: string;
}

export const norm = (s: string) =>
  s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Sprachliche Synonyme (normalisiert). Keine Aussagen über Inhalte – nur Suchbegriffe.
const SYN: string[][] = [
  ['beitrag', 'preis', 'kosten', 'gebuhr', 'lastschrift', 'abbuchung', 'bezahlen', 'rechnung', 'iban', 'tarif'],
  ['zugang', 'checkin', 'check in', 'chip', 'eintritt', 'einlass', 'schlussel', 'karte'],
  ['kundigen', 'kundigung', 'austritt', 'beenden', 'vertragsende', 'aussteigen', 'laufzeit'],
  ['offnungszeiten', 'geoffnet', 'offen', 'uhrzeit', 'zeiten', 'wann'],
  ['pause', 'pausieren', 'ruhen', 'unterbrechen', 'freeze', 'aussetzen'],
  ['probetraining', 'probe', 'schnuppern', 'testen', 'kennenlernen', 'schnuppertraining'],
  ['app', 'technogym', 'mywellness', 'handy', 'smartphone'],
  ['daten', 'adresse', 'umzug', 'anschrift', 'andern', 'aktualisieren', 'bankverbindung'],
  ['newsletter', 'mail', 'abmelden', 'abbestellen', 'werbung'],
  ['regeln', 'hausordnung', 'verhalten', 'ordnung'],
  ['kurs', 'kurse', 'gruppenkurs', 'yoga'],
  ['analyse', 'stoffwechsel', 'ernahrung', 'coaching', 'uvida'],
];

const stem = (w: string) => w.replace(/(ungen|ung|en|er|es|e|n|s)$/, '');

function expand(token: string): string[] {
  const out = new Set([token]);
  const st = stem(token);
  for (const group of SYN) {
    if (group.some((g) => g === token || (st.length >= 4 && stem(g) === st))) group.forEach((g) => out.add(g));
  }
  return [...out];
}

function levenshtein1(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1 || a.length < 5) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

function wordHit(haystackWords: string[], haystack: string, term: string): number {
  if (haystack.includes(term)) return 1;
  const st = stem(term);
  if (st.length >= 4 && haystack.includes(st)) return 0.8;
  if (term.length >= 5 && haystackWords.some((w) => levenshtein1(w, term))) return 0.6;
  return 0;
}

export function search(docs: SearchDoc[], query: string, limit = 6): SearchHit[] {
  const tokens = norm(query).split(' ').filter((t) => t.length >= 2);
  if (!tokens.length) return [];
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const t = norm(doc.title), h = norm(doc.headings), x = norm(doc.text), c = norm(doc.category);
    const tw = t.split(' '), hw = h.split(' '), xw = x.split(' ');
    let score = 0, matched = 0;
    for (const token of tokens) {
      let best = 0;
      for (const [i, term] of expand(token).entries()) {
        const w = i === 0 ? 1 : 0.7; // Original > Synonym
        best = Math.max(best, w * (wordHit(tw, t, term) * 10 + wordHit(hw, h, term) * 5 + wordHit(xw, x, term) * 2 + (c.includes(term) ? 1 : 0)));
      }
      if (best > 0) matched++;
      score += best;
    }
    if (matched === 0) continue;
    if (matched < tokens.length && tokens.length > 1) score *= 0.5;
    hits.push({ doc, score, excerpt: excerptFor(doc.text, tokens) });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

function excerptFor(text: string, tokens: string[]): string {
  const lower = text.toLowerCase();
  let idx = -1;
  for (const tk of tokens) {
    idx = lower.indexOf(tk);
    if (idx >= 0) break;
  }
  const start = Math.max(0, idx < 0 ? 0 : idx - 40);
  const s = text.slice(start, start + 110).trim();
  return (start > 0 ? '… ' : '') + s + (start + 110 < text.length ? ' …' : '');
}
