import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSession } from "@/lib/portal";
import { kv } from "@vercel/kv";

// POST - Set typing status
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

    const { ticketId, isTyping } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ success: false, error: "Missing ticketId" }, { status: 400 });
    }

    const key = `portal:typing:${ticketId}`;

    if (isTyping) {
      // Set typing indicator with 3 second TTL
      await kv.set(key, { email: session.email, timestamp: Date.now() });
      await kv.expire(key, 3);
    } else {
      // Remove typing indicator
      await kv.del(key);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Portal typing error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
