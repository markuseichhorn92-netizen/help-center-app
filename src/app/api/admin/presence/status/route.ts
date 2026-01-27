import { NextRequest, NextResponse } from "next/server";
import { setAdminStatus, getAdminPresence } from "@/lib/portal";

// GET: Get current admin status
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
