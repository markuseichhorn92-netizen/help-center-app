import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription, PushSubscription } from "@/lib/push-notifications";

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscription = await req.json() as PushSubscription;

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    await savePushSubscription(subscription);

    console.log("[Push] New subscription saved:", subscription.endpoint.slice(0, 50) + "...");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
