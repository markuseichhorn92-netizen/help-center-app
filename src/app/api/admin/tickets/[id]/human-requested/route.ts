import { NextRequest, NextResponse } from "next/server";
import { isHumanRequested } from "@/lib/ai-autoreply";
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
    const humanRequested = await isHumanRequested(id);

    return NextResponse.json({ humanRequested });
  } catch (error) {
    console.error("Error checking human requested status:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
