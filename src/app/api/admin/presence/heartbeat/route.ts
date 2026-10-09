import { NextRequest, NextResponse } from "next/server";
import { updateAdminPresence } from "@/lib/portal";
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  try {
    // Check admin session
    const denied = await requireAdmin(req);
    if (denied) return denied;

    // Update admin presence
    await updateAdminPresence();

    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error("Admin presence heartbeat error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
