import { NextRequest, NextResponse } from "next/server";
import { removePushSubscription } from "@/lib/push-notifications";

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint required" }, { status: 400 });
    }

    await removePushSubscription(endpoint);

    console.log("[Push] Subscription removed:", endpoint.slice(0, 50) + "...");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing push subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
