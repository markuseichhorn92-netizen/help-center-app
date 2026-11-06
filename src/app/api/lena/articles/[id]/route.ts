import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { requireLena } from '@/lib/lena/auth';
import { backupAndLog, categoryExists, refreshCaches, updateSchema } from '@/lib/lena/articles';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };
const ID = /^[0-9a-zA-Z-]{8,64}$/;

export async function GET(req: NextRequest, { params }: Ctx) {
  const denied = requireLena(req);
  if (denied) return denied;
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  const article = await kv.hgetall(`article:${id}`);
  if (!article || Object.keys(article).length === 0) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json({ id, ...article });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = requireLena(req);
  if (denied) return denied;
  const { id } = await params;
  if (!ID.test(id)) return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiges JSON' }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Daten', details: parsed.error.issues }, { status: 400 });
  try {
    const existing = await kv.hgetall(`article:${id}`);
    if (!existing || Object.keys(existing).length === 0) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    if (parsed.data.category && !(await categoryExists(parsed.data.category))) {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 400 });
    }
    const updated = { ...existing, ...parsed.data, id, updatedAt: new Date().toISOString() };
    await backupAndLog('update', id, existing, updated);
    await kv.hmset(`article:${id}`, updated);
    refreshCaches();
    return NextResponse.json(updated);
  } catch (e) {
    console.error('lena articles update', e);
    return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 });
  }
}

// Kein DELETE: Artikel werden nur archiviert (PATCH published:false).
export async function DELETE() {
  return NextResponse.json({ error: 'Löschen nicht erlaubt – bitte archivieren (published:false)' }, { status: 405, headers: { Allow: 'GET, PATCH' } });
}
