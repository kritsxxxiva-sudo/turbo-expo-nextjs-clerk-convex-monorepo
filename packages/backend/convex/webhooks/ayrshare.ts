/**
 * Ayrshare Webhook Handlers
 * Processes Ayrshare social media events and syncs post data
 */

import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";
import { webhookMiddleware } from "../lib/webhookAuth";
import { withErrorHandling, globalErrorAggregator } from "../lib/errorHandling";

// Main Ayrshare webhook handler
export const ayrshareWebhook = httpAction(async (ctx, request) => {
  const handleWebhook = withErrorHandling(
    async () => {
      const payload = await request.text();
      const signature = request.headers.get("x-ayrshare-signature") || "";

      // Get webhook secret from environment
      const webhookSecret = process.env.AYRSHARE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new ConvexError("AYRSHARE_WEBHOOK_SECRET not configured");
      }

      // Verify webhook signature
      const middleware = webhookMiddleware.ayrshare(webhookSecret);
      const verification = middleware(payload, {
        "x-ayrshare-signature": signature,
        "content-type": "application/json",
      });

      // Parse webhook event
      const event = JSON.parse(payload);
      console.log("Ayrshare webhook event:", event.type);

      // Log webhook event for audit trail
      await ctx.runMutation(internal.webhookEvents.createWebhookEvent, {
        source: "ayrshare",
        eventType: event.type,
        eventId: event.id || `ayrshare_${Date.now()}`,
        payload: event,
        processed: false,
        retryCount: 0,
      });

      // Process the event based on type
      switch (event.type) {
        // Post events
        case "post.published":
          await handlePostPublished(ctx, event);
          break;

        case "post.failed":
          await handlePostFailed(ctx, event);
          break;

        case "post.deleted":
          await handlePostDeleted(ctx, event);
          break;

        // Account events
        case "account.connected":
          await handleAccountConnected(ctx, event);
          break;

        case "account.disconnected":
          await handleAccountDisconnected(ctx, event);
          break;

        // Analytics events
        case "analytics.updated":
          await handleAnalyticsUpdated(ctx, event);
          break;

        // Rate limit events
        case "rate_limit.reached":
          await handleRateLimitReached(ctx, event);
          break;

        default:
          console.log(`Unhandled Ayrshare webhook event: ${event.type}`);
      }

      // Mark webhook as processed
      await ctx.runMutation(internal.webhookEvents.markWebhookProcessed, {
        source: "ayrshare",
        eventId: event.id || `ayrshare_${Date.now()}`,
      });

      return new Response("OK", { status: 200 });
    },
    {
      context: "ayrshare-webhook",
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
        jitter: true,
        retryableErrors: ["NETWORK_ERROR", "TIMEOUT", "SERVER_ERROR"],
      },
    },
  );

  try {
    return await handleWebhook();
  } catch (error) {
    console.error("Ayrshare webhook error:", error);

    // Log the error for debugging
    try {
      const payload = await request.text();
      const event = JSON.parse(payload);

      await ctx.runMutation(internal.webhookEvents.markWebhookError, {
        source: "ayrshare",
        eventId: event.id || `ayrshare_${Date.now()}`,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }

    return new Response("Internal Server Error", { status: 500 });
  }
});

// Handle post.published event
async function handlePostPublished(ctx: any, event: any) {
  try {
    const postData = event.data;

    // Find the post by Ayrshare post ID
    const posts = await ctx.runQuery(internal.socialPosts.getPostsByStatus, {
      status: "scheduled",
      limit: 100,
    });

    const matchingPost = posts.find(
      (post: any) =>
        post.ayrsharePostId === postData.id || post.content === postData.post,
    );

    if (!matchingPost) {
      console.warn(`No matching post found for Ayrshare post: ${postData.id}`);
      return;
    }

    // Update post status to published
    await ctx.runMutation(internal.socialPosts.updatePostStatus, {
      postId: matchingPost._id,
      status: "published",
      publishedAt: Date.now(),
      ayrsharePostId: postData.id,
    });

    console.log(`Post published: ${postData.id} -> ${matchingPost._id}`);
  } catch (error) {
    console.error("Error handling post.published:", error);
    throw error;
  }
}

// Handle post.failed event
async function handlePostFailed(ctx: any, event: any) {
  try {
    const postData = event.data;
    const errorData = postData.error || {};

    // Find the post by Ayrshare post ID or content
    const posts = await ctx.runQuery(internal.socialPosts.getPostsByStatus, {
      status: "scheduled",
      limit: 100,
    });

    const matchingPost = posts.find(
      (post: any) =>
        post.ayrsharePostId === postData.id || post.content === postData.post,
    );

    if (!matchingPost) {
      console.warn(
        `No matching post found for failed Ayrshare post: ${postData.id}`,
      );
      return;
    }

    // Add error to post
    await ctx.runMutation(internal.socialPosts.addPostError, {
      postId: matchingPost._id,
      platform: errorData.platform || "unknown",
      error: errorData.message || "Post failed to publish",
    });

    console.log(`Post failed: ${postData.id} -> ${matchingPost._id}`);
  } catch (error) {
    console.error("Error handling post.failed:", error);
    throw error;
  }
}

