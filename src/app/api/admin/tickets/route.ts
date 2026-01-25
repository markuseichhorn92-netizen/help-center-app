import { NextRequest, NextResponse } from 'next/server';
import { getAllTickets } from '@/lib/tickets';

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

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

  try {
    const tickets = await getAllTickets();
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Failed to load tickets:', error);
    return NextResponse.json({ message: 'Fehler beim Laden der Tickets.' }, { status: 500 });
  }
}
