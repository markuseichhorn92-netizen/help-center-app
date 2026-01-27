import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSession } from "@/lib/portal";
import { findTicketsByEmail } from "@/lib/tickets";

export async function GET(req: NextRequest) {
  try {
    // Get session cookie
    const sessionId = req.cookies.get("portal_session")?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // Verify session
    const session = await verifyPortalSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session abgelaufen" },
        { status: 401 }
      );
    }

    // Get all tickets for this email
    const tickets = await findTicketsByEmail(session.email);

    // Sanitize tickets for customer view
    const sanitizedTickets = tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      channel: ticket.channel,
    }));

    return NextResponse.json({ tickets: sanitizedTickets });
  } catch (error) {
    console.error("Portal tickets fetch error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
