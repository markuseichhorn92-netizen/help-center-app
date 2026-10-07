import { NextResponse } from 'next/server';
import { getArticleById } from '@/lib/help/data';

// Alte UUID-Adressen → dauerhaft (301) auf die sprechende URL.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getArticleById(id);
  if (!a) return new Response('Nicht gefunden', { status: 404 });
  return NextResponse.redirect(new URL(`/artikel/${a.slug}`, req.url), 301);
}
