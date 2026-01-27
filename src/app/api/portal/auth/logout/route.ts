import { NextRequest, NextResponse } from "next/server";
import { deletePortalSession } from "@/lib/portal";

export async function POST(req: NextRequest) {
  try {
    const sessionId = req.cookies.get("portal_session")?.value;

    if (sessionId) {
      // Delete session from KV
      await deletePortalSession(sessionId);
    }

    // Clear cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set("portal_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Portal logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
