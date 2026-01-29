import { NextRequest, NextResponse } from 'next/server';
import { validateRatingToken, submitTicketRating, getRatingToken } from '@/lib/ticket-rating';
import { getTicket } from '@/lib/tickets';

// GET: Validate token and get ticket info
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Get token data
    const tokenData = await getRatingToken(token);
    if (!tokenData) {
      return NextResponse.json({
        valid: false,
        error: 'Link nicht gefunden',
      }, { status: 404 });
    }

    // Validate token
    const validation = await validateRatingToken(token);
    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        error: validation.error,
      }, { status: 400 });
    }

    // Get ticket info
    const ticket = await getTicket(validation.ticketId!);
    if (!ticket) {
      return NextResponse.json({
        valid: false,
        error: 'Ticket nicht gefunden',
      }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      customerName: ticket.customerName,
    });
  } catch (error) {
    console.error('Rating validation error:', error);
    return NextResponse.json({
      valid: false,
      error: 'Unbekannter Fehler',
    }, { status: 500 });
  }
}

// POST: Submit rating
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { rating, comment } = body;

    // Validate rating
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Ungültige Bewertung (1-5 erforderlich)',
      }, { status: 400 });
    }

    // Submit rating
    const result = await submitTicketRating(token, rating, comment);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Vielen Dank für Ihre Bewertung!',
    });
  } catch (error) {
    console.error('Rating submission error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
