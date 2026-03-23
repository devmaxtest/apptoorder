import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
  }
  return stripeInstance;
}

export function getRestaurantStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: "2025-04-30.basil" as any });
}

export const PLANS = {
  starter: {
    name: "Starter",
    price: 9900,
    currency: "eur",
    interval: "month" as const,
    description: "Commande en ligne + gestion menu",
  },
  pro: {
    name: "Pro",
    price: 14900,
    currency: "eur",
    interval: "month" as const,
    description: "Starter + MyBusiness + ChatMaxAI + Fidélité",
  },
};

export async function createSubscriptionCheckout(
  restaurantId: string,
  restaurantName: string,
  email: string,
  plan: keyof typeof PLANS,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const planInfo = PLANS[plan];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card", "sepa_debit"],
    customer_email: email,
    metadata: { restaurantId, plan },
    line_items: [
      {
        price_data: {
          currency: planInfo.currency,
          unit_amount: planInfo.price,
          recurring: { interval: planInfo.interval },
          product_data: {
            name: `macommande.shop — ${planInfo.name}`,
            description: `${planInfo.description} pour ${restaurantName}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.APP_URL || "https://macommande.shop"}/admin?billing=success&restaurant=${restaurantId}`,
    cancel_url: `${process.env.APP_URL || "https://macommande.shop"}/admin?billing=cancel`,
  });

  return session.url;
}

export async function createOrderCheckoutSession(
  restaurantSecretKey: string,
  orderId: string,
  items: { name: string; price: number; quantity: number }[],
  customerEmail?: string,
): Promise<{ sessionId: string; url: string } | null> {
  const stripe = getRestaurantStripe(restaurantSecretKey);

  const lineItems = items.map((item) => ({
    price_data: {
      currency: "eur",
      unit_amount: Math.round(item.price * 100),
      product_data: { name: item.name },
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: customerEmail || undefined,
    metadata: { orderId },
    line_items: lineItems,
    success_url: `${process.env.APP_URL || "https://macommande.shop"}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL || "https://macommande.shop"}/order-cancel`,
  });

  return { sessionId: session.id, url: session.url! };
}
