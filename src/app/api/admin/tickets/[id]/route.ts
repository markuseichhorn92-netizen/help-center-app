import { NextRequest, NextResponse } from 'next/server';
import { getTicket, updateTicket, deleteTicket } from '@/lib/tickets';

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  try {
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Failed to get ticket:', error);
    return NextResponse.json({ message: 'Fehler beim Laden des Tickets.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, assignedTo } = body;

    const updatedTicket = await updateTicket(id, { status, priority, assignedTo });

    if (!updatedTicket) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return NextResponse.json({ message: 'Fehler beim Aktualisieren des Tickets.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  try {
    const { id } = await params;
    const deleted = await deleteTicket(id);

    if (!deleted) {
      return NextResponse.json({ message: 'Ticket nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Ticket gelöscht.' });
  } catch (error) {
    console.error('Failed to delete ticket:', error);
    return NextResponse.json({ message: 'Fehler beim Löschen des Tickets.' }, { status: 500 });
  }
}
