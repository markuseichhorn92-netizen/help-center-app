import { NextRequest, NextResponse } from 'next/server';
import { deleteTickets } from '@/lib/tickets';

// Helper function to check authentication
function isAuthenticated(req: NextRequest): boolean {
  const basicAuth = req.headers.get('authorization');
  if (!basicAuth) {
    return false;
  }
  const authValue = basicAuth.split(' ')[1];
  const [user, password] = Buffer.from(authValue, 'base64').toString().split(':');

  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;

  return user === ADMIN_USER && password === ADMIN_PASS;
}

export async function DELETE(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: 'Keine Ticket-IDs angegeben.' },
        { status: 400 }
      );
    }

    const result = await deleteTickets(ids);

    return NextResponse.json({
      message: `${result.deleted} Ticket(s) gelöscht.`,
      deletedCount: result.deleted,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Failed to delete tickets:', error);
    return NextResponse.json(
      { message: 'Fehler beim Löschen der Tickets.' },
      { status: 500 }
    );
  }
}
