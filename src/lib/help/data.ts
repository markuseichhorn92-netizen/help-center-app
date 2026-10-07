import { kv } from '@/lib/kv';
import { unstable_cache } from 'next/cache';
import { getConfig } from '@/lib/dashboard/kv';
import type { OpeningData } from './hours';
import { assignSlugs } from './slug';

import { SITE, stripHtml } from './text';
export { SITE, stripHtml };

// Nur für lokale Entwicklung ohne KV-Zugang: Daten von der Live-Seite lesen.
const DEV_ORIGIN = process.env.HELP_DATA_ORIGIN;

export interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
  order: number;
  slug: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  slug: string;
}

async function devJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DEV_ORIGIN}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`dev fetch ${path} ${res.status}`);
  return res.json();
}

async function loadArticles(): Promise<HelpArticle[]> {
  try {
    if (DEV_ORIGIN) return assignSlugs(await devJson<Omit<HelpArticle, 'slug'>[]>('/api/articles'), (a) => a.title);
    const ids: string[] = await kv.smembers('articles:ids');
    const rows = await Promise.all(
      ids.map(async (id) => ({ id, ...(await kv.hgetall(`article:${id}`)) }) as unknown as HelpArticle & { published?: boolean }),
    );
    const published = rows.filter((a) => a.published && a.title);
    return assignSlugs(published, (a) => a.title)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error('getPublishedArticles failed', e);
    return [];
  }
}

// ISR-artig: Daten 60 s (Öffnungszeiten 5 min) zwischenspeichern, damit die Seiten statisch ausgeliefert werden.
export const getPublishedArticles = unstable_cache(loadArticles, ['help-articles'], { revalidate: 60, tags: ['help'] });
export const getCategories = unstable_cache(loadCategories, ['help-categories'], { revalidate: 60, tags: ['help'] });
export const getOpeningConfig = unstable_cache(loadOpeningConfig, ['help-opening'], { revalidate: 300, tags: ['help'] });

export async function getArticleBySlug(slug: string): Promise<HelpArticle | null> {
  const all = await getPublishedArticles();
  return all.find((a) => a.slug === slug) ?? null;
}

export async function getArticleById(id: string): Promise<HelpArticle | null> {
  const all = await getPublishedArticles();
  return all.find((a) => a.id === id) ?? null;
}

async function loadCategories(): Promise<HelpCategory[]> {
  try {
    if (DEV_ORIGIN) return assignSlugs(await devJson<Omit<HelpCategory, 'slug'>[]>('/api/categories'), (c) => c.name).sort((a, b) => Number(a.order) - Number(b.order));
    const ids: string[] = await kv.smembers('categories:ids');
    const rows = await Promise.all(ids.map((id) => kv.hgetall(`category:${id}`)));
    const cats = rows.filter((c) => c && Object.keys(c).length > 0) as unknown as HelpCategory[];
    return assignSlugs(cats, (c) => c.name).sort((a, b) => Number(a.order) - Number(b.order));
  } catch (e) {
    console.error('getCategories failed', e);
    return [];
  }
}

async function loadOpeningConfig(): Promise<OpeningData | null> {
  try {
    if (DEV_ORIGIN) return await devJson('/api/dashboard/config');
    if (!process.env.DASHBOARD_KV_KV_REST_API_URL) return null;
    const c = await getConfig();
    // Ohne gespeicherte Konfiguration liefert getConfig Standardwerte – die nicht anzeigen.
    if (!c.lastModified) return null;
    return { openingHours: c.openingHours, specialDays: c.specialDays ?? [] };
  } catch {
    return null;
  }
}


export function readingMinutes(html: string): number {
  const words = stripHtml(html).split(' ').length;
  return Math.max(1, Math.round(words / 200));
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });

// Häufige Fragen: Titel-Stichworte in Reihenfolge der Wichtigkeit (Kuration laut Konzept).
const TOP_KEYWORDS = ['kündigen', 'pausieren', 'öffnungszeiten', 'probetraining', 'technogym', 'daten aktualisieren', 'kündigungsbedingungen', 'hausordnung'];
export function pickTopArticles(articles: HelpArticle[], max = 6): HelpArticle[] {
  const out: HelpArticle[] = [];
  for (const k of TOP_KEYWORDS) {
    const hit = articles.find((a) => a.title.toLowerCase().includes(k) && !out.includes(a));
    if (hit) out.push(hit);
  }
  for (const a of articles) if (out.length < max && !out.includes(a)) out.push(a);
  return out.slice(0, max);
}

