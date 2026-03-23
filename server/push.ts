import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

let pushConfigured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:contact@macommande.shop",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  pushConfigured = true;
  console.log("[Push] Web Push configured with VAPID keys");
} else {
  console.log("[Push] VAPID keys not configured — push notifications disabled");
}

export function isPushConfigured(): boolean {
  return pushConfigured;
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured) return 0;

  const subscriptions = await storage.getPushSubscriptions(userId);
  if (subscriptions.length === 0) return 0;

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await storage.deletePushSubscription(sub.id);
      } else {
        console.error("[Push] Send failed:", err.statusCode || err.message);
      }
    }
  }
  return sent;
}

export async function pushNewOrderToRestaurant(
  restaurantId: string,
  orderId: string,
  customerName: string,
  total: number,
  orderType: string
): Promise<void> {
  const restaurant = await storage.getRestaurant(restaurantId);
  if (!restaurant) return;

  const typeLabel = orderType === "delivery" ? "Livraison" : "À emporter";

  await sendPushToUser(restaurant.ownerId, {
    title: `🔔 Nouvelle commande !`,
    body: `${customerName} — ${total.toFixed(2)}€ (${typeLabel})`,
    tag: `new-order-${orderId}`,
    data: { type: "new_order", orderId, restaurantId, slug: restaurant.slug },
  });
}

export async function pushOrderStatusToCustomer(
  customerId: string,
  orderId: string,
  restaurantName: string,
  status: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    confirmed: "✅ Confirmée",
    preparing: "👨‍🍳 En préparation",
    ready: "🔔 Prête !",
    delivered: "🎉 Livrée",
    picked_up: "🎉 Récupérée",
    cancelled: "❌ Annulée",
  };

  const label = statusLabels[status];
  if (!label) return;

  await sendPushToUser(customerId, {
    title: `Commande #${orderId.slice(0, 8)}`,
    body: `${restaurantName} — ${label}`,
    tag: `order-status-${orderId}`,
    data: { type: "order_status", orderId, status },
  });
}
