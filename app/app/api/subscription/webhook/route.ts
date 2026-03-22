import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STRIPE_PRICE_IDS } from "@/lib/subscription";

/**
 * POST /api/subscription/webhook
 * Handle Stripe webhook events for subscription updates
 *
 * Required Stripe events to configure:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */
export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 });
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: { type: string; data: { object: any } };

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    // Production: verify webhook signature to prevent spoofed events
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // Development fallback: no Stripe keys configured
    console.warn("STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev mode only)");
    try {
      event = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpdate(event.data.object);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionCanceled(event.data.object);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          console.log(`Payment succeeded for subscription: ${invoice.subscription}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        await handlePaymentFailed(event.data.object);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription: {
  id: string;
  customer: string;
  status: string;
  items: { data: Array<{ price: { id: string } }> };
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
}) {
  const priceId = subscription.items.data[0]?.price.id;

  // Determine tier from price ID using exact match against configured price IDs
  let tier: "FREE" | "PRO" | "FAMILY" = "FREE";
  if (
    priceId === STRIPE_PRICE_IDS.PRO_MONTHLY ||
    priceId === STRIPE_PRICE_IDS.PRO_YEARLY
  ) {
    tier = "PRO";
  } else if (
    priceId === STRIPE_PRICE_IDS.FAMILY_MONTHLY ||
    priceId === STRIPE_PRICE_IDS.FAMILY_YEARLY
  ) {
    tier = "FAMILY";
  }

  // Find user by Stripe customer ID
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: subscription.customer },
  });

  if (!user) {
    console.error(`No user found for customer: ${subscription.customer}`);
    return;
  }

  // Update user subscription
  await prisma.user.update({
    where: { id: user.id },
    data: {
      tier,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
    },
  });

  // Upsert subscription record
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    create: {
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId ?? null,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    update: {
      status: subscription.status,
      stripePriceId: priceId ?? null,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`Updated subscription for user ${user.id}: ${tier}`);
}

async function handleSubscriptionCanceled(subscription: {
  id: string;
  customer: string;
}) {
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: subscription.customer },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      tier: "FREE",
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
    },
  });

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: "canceled" },
  });

  console.log(`Subscription canceled for user ${user.id}`);
}

async function handlePaymentFailed(invoice: {
  subscription: string;
  customer: string;
}) {
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: invoice.customer },
  });

  if (!user) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: "past_due" },
  });

  console.log(`Payment failed for user ${user.id}`);
}
