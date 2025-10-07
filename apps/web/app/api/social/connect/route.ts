/**
 * Social Media Connection API Route
 * Handles social media account connections via Ayrshare
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { ApiClientFactory } from "@packages/api-clients";
import { validatePlatform } from "@packages/backend/convex/lib/validation";

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

// POST /api/social/connect - Connect a social media account
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { platform, authToken, accountName, permissions } = body;

    // Validate input
    if (!platform || !validatePlatform(platform)) {
      return NextResponse.json(
        { error: "Valid platform is required" },
        { status: 400 },
      );
    }

    if (!authToken) {
      return NextResponse.json(
        { error: "Auth token is required" },
        { status: 400 },
      );
    }

    if (!accountName) {
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 },
      );
    }

    // Connect account via Ayrshare API client
    const ayrshareClient = apiFactory.getAyrshareClient();
    const account = await ayrshareClient.connectAccount({
      platform,
      authToken,
      accountName,
      permissions: permissions || ["read", "write"],
    });

    return NextResponse.json({
      success: true,
      account,
      message: `Successfully connected ${platform} account: ${accountName}`,
    });
  } catch (error) {
    console.error("Error connecting social account:", error);

    return NextResponse.json(
      {
        error: "Failed to connect social account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET /api/social/connect - Get connected accounts
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get connected accounts via Ayrshare API client
    const ayrshareClient = apiFactory.getAyrshareClient();
    const accounts = await ayrshareClient.getConnectedAccounts(userId);

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error("Error fetching connected accounts:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch connected accounts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
