import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSession } from "@/lib/portal";
import { createTicket, createMessage } from "@/lib/tickets";
import { sendNewTicketNotification } from "@/lib/resend";
import { portalTicketSchema, validateBody } from "@/lib/validation";

// POST: Create a new ticket from the portal
export async function POST(req: NextRequest) {
  // Verify portal session
  const sessionCookie = req.cookies.get("portal_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifyPortalSession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const validation = validateBody(portalTicketSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { subject, message, name } = validation.data;
    // Attachments keep their original shape (not stripped by the schema).
    const attachments = body.attachments;

    // Validate attachments if provided
    if (attachments && Array.isArray(attachments)) {
      if (attachments.length > 3) {
        return NextResponse.json(
          { error: "Maximal 3 Anhänge erlaubt" },
          { status: 400 }
        );
      }
      for (const att of attachments) {
        if (!att.filename || !att.url) {
          return NextResponse.json(
            { error: "Ungültiges Anhang-Format" },
            { status: 400 }
          );
        }
      }
    }

    // Create the ticket
    const { ticket } = await createTicket({
      customerName: name || session.email.split("@")[0],
      customerEmail: session.email,
      subject,
      content: message,
      channel: "web",
      priority: "medium",
      attachments: attachments || undefined,
    });

    // If there's additional content beyond the initial message, create it
    // (The createTicket function already creates the first message)

    // Send notification to admin
    try {
      await sendNewTicketNotification({
        ticketNumber: ticket.ticketNumber,
        customerName: name || session.email.split("@")[0],
        customerEmail: session.email,
        subject,
        channel: "web",
        isEscalation: false,
      });
    } catch (emailError) {
      console.error("Failed to send admin notification:", emailError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
    });
  } catch (error: any) {
    console.error("Error creating ticket from portal:", error);
    return NextResponse.json(
      { error: "Fehler beim Erstellen des Tickets", details: error.message },
      { status: 500 }
    );
  }
}
