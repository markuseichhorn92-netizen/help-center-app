import { NextRequest, NextResponse } from "next/server";
import { getTicket } from "@/lib/tickets";
import { getCustomerPresence } from "@/lib/portal";
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check session cookie
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Get customer presence
    const presence = await getCustomerPresence(ticket.customerEmail);

    return NextResponse.json({
      online: presence.online,
      lastSeen: presence.lastSeen,
      currentTicketId: presence.ticketId,
    });
  } catch (error) {
    console.error("Error getting customer presence:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
