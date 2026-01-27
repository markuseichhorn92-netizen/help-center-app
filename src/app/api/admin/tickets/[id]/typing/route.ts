import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// GET - Check if customer is typing
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
    const key = `portal:typing:${id}`;

    const typingData = await kv.get<{ email: string; timestamp: number }>(key);

    if (typingData) {
      // Check if typing indicator is still valid (within 3 seconds)
      const isValid = Date.now() - typingData.timestamp < 3000;
      return NextResponse.json({
        isTyping: isValid,
        email: isValid ? typingData.email : null,
      });
    }

    return NextResponse.json({ isTyping: false, email: null });
  } catch (error) {
    console.error("Error checking typing status:", error);
    return NextResponse.json({ isTyping: false, email: null });
  }
}
