import { NextRequest, NextResponse } from "next/server";
import { setAdminStatus, getAdminPresence } from "@/lib/portal";
import { requireAdmin } from '@/lib/admin-auth';

// GET: Get current admin status
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const presence = await getAdminPresence();
    return NextResponse.json(presence);
  } catch (error) {
    console.error("Error getting admin presence:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Set admin online/offline status
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { status } = await req.json();

    if (status !== "online" && status !== "offline") {
      return NextResponse.json(
        { error: "Invalid status. Must be 'online' or 'offline'" },
        { status: 400 }
      );
    }

    const presence = await setAdminStatus(status);
    return NextResponse.json(presence);
  } catch (error) {
    console.error("Error setting admin status:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
