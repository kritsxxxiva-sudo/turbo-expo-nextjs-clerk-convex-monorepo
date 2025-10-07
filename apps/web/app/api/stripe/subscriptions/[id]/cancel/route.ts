/**
 * Stripe Subscription Cancellation API Route
 * Handles subscription cancellation with options
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { ApiClientFactory } from "@packages/api-clients";

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

// POST /api/stripe/subscriptions/[id]/cancel - Cancel subscription
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptionId = params.id;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { cancelAtPeriodEnd = true } = body;

    // Cancel subscription via Stripe API client
    const stripeClient = apiFactory.getStripeClient();
    const subscription = await stripeClient.cancelSubscription(
      subscriptionId,
      cancelAtPeriodEnd,
    );

    return NextResponse.json({
      success: true,
      subscription,
      message: cancelAtPeriodEnd
        ? "Subscription will be canceled at the end of the current period"
        : "Subscription has been canceled immediately",
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);

    return NextResponse.json(
      {
        error: "Failed to cancel subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
