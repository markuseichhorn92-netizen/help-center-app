import { NextRequest, NextResponse } from "next/server";
import { updateAdminPresence } from "@/lib/portal";

export async function POST(req: NextRequest) {
  try {
    // Check admin session
    const sessionCookie = req.cookies.get("admin_session");
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update admin presence
    await updateAdminPresence();

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error("Admin presence heartbeat error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
