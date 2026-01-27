import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSession } from "@/lib/portal";
import { getTicket } from "@/lib/tickets";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Get ticket
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket nicht gefunden" },
        { status: 404 }
      );
    }

    // Verify the session email matches the ticket customer email
    if (ticket.customerEmail.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    // Return ticket (sanitize sensitive data if needed)
    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        customerName: ticket.customerName,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        channel: ticket.channel,
      },
    });
  } catch (error) {
    console.error("Portal ticket fetch error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
