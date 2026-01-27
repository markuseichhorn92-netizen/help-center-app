import { kv } from "@vercel/kv";
import webpush from "web-push";

// Initialize web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@fit-inn-trier.de";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  ticketId?: string;
  requireInteraction?: boolean;
}

/**
 * Save a push subscription
 */
export async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  const subscriptionId = Buffer.from(subscription.endpoint).toString("base64").slice(0, 64);

  await kv.hset(`push:subscription:${subscriptionId}`, {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    createdAt: new Date().toISOString(),
  });

  await kv.sadd("push:subscriptions", subscriptionId);
}

/**
 * Remove a push subscription
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const subscriptionId = Buffer.from(endpoint).toString("base64").slice(0, 64);

  await kv.del(`push:subscription:${subscriptionId}`);
  await kv.srem("push:subscriptions", subscriptionId);
}

/**
 * Get all push subscriptions
 */
export async function getAllPushSubscriptions(): Promise<PushSubscription[]> {
  const subscriptionIds: string[] = await kv.smembers("push:subscriptions") || [];

  const subscriptions = await Promise.all(
    subscriptionIds.map(async (id) => {
      const data = await kv.hgetall<{
        endpoint: string;
        p256dh: string;
        auth: string;
      }>(`push:subscription:${id}`);

      if (!data) return null;

      return {
        endpoint: data.endpoint,
        keys: {
          p256dh: data.p256dh,
          auth: data.auth,
        },
      };
    })
  );

  return subscriptions.filter((s): s is PushSubscription => s !== null);
}

/**
 * Send push notification to all subscribed devices
 */
export async function sendPushNotification(payload: PushNotificationPayload): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("[Push] VAPID keys not configured, skipping push notification");
    return { success: 0, failed: 0, errors: ["VAPID keys not configured"] };
  }

  const subscriptions = await getAllPushSubscriptions();

  if (subscriptions.length === 0) {
    console.log("[Push] No subscriptions found");
    return { success: 0, failed: 0, errors: [] };
  }

  console.log(`[Push] Sending notification to ${subscriptions.length} devices`);

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/favicon.png",
    badge: payload.badge || "/favicon.png",
    tag: payload.tag || "default",
    url: payload.url || "/admin/tickets",
    ticketId: payload.ticketId,
    requireInteraction: payload.requireInteraction || false,
  });

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, notificationPayload);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(error.message);

        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push] Removing invalid subscription: ${subscription.endpoint.slice(0, 50)}...`);
          await removePushSubscription(subscription.endpoint);
        }
      }
    })
  );

  console.log(`[Push] Sent: ${success}, Failed: ${failed}`);
  return { success, failed, errors };
}

/**
 * Send notification for new ticket message
 */
export async function notifyNewMessage(params: {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  preview: string;
}): Promise<void> {
  await sendPushNotification({
    title: `Neue Nachricht von ${params.customerName}`,
    body: params.preview.slice(0, 100) + (params.preview.length > 100 ? "..." : ""),
    tag: `ticket-${params.ticketId}`,
    url: `/admin/tickets/${params.ticketId}`,
    ticketId: params.ticketId,
  });
}

/**
 * Send notification for escalated ticket
 */
export async function notifyEscalation(params: {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
}): Promise<void> {
  await sendPushNotification({
    title: "Mitarbeiter angefordert!",
    body: `${params.customerName} möchte mit einem Mitarbeiter sprechen (${params.ticketNumber})`,
    tag: `escalation-${params.ticketId}`,
    url: `/admin/tickets/${params.ticketId}`,
    ticketId: params.ticketId,
    requireInteraction: true,
  });
}

/**
 * Send notification for new ticket
 */
export async function notifyNewTicket(params: {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  subject: string;
}): Promise<void> {
  await sendPushNotification({
    title: `Neues Ticket: ${params.ticketNumber}`,
    body: `${params.customerName}: ${params.subject}`,
    tag: `new-ticket-${params.ticketId}`,
    url: `/admin/tickets/${params.ticketId}`,
    ticketId: params.ticketId,
  });
}
