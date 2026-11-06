import { z } from 'zod';
import { revalidateTag } from 'next/cache';
import { kv } from '@/lib/kv';

// Gleiches Datenmodell wie der Admin (siehe /api/admin/articles): title, content (HTML),
// category (Kategorie-ID), published. Archivieren = published:false. Löschen gibt es nicht.

const MAX_CONTENT = 200_000;

export const createSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    content: z.string().min(1).max(MAX_CONTENT),
    category: z.string().trim().max(100).optional(),
    published: z.boolean().default(false),
  })
  .strict();

export const updateSchema = z
  .object({
    title: z.string().trim().min(3).max(200).optional(),
    content: z.string().min(1).max(MAX_CONTENT).optional(),
    category: z.string().trim().max(100).optional(),
    published: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Keine Felder übergeben' });

export type StoredArticle = Record<string, unknown> & { id: string };

export async function categoryExists(id: string): Promise<boolean> {
  const c = await kv.hgetall(`category:${id}`);
  return !!c && Object.keys(c).length > 0;
}

// Cache-Tags der Seiten (siehe lib/articles.ts und lib/help/data.ts)
export function refreshCaches(tags: string[] = ['articles', 'help']) {
  for (const t of tags) {
    try {
      revalidateTag(t, { expire: 0 });
    } catch (e) {
      console.error('revalidateTag', t, e);
    }
  }
}

// Alte Fassung sichern und Änderung protokollieren (beides in KV, nie löschen).
export async function backupAndLog(action: 'create' | 'update', id: string, before: unknown, after: unknown) {
  const ts = new Date().toISOString();
  if (before) await kv.set(`lena:backup:${id}:${ts}`, before);
  await kv.lpush('lena:log', JSON.stringify({ ts, action, id, backup: before ? `lena:backup:${id}:${ts}` : null, title: (after as { title?: string })?.title }));
  await kv.ltrim('lena:log', 0, 999);
}
