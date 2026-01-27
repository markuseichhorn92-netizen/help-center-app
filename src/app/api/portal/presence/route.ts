import { NextResponse } from "next/server";
import { isAdminOnline, getEstimatedResponseTime } from "@/lib/portal";

export async function GET() {
  try {
    const online = await isAdminOnline();
    const estimatedResponseTime = await getEstimatedResponseTime();

    return NextResponse.json({
      online,
      estimatedResponseTime, // in seconds, or null if no data
    });
  } catch (error) {
    console.error("Portal presence check error:", error);
    return NextResponse.json({ online: false, estimatedResponseTime: null });
  }
}
