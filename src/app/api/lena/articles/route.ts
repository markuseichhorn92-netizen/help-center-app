import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { requireLena } from '@/lib/lena/auth';
import { backupAndLog, categoryExists, createSchema, refreshCaches } from '@/lib/lena/articles';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = requireLena(req);
  if (denied) return denied;
  try {
    const ids: string[] = await kv.smembers('articles:ids');
    const rows = await Promise.all(ids.map(async (id) => ({ id, ...(await kv.hgetall(`article:${id}`)) }) as Record<string, unknown>));
    const q = new URL(req.url).searchParams.get('q')?.toLowerCase().trim();
    const list = rows
      .filter((a) => a.title)
      .filter((a) => !q || String(a.title).toLowerCase().includes(q) || String(a.content ?? '').toLowerCase().includes(q))
      .map(({ content, ...meta }): Record<string, unknown> => ({ ...meta, contentLength: String(content ?? '').length }))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return NextResponse.json(list);
  } catch (e) {
    console.error('lena articles list', e);
    return NextResponse.json({ error: 'Lesefehler' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = requireLena(req);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Daten', details: parsed.error.issues }, { status: 400 });
  try {
    if (parsed.data.category && !(await categoryExists(parsed.data.category))) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const article = { id, ...parsed.data, createdAt: now, updatedAt: now };
    await kv.hmset(`article:${id}`, article);
    await kv.sadd('articles:ids', id);
    await backupAndLog('create', id, null, article);
    refreshCaches();
    return NextResponse.json(article, { status: 201 });
  } catch (e) {
    console.error('lena articles create', e);
    return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 });
  }
}
