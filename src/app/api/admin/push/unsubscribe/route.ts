import { NextRequest, NextResponse } from "next/server";
import { removePushSubscription } from "@/lib/push-notifications";
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

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
