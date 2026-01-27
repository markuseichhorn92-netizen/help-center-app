import { NextRequest, NextResponse } from "next/server";
import {
  generatePortalToken,
  checkRateLimit,
  isValidEmail,
  isValidTicketNumber,
} from "@/lib/portal";
import { findTicketByNumber, findTicketsByEmail } from "@/lib/tickets";
import { sendPortalMagicLink } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const { ticketNumber, email } = await req.json();

    // Validate inputs
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Bitte geben Sie eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
    }

    // Check rate limit
    const allowed = await checkRateLimit(email);
    if (!allowed) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
        { status: 429 }
      );
    }

    let ticketId: string | undefined;
    let customerName: string = "Kunde";

    // If ticket number provided, verify it belongs to the email
    if (ticketNumber) {
      if (!isValidTicketNumber(ticketNumber)) {
        return NextResponse.json(
          { error: "Ungültiges Ticket-Format. Bitte geben Sie eine gültige Ticketnummer ein (z.B. TKT-001)." },
          { status: 400 }
        );
      }

      const ticket = await findTicketByNumber(ticketNumber.toUpperCase());

      if (!ticket) {
        return NextResponse.json(
          { error: "Ticket nicht gefunden. Bitte überprüfen Sie die Ticketnummer." },
          { status: 404 }
        );
      }

      // Verify email matches
      if (ticket.customerEmail.toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          { error: "Die E-Mail-Adresse stimmt nicht mit dem Ticket überein." },
          { status: 403 }
        );
      }

      ticketId = ticket.id;
      customerName = ticket.customerName;
    } else {
      // No ticket number - check if email has any tickets
      const tickets = await findTicketsByEmail(email);

      if (!tickets || tickets.length === 0) {
        return NextResponse.json(
          { error: "Keine Tickets für diese E-Mail-Adresse gefunden." },
          { status: 404 }
        );
      }

      // Use the most recent ticket's customer name
      const sortedTickets = tickets.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      customerName = sortedTickets[0].customerName;
    }

    // Generate magic link token
    const token = await generatePortalToken(email, ticketId);

    // Send magic link email
    try {
      await sendPortalMagicLink(email, customerName, token.token, ticketNumber);
    } catch (emailError) {
      console.error("Failed to send magic link email:", emailError);
      return NextResponse.json(
        { error: "E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Ein Zugangslink wurde an Ihre E-Mail-Adresse gesendet.",
    });
  } catch (error) {
    console.error("Portal auth request error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}
