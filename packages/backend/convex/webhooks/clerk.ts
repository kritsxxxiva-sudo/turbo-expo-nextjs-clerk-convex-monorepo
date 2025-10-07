/**
 * Clerk Webhook Handlers
 * Processes Clerk authentication events and syncs user data
 */

import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";

// Webhook signature verification
function verifyClerkWebhook(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return signature === expectedSignature;
  } catch (error) {
    console.error("Webhook verification error:", error);
    return false;
  }
}

// Main Clerk webhook handler
export const clerkWebhook = httpAction(async (ctx, request) => {
  try {
    const payload = await request.text();
    const signature = request.headers.get("clerk-signature") || "";

    // Get webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ConvexError("CLERK_WEBHOOK_SECRET not configured");
    }

    // Verify webhook signature
    if (!verifyClerkWebhook(payload, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse webhook event
    const event = JSON.parse(payload);
    console.log("Clerk webhook event:", event.type);

    // Log webhook event for audit trail
    await ctx.runMutation(internal.webhookEvents.createWebhookEvent, {
      source: "clerk",
      eventType: event.type,
      eventId: event.data?.id || `clerk_${Date.now()}`,
      payload: event,
      processed: false,
      retryCount: 0,
    });

    // Process the event based on type
    switch (event.type) {
      case "user.created":
        await handleUserCreated(ctx, event);
        break;

      case "user.updated":
        await handleUserUpdated(ctx, event);
        break;

      case "user.deleted":
        await handleUserDeleted(ctx, event);
        break;

      case "session.created":
        await handleSessionCreated(ctx, event);
        break;

      case "session.ended":
        await handleSessionEnded(ctx, event);
        break;

      case "session.removed":
        await handleSessionRemoved(ctx, event);
        break;

      case "session.revoked":
        await handleSessionRevoked(ctx, event);
        break;

      default:
        console.log(`Unhandled Clerk webhook event: ${event.type}`);
    }

    // Mark webhook as processed
    await ctx.runMutation(internal.webhookEvents.markWebhookProcessed, {
      source: "clerk",
      eventId: event.data?.id || `clerk_${Date.now()}`,
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Clerk webhook error:", error);

    // Log the error for debugging
    try {
      const payload = await request.text();
      const event = JSON.parse(payload);

      await ctx.runMutation(internal.webhookEvents.markWebhookError, {
        source: "clerk",
        eventId: event.data?.id || `clerk_${Date.now()}`,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }

    return new Response("Internal Server Error", { status: 500 });
  }
});

// Handle user.created event
async function handleUserCreated(ctx: any, event: any) {
  try {
    const userData = event.data;

    // Extract user information
    const email = userData.email_addresses?.[0]?.email_address;
    const firstName = userData.first_name;
    const lastName = userData.last_name;
    const profileImageUrl = userData.profile_image_url;

    if (!email) {
      throw new Error("User email not found in webhook data");
    }

    // Create user in our database
    await ctx.runMutation(internal.users.createUser, {
      clerkId: userData.id,
      email,
      firstName,
      lastName,
      profileImageUrl,
      role: "free", // Default role for new users
    });

    console.log(`User created: ${userData.id} (${email})`);
  } catch (error) {
    console.error("Error handling user.created:", error);
    throw error;
  }
}

// Handle user.updated event
async function handleUserUpdated(ctx: any, event: any) {
  try {
    const userData = event.data;

    // Find existing user
    const existingUser = await ctx.runQuery(internal.users.getUserByClerkId, {
      clerkId: userData.id,
    });

    if (!existingUser) {
      console.warn(`User not found for update: ${userData.id}`);
      return;
    }

    // Extract updated information
    const email = userData.email_addresses?.[0]?.email_address;
    const firstName = userData.first_name;
    const lastName = userData.last_name;
    const profileImageUrl = userData.profile_image_url;

    // Update user in our database
    await ctx.runMutation(internal.users.updateUser, {
      userId: existingUser._id,
      firstName,
      lastName,
      profileImageUrl,
    });

    console.log(`User updated: ${userData.id} (${email})`);
  } catch (error) {
    console.error("Error handling user.updated:", error);
    throw error;
  }
}

// Handle user.deleted event
async function handleUserDeleted(ctx: any, event: any) {
  try {
    const userData = event.data;

    // Find existing user
    const existingUser = await ctx.runQuery(internal.users.getUserByClerkId, {
      clerkId: userData.id,
    });

    if (!existingUser) {
      console.warn(`User not found for deletion: ${userData.id}`);
      return;
    }

    // Soft delete user (update status instead of hard delete)
    await ctx.runMutation(internal.users.deleteUser, {
      userId: existingUser._id,
    });

    // End all user sessions
    await ctx.runMutation(internal.sessions.endAllUserSessions, {
      userId: existingUser._id,
    });

    console.log(`User deleted: ${userData.id}`);
  } catch (error) {
    console.error("Error handling user.deleted:", error);
    throw error;
  }
}

// Handle session.created event
async function handleSessionCreated(ctx: any, event: any) {
  try {
    const sessionData = event.data;

    // Find user by Clerk ID
    const user = await ctx.runQuery(internal.users.getUserByClerkId, {
      clerkId: sessionData.user_id,
    });

    if (!user) {
      console.warn(
        `User not found for session creation: ${sessionData.user_id}`,
      );
      return;
    }

    // Create session record
    await ctx.runMutation(internal.sessions.createSession, {
      userId: user._id,
      clerkSessionId: sessionData.id,
      metadata: {
        clerkData: sessionData,
      },
    });

    // Update user's last login time
    await ctx.runMutation(internal.users.updateLastLogin, {
      clerkId: sessionData.user_id,
    });

    console.log(
      `Session created: ${sessionData.id} for user ${sessionData.user_id}`,
    );
  } catch (error) {
    console.error("Error handling session.created:", error);
    throw error;
  }
}

// Handle session.ended event
async function handleSessionEnded(ctx: any, event: any) {
  try {
    const sessionData = event.data;

    // End session in our database
    await ctx.runMutation(internal.sessions.endSession, {
      clerkSessionId: sessionData.id,
    });

    console.log(`Session ended: ${sessionData.id}`);
  } catch (error) {
    console.error("Error handling session.ended:", error);
    throw error;
  }
}

// Handle session.removed event
async function handleSessionRemoved(ctx: any, event: any) {
  try {
    const sessionData = event.data;

    // End session in our database
    await ctx.runMutation(internal.sessions.endSession, {
      clerkSessionId: sessionData.id,
    });

    console.log(`Session removed: ${sessionData.id}`);
  } catch (error) {
    console.error("Error handling session.removed:", error);
    throw error;
  }
}

// Handle session.revoked event
async function handleSessionRevoked(ctx: any, event: any) {
  try {
    const sessionData = event.data;

    // End session in our database
    await ctx.runMutation(internal.sessions.endSession, {
      clerkSessionId: sessionData.id,
    });

    console.log(`Session revoked: ${sessionData.id}`);
  } catch (error) {
    console.error("Error handling session.revoked:", error);
    throw error;
  }
}

// Health check endpoint for Clerk webhooks
export const clerkWebhookHealth = httpAction(async (ctx, request) => {
  return new Response(
    JSON.stringify({
      status: "healthy",
      service: "clerk-webhooks",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
});
