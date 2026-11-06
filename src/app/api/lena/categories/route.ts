import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { requireLena } from '@/lib/lena/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = requireLena(req);
  if (denied) return denied;
  try {
    const ids: string[] = await kv.smembers('categories:ids');
    const rows = await Promise.all(ids.map((id) => kv.hgetall(`category:${id}`)));
    const cats = (rows.filter((c) => c && Object.keys(c).length > 0) as unknown as { order: number }[]).sort((a, b) => Number(a.order) - Number(b.order));
    return NextResponse.json(cats);
  } catch (e) {
    console.error('lena categories', e);
    return NextResponse.json({ error: 'Lesefehler' }, { status: 500 });
  }
}
