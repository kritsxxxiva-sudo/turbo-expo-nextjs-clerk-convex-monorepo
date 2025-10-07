/**
 * Stripe Subscriptions API Route
 * Handles Stripe subscription creation and management
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { ApiClientFactory } from "@packages/api-clients";
import { validateStripePriceId } from "@packages/backend/convex/lib/validation";

// Initialize API client factory
const apiFactory = ApiClientFactory.createFromEnvironment({
  NODE_ENV: process.env.NODE_ENV as any,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET!,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
  AYRSHARE_API_KEY: process.env.AYRSHARE_API_KEY!,
  AYRSHARE_WEBHOOK_SECRET: process.env.AYRSHARE_WEBHOOK_SECRET!,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL!,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
});

// POST /api/stripe/subscriptions - Create a new subscription
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { customerId, priceId, trialPeriodDays, metadata } = body;

    // Validate input
    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    if (!priceId || !validateStripePriceId(priceId)) {
      return NextResponse.json(
        { error: "Valid price ID is required" },
        { status: 400 },
      );
    }

    // Create subscription via Stripe API client
    const stripeClient = apiFactory.getStripeClient();
    const subscription = await stripeClient.createSubscription({
      customerId,
      priceId,
      trialPeriodDays,
      metadata: {
        clerkUserId: userId,
        ...metadata,
      },
    });

    // Get client secret for payment confirmation if needed
    let clientSecret: string | undefined;
    if (subscription.status === "incomplete") {
      // Extract client secret from latest invoice payment intent
      const latestInvoice = subscription.latestInvoice;
      if (
        latestInvoice &&
        typeof latestInvoice === "object" &&
        latestInvoice.payment_intent
      ) {
        const paymentIntent = latestInvoice.payment_intent;
        if (typeof paymentIntent === "object" && paymentIntent.client_secret) {
          clientSecret = paymentIntent.client_secret;
        }
      }
    }

    return NextResponse.json({
      success: true,
      subscription,
      clientSecret,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);

    return NextResponse.json(
      {
        error: "Failed to create subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET /api/stripe/subscriptions - Get user's subscriptions
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get subscription ID from query params
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("subscriptionId");

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 },
      );
    }

    // Get subscription via Stripe API client
    const stripeClient = apiFactory.getStripeClient();
    const subscription = await stripeClient.getSubscription(subscriptionId);

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
