/**
 * Stripe Customers API Route
 * Handles Stripe customer creation and management
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { ApiClientFactory } from "@packages/api-clients";
import {
  validateEmail,
  validateCurrency,
} from "@packages/backend/convex/lib/validation";

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

// POST /api/stripe/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { email, name, currency = "usd" } = body;

    // Validate input
    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    if (!validateCurrency(currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    // Create customer via Stripe API client
    const stripeClient = apiFactory.getStripeClient();
    const customer = await stripeClient.createCustomer({
      email,
      name,
      currency,
      metadata: {
        clerkUserId: userId,
      },
    });

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Error creating customer:", error);

    return NextResponse.json(
      {
        error: "Failed to create customer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET /api/stripe/customers - Get customer by user ID
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get customer ID from query params
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    // Get customer via Stripe API client
    const stripeClient = apiFactory.getStripeClient();
    const customer = await stripeClient.getCustomer(customerId);

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Error fetching customer:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch customer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PATCH /api/stripe/customers - Update customer
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { customerId, email, name, metadata } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 },
      );
    }

    // Validate email if provided
    if (email && !validateEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Update customer via Stripe API client
    const stripeClient = apiFactory.getStripeClient();
    const customer = await stripeClient.updateCustomer(customerId, {
      email,
      name,
      metadata,
    });

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("Error updating customer:", error);

    return NextResponse.json(
      {
        error: "Failed to update customer",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
