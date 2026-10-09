import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  return NextResponse.json({ publicKey: vapidPublicKey });
}
