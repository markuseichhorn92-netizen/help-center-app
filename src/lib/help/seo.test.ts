import { describe, it, expect } from 'vitest';
import { articleLds, articleMarkdown, htmlToMarkdown, ldJson, oneSentence, openingHoursSpec, organizationLd, websiteLd } from './seo';
import type { HelpArticle, HelpCategory } from './data';

const art: HelpArticle = { id: 'x', slug: 'oeffnungszeiten', title: 'Öffnungszeiten', content: '<p>Wir sind <strong>täglich</strong> da. Mehr unten.</p><h2>Details</h2><ul><li>Mo–Fr</li><li>Sa</li></ul>', category: 'c', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z' };
const cat: HelpCategory = { id: 'c', slug: 'studio', name: 'Studio', icon: 'building', order: 0 };

describe('JSON-LD', () => {
  it('liefert Article, FAQPage und BreadcrumbList', () => {
    const lds = articleLds(art, cat, 'Antwort.');
    expect(lds.map((l) => l['@type'])).toEqual(['Article', 'FAQPage', 'BreadcrumbList']);
    expect(JSON.parse(ldJson(lds))).toHaveLength(3);
    expect(lds[0]).toMatchObject({ dateModified: art.updatedAt, datePublished: art.createdAt });
    expect((lds[2] as { itemListElement: unknown[] }).itemListElement).toHaveLength(3);
  });
  it('escaped </script>', () => expect(ldJson({ a: '</script>' })).not.toContain('</script>'));
  it('Organisation hat Adresse und Öffnungszeiten nur aus Daten', () => {
    const cfg = { openingHours: { monday: { closed: false, slots: [{ open: '09:30', close: '13:00' }] }, tuesday: { closed: true, slots: [] } }, specialDays: [] } as never;
    const org = organizationLd(cfg);
    expect(org.address.streetAddress).toBe('Auf Hirtenberg 8');
    expect(org.openingHoursSpecification).toHaveLength(1);
    expect(organizationLd(null).openingHoursSpecification).toBeUndefined();
    expect(openingHoursSpec(null)).toBeUndefined();
  });
  it('WebSite hat SearchAction', () => expect(JSON.stringify(websiteLd())).toContain('search_term_string'));
});

describe('Markdown', () => {
  it('wandelt HTML um', () => {
    const md = htmlToMarkdown(art.content);
    expect(md).toContain('Wir sind **täglich** da.');
    expect(md).toContain('## Details');
    expect(md).toContain('- Mo–Fr');
  });
  it('hat Kopf mit Quelle und Datum', () => {
    const md = articleMarkdown(art, cat);
    expect(md.startsWith('# Öffnungszeiten')).toBe(true);
    expect(md).toContain('https://hilfe.fit-inn-trier.de/artikel/oeffnungszeiten');
    expect(md).toContain('Aktualisiert am 2026-02-01');
  });
});

describe('oneSentence', () => {
  it('überspringt Grüße und Fragen', () => {
    expect(oneSentence('<p>Hey du!</p><p>Wie kann ich pausieren?</p><p>Du kannst deine Mitgliedschaft per Formular pausieren.</p>')).toBe('Du kannst deine Mitgliedschaft per Formular pausieren.');
  });
});
