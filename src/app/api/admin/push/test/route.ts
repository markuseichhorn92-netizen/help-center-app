import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification, getAllPushSubscriptions } from "@/lib/push-notifications";

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check VAPID keys
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;

    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({
        error: "VAPID keys not configured",
        vapidPublicSet: !!vapidPublic,
        vapidPrivateSet: !!vapidPrivate,
        vapidSubjectSet: !!vapidSubject,
      }, { status: 500 });
    }

    // Get subscriptions
    const subscriptions = await getAllPushSubscriptions();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        error: "No push subscriptions found",
        message: "Bitte erst auf das Glocken-Symbol klicken um Push zu aktivieren",
      }, { status: 400 });
    }

    // Send test notification
    const result = await sendPushNotification({
      title: "Test Benachrichtigung",
      body: "Push-Benachrichtigungen funktionieren!",
      tag: "test",
      url: "/admin/tickets",
    });

    return NextResponse.json({
      success: true,
      subscriptionCount: subscriptions.length,
      result,
    });
  } catch (error: any) {
    console.error("Push test error:", error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subscriptions = await getAllPushSubscriptions();

    return NextResponse.json({
      vapidPublicSet: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      vapidPrivateSet: !!process.env.VAPID_PRIVATE_KEY,
      vapidSubjectSet: !!process.env.VAPID_SUBJECT,
      subscriptionCount: subscriptions.length,
      subscriptions: subscriptions.map(s => ({
        endpoint: s.endpoint.substring(0, 50) + "...",
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
