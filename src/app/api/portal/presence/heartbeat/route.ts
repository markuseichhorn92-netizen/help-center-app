import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSession, updateCustomerPresence } from "@/lib/portal";

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

    // Get ticket ID from request body (optional)
    let ticketId: string | undefined;
    try {
      const body = await req.json();
      ticketId = body.ticketId;
    } catch {
      // Body is optional
    }

    // Update customer presence
    await updateCustomerPresence(session.email, ticketId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Customer presence heartbeat error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
