import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSession, incrementSessionMessages } from "@/lib/portal";
import { getTicket, getTicketMessages, createMessage, updateTicket } from "@/lib/tickets";

// GET - Retrieve messages for a ticket
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

    // Get messages
    const messages = await getTicketMessages(id);

    // Sanitize messages for customer view (remove internal data)
    const sanitizedMessages = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      senderName: msg.sender === "customer" ? ticket.customerName : "FIT INN Support",
      createdAt: msg.createdAt,
      attachments: msg.attachments,
    }));

    return NextResponse.json({ messages: sanitizedMessages });
  } catch (error) {
    console.error("Portal messages fetch error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}

// POST - Add a new message to a ticket
export async function POST(
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

    // Check if ticket is closed
    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "Dieses Ticket ist geschlossen. Bitte erstellen Sie ein neues Ticket." },
        { status: 400 }
      );
    }

    // Get message content
    const { content } = await req.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Nachricht darf nicht leer sein" },
        { status: 400 }
      );
    }

    // Limit message length
    if (content.length > 10000) {
      return NextResponse.json(
        { error: "Nachricht ist zu lang (max. 10.000 Zeichen)" },
        { status: 400 }
      );
    }

    // Create message
    const message = await createMessage({
      ticketId: id,
      content: content.trim(),
      sender: "customer",
      senderName: ticket.customerName,
      senderEmail: ticket.customerEmail,
      channel: "web",
    });

    // If ticket was resolved, reopen it
    if (ticket.status === "resolved") {
      await updateTicket(id, { status: "open" });
    }

    // Track session activity
    await incrementSessionMessages(session.email, id);

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        sender: message.sender,
        senderName: ticket.customerName,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error("Portal message create error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