// Handle post.deleted event
async function handlePostDeleted(ctx: any, event: any) {
  try {
    const postData = event.data;

    // Find the post by Ayrshare post ID
    const posts = await ctx.runQuery(internal.socialPosts.getPostsByStatus, {
      status: "published",
      limit: 100,
    });

    const matchingPost = posts.find(
      (post: any) => post.ayrsharePostId === postData.id,
    );

    if (!matchingPost) {
      console.warn(
        `No matching post found for deleted Ayrshare post: ${postData.id}`,
      );
      return;
    }

    // Update post status to deleted
    await ctx.runMutation(internal.socialPosts.updatePostStatus, {
      postId: matchingPost._id,
      status: "deleted",
    });

    console.log(`Post deleted: ${postData.id} -> ${matchingPost._id}`);
  } catch (error) {
    console.error("Error handling post.deleted:", error);
    throw error;
  }
}

// Handle account.connected event
async function handleAccountConnected(ctx: any, event: any) {
  try {
    const accountData = event.data;

    console.log(
      `Account connected: ${accountData.platform} - ${accountData.accountName}`,
    );

    // Update last sync time for the account
    const accounts = await ctx.runQuery(
      internal.socialAccounts.getAccountsByPlatform,
      {
        platform: accountData.platform,
        activeOnly: true,
        limit: 50,
      },
    );

    const matchingAccount = accounts.find(
      (account: any) =>
        account.accountId === accountData.accountId ||
        account.accountName === accountData.accountName,
    );

    if (matchingAccount) {
      await ctx.runMutation(internal.socialAccounts.updateLastSync, {
        accountId: matchingAccount._id,
      });
    }
  } catch (error) {
    console.error("Error handling account.connected:", error);
    throw error;
  }
}

// Handle account.disconnected event
async function handleAccountDisconnected(ctx: any, event: any) {
  try {
    const accountData = event.data;

    console.log(
      `Account disconnected: ${accountData.platform} - ${accountData.accountName}`,
    );

    // Deactivate the account
    const accounts = await ctx.runQuery(
      internal.socialAccounts.getAccountsByPlatform,
      {
        platform: accountData.platform,
        activeOnly: true,
        limit: 50,
      },
    );

    const matchingAccount = accounts.find(
      (account: any) =>
        account.accountId === accountData.accountId ||
        account.accountName === accountData.accountName,
    );

    if (matchingAccount) {
      await ctx.runMutation(internal.socialAccounts.deactivateSocialAccount, {
        accountId: matchingAccount._id,
      });
    }
  } catch (error) {
    console.error("Error handling account.disconnected:", error);
    throw error;
  }
}

// Handle analytics.updated event
async function handleAnalyticsUpdated(ctx: any, event: any) {
  try {
    const analyticsData = event.data;

    // Find the post by Ayrshare post ID
    const posts = await ctx.runQuery(internal.socialPosts.getPostsByStatus, {
      status: "published",
      limit: 100,
    });

    const matchingPost = posts.find(
      (post: any) => post.ayrsharePostId === analyticsData.postId,
    );

    if (!matchingPost) {
      console.warn(
        `No matching post found for analytics update: ${analyticsData.postId}`,
      );
      return;
    }

    // Update post analytics
    await ctx.runMutation(internal.socialPosts.updatePostAnalytics, {
      postId: matchingPost._id,
      analytics: {
        views: analyticsData.views || 0,
        likes: analyticsData.likes || 0,
        shares: analyticsData.shares || 0,
        comments: analyticsData.comments || 0,
        clicks: analyticsData.clicks || 0,
        lastUpdated: Date.now(),
      },
    });

    console.log(
      `Analytics updated for post: ${analyticsData.postId} -> ${matchingPost._id}`,
    );
  } catch (error) {
    console.error("Error handling analytics.updated:", error);
    throw error;
  }
}

// Handle rate_limit.reached event
async function handleRateLimitReached(ctx: any, event: any) {
  try {
    const rateLimitData = event.data;

    console.warn(
      `Rate limit reached for ${rateLimitData.platform}: ${rateLimitData.message}`,
    );

    // TODO: Implement rate limit handling
    // - Pause posting for the affected platform
    // - Notify users about rate limit
    // - Reschedule posts if needed
  } catch (error) {
    console.error("Error handling rate_limit.reached:", error);
    throw error;
  }
}

// Health check endpoint for Ayrshare webhooks
export const ayrshareWebhookHealth = httpAction(async (ctx, request) => {
  return new Response(
    JSON.stringify({
      status: "healthy",
      service: "ayrshare-webhooks",
      timestamp: new Date().toISOString(),
      errorSummary: globalErrorAggregator.getErrorSummary().slice(0, 5),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
});
