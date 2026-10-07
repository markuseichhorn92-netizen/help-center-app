// Sprechende URLs: Slug aus dem Titel, deutsche Umlaute werden umschrieben.
export function slugify(text: string, max = 70): string {
  const s = text
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length <= max) return s || 'artikel';
  const cut = s.slice(0, max);
  const at = cut.lastIndexOf('-');
  return (at > 20 ? cut.slice(0, at) : cut).replace(/-+$/g, '') || 'artikel';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

// Vergibt eindeutige Slugs. Reihenfolge der Vergabe ist stabil (älteste zuerst, dann ID),
// damit ein Slug nicht springt, wenn ein später angelegter Artikel denselben Titel hat.
export function assignSlugs<T extends { id: string; createdAt?: string }>(
  items: T[],
  label: (item: T) => string,
): (T & { slug: string })[] {
  const order = [...items].sort((a, b) =>
    (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id));
  const used = new Set<string>();
  const bySlug = new Map<string, string>();
  for (const it of order) {
    const base = slugify(label(it));
    let slug = base, n = 2;
    while (used.has(slug)) slug = `${base}-${n++}`;
    used.add(slug);
    bySlug.set(it.id, slug);
  }
  return items.map((it) => ({ ...it, slug: bySlug.get(it.id)! }));
}
