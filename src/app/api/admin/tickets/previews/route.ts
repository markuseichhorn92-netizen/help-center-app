import { NextRequest, NextResponse } from 'next/server';
import { getTicketPreviews } from '@/lib/tickets';
import { requireAdmin } from '@/lib/admin-auth';

// Vorschau (letzte Nachricht, „wartet seit“) für die sichtbaren Zeilen des Posteingangs.
// GET /api/admin/tickets/previews?ids=a,b,c  (max. 40)
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const ids = (new URL(req.url).searchParams.get('ids') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^[A-Za-z0-9_-]{6,64}$/.test(s))
      .slice(0, 40);
    if (ids.length === 0) return NextResponse.json({});
    return NextResponse.json(await getTicketPreviews(ids));
  } catch (error) {
    console.error('Failed to load previews:', error);
    return NextResponse.json({ message: 'Fehler beim Laden der Vorschau.' }, { status: 500 });
  }
}
