import { NextRequest, NextResponse } from "next/server";
import { isHumanRequested } from "@/lib/ai-autoreply";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check session cookie
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const humanRequested = await isHumanRequested(id);

    return NextResponse.json({ humanRequested });
  } catch (error) {
    console.error("Error checking human requested status:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
