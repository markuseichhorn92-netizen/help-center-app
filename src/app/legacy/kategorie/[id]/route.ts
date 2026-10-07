import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/help/data';

// Ziel des Proxy-Rewrites für /kategorie/<uuid> → 301 auf /kategorie/<slug>.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = (await getCategories()).find((x) => x.id === id);
  if (!c) return new Response('Nicht gefunden', { status: 404 });
  return NextResponse.redirect(new URL(`/kategorie/${c.slug}`, req.url), 301);
}
