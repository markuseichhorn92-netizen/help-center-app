import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription, PushSubscription } from "@/lib/push-notifications";
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

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
