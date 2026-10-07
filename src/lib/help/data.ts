import { createClient } from '@vercel/kv';
import { unstable_cache } from 'next/cache';
import { getConfig } from '@/lib/dashboard/kv';
import type { OpeningData } from './hours';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

// Nur für lokale Entwicklung ohne KV-Zugang: Daten von der Live-Seite lesen.
const DEV_ORIGIN = process.env.HELP_DATA_ORIGIN;

export interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
  order: number;
}

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

async function devJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DEV_ORIGIN}${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`dev fetch ${path} ${res.status}`);
  return res.json();
}

async function loadArticles(): Promise<HelpArticle[]> {
  try {
    if (DEV_ORIGIN) return await devJson<HelpArticle[]>('/api/articles');
    const ids: string[] = await kv.smembers('articles:ids');
    const rows = await Promise.all(
      ids.map(async (id) => ({ id, ...(await kv.hgetall(`article:${id}`)) }) as unknown as HelpArticle & { published?: boolean }),
    );
    return rows
      .filter((a) => a.published && a.title)
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

export async function getArticle(id: string): Promise<HelpArticle | null> {
  const all = await getPublishedArticles();
  return all.find((a) => a.id === id) ?? null;
}

async function loadCategories(): Promise<HelpCategory[]> {
  try {
    if (DEV_ORIGIN) return await devJson<HelpCategory[]>('/api/categories');
    const ids: string[] = await kv.smembers('categories:ids');
    const rows = await Promise.all(ids.map((id) => kv.hgetall(`category:${id}`)));
    return (rows.filter((c) => c && Object.keys(c).length > 0) as unknown as HelpCategory[]).sort(
      (a, b) => Number(a.order) - Number(b.order),
    );
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

export function stripHtml(html: string): string {
  return html
    .replace(/<(br|\/p|\/li|\/h[1-6])\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
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

