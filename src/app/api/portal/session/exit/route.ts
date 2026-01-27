import { NextRequest, NextResponse } from "next/server";
import {
  verifyPortalSession,
  getSessionActivity,
  markSessionEmailSent,
  clearSessionActivity,
} from "@/lib/portal";
import { getTicket, getTicketMessages } from "@/lib/tickets";
import { sendSessionSummaryEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    // Get session cookie
    const sessionId = req.cookies.get("portal_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Verify session
    const session = await verifyPortalSession(sessionId);

    if (!session) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Get ticket ID from request body
    const { ticketId } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ success: false, error: "Missing ticketId" }, { status: 400 });
    }

    // Get session activity
    const activity = await getSessionActivity(session.email, ticketId);

    if (!activity) {
      // No activity to process
      return NextResponse.json({ success: true, emailSent: false });
    }

    // Check if email was already sent
    if (activity.emailSent) {
      return NextResponse.json({ success: true, emailSent: false, reason: "already_sent" });
    }

    // Only send email if messages were exchanged during this session
    if (activity.messagesExchanged === 0) {
      // Clear activity since no messages were exchanged
      await clearSessionActivity(session.email, ticketId);
      return NextResponse.json({ success: true, emailSent: false, reason: "no_messages" });
    }

    // Get ticket and messages
    const ticket = await getTicket(ticketId);

    if (!ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    // Verify ownership
    if (ticket.customerEmail.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    // Get messages for the summary
    const messages = await getTicketMessages(ticketId);

    // Only include messages from this session (since startedAt)
    const sessionStartTime = new Date(activity.startedAt).getTime();
    const sessionMessages = messages.filter(
      (msg) => new Date(msg.createdAt).getTime() >= sessionStartTime
    );

    if (sessionMessages.length === 0) {
      await clearSessionActivity(session.email, ticketId);
      return NextResponse.json({ success: true, emailSent: false, reason: "no_session_messages" });
    }

    // Send session summary email
    try {
      await sendSessionSummaryEmail(
        ticket.customerEmail,
        ticket.customerName,
        ticket.ticketNumber,
        ticket.subject,
        sessionMessages
      );

      // Mark as sent
      await markSessionEmailSent(session.email, ticketId);

      return NextResponse.json({ success: true, emailSent: true });
    } catch (emailError) {
      console.error("Failed to send session summary email:", emailError);
      return NextResponse.json({
        success: true,
        emailSent: false,
        reason: "email_failed",
      });
    }
  } catch (error) {
    console.error("Portal session exit error:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
