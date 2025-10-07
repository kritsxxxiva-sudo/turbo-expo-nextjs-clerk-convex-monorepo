/**
 * Social Post Functions
 * Handles social media posting, scheduling, and analytics
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  validateSocialPostData,
  validatePostContent,
  validateScheduledDate,
  validateMediaUrl,
} from "../lib/validation";

// Post Analytics Schema
const postAnalyticsValidator = v.object({
  views: v.optional(v.number()),
  likes: v.optional(v.number()),
  shares: v.optional(v.number()),
  comments: v.optional(v.number()),
  clicks: v.optional(v.number()),
  lastUpdated: v.number(),
});

// Post Error Schema
const postErrorValidator = v.object({
  platform: v.string(),
  error: v.string(),
  timestamp: v.number(),
});

// Create Social Post
export const createSocialPost = mutation({
  args: {
    userId: v.id("users"),
    noteId: v.optional(v.id("notes")),
    ayrsharePostId: v.optional(v.string()),
    content: v.string(),
    platforms: v.array(v.string()),
    mediaUrls: v.optional(v.array(v.string())),
    scheduledAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Validate input data
    const postData = {
      ...args,
      status: args.scheduledAt ? "scheduled" : "draft",
    };

    const validation = validateSocialPostData(postData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check if user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate note exists if provided
    if (args.noteId) {
      const note = await ctx.db.get(args.noteId);
      if (!note) {
        throw new Error("Note not found");
      }
    }

    const now = Date.now();
    const postId = await ctx.db.insert("socialPosts", {
      userId: args.userId,
      noteId: args.noteId,
      ayrsharePostId: args.ayrsharePostId,
      content: args.content,
      platforms: args.platforms,
      mediaUrls: args.mediaUrls || [],
      scheduledAt: args.scheduledAt,
      publishedAt: undefined,
      status: postData.status as any,
      analytics: undefined,
      errors: [],
      metadata: args.metadata || {},
      createdAt: now,
      updatedAt: now,
    });

    return postId;
  },
});

// Get User's Social Posts
export const getUserSocialPosts = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("socialPosts")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const posts = await query.order("desc").take(args.limit || 50);

    // Apply offset if provided
    if (args.offset && args.offset > 0) {
      return posts.slice(args.offset);
    }

    return posts;
  },
});

// Get Social Post by ID
export const getSocialPostById = query({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    return post;
  },
});

// Update Social Post
export const updateSocialPost = mutation({
  args: {
    postId: v.id("socialPosts"),
    content: v.optional(v.string()),
    platforms: v.optional(v.array(v.string())),
    mediaUrls: v.optional(v.array(v.string())),
    scheduledAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { postId, ...updates } = args;

    const existingPost = await ctx.db.get(postId);
    if (!existingPost) {
      throw new Error("Social post not found");
    }

    // Only allow updates if post is in draft or scheduled status
    if (!["draft", "scheduled"].includes(existingPost.status)) {
      throw new Error("Cannot update published or failed posts");
    }

    // Validate updated content if provided
    if (updates.content && !validatePostContent(updates.content)) {
      throw new Error("Invalid post content");
    }

    // Validate scheduled date if provided
    if (updates.scheduledAt && !validateScheduledDate(updates.scheduledAt)) {
      throw new Error(
        "Scheduled date must be at least 5 minutes in the future",
      );
    }

    // Validate media URLs if provided
    if (updates.mediaUrls) {
      for (const url of updates.mediaUrls) {
        if (!validateMediaUrl(url)) {
          throw new Error(`Invalid media URL: ${url}`);
        }
      }
    }

    // Update status based on scheduling
    const statusUpdate: any = {};
    if (updates.scheduledAt) {
      statusUpdate.status = "scheduled";
    } else if (updates.scheduledAt === null) {
      statusUpdate.status = "draft";
      statusUpdate.scheduledAt = undefined;
    }

    await ctx.db.patch(postId, {
      ...updates,
      ...statusUpdate,
      updatedAt: Date.now(),
    });

    return postId;
  },
});

// Update Post Status
export const updatePostStatus = mutation({
  args: {
    postId: v.id("socialPosts"),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("deleted"),
    ),
    publishedAt: v.optional(v.number()),
    ayrsharePostId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { postId, ...updates } = args;

    const existingPost = await ctx.db.get(postId);
    if (!existingPost) {
      throw new Error("Social post not found");
    }

    const updateData: any = {
      status: updates.status,
      updatedAt: Date.now(),
    };

    if (updates.publishedAt) {
      updateData.publishedAt = updates.publishedAt;
    }

    if (updates.ayrsharePostId) {
      updateData.ayrsharePostId = updates.ayrsharePostId;
    }

    await ctx.db.patch(postId, updateData);
    return postId;
  },
});

// Add Post Error
export const addPostError = mutation({
  args: {
    postId: v.id("socialPosts"),
    platform: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const existingPost = await ctx.db.get(args.postId);
    if (!existingPost) {
      throw new Error("Social post not found");
    }

    const newError = {
      platform: args.platform,
      error: args.error,
      timestamp: Date.now(),
    };

    const updatedErrors = [...(existingPost.errors || []), newError];

    await ctx.db.patch(args.postId, {
      errors: updatedErrors,
      status: "failed",
      updatedAt: Date.now(),
    });

    return args.postId;
  },
});

// Update Post Analytics
export const updatePostAnalytics = mutation({
  args: {
    postId: v.id("socialPosts"),
    analytics: postAnalyticsValidator,
  },
  handler: async (ctx, args) => {
    const existingPost = await ctx.db.get(args.postId);
    if (!existingPost) {
      throw new Error("Social post not found");
    }

    await ctx.db.patch(args.postId, {
      analytics: args.analytics,
      updatedAt: Date.now(),
    });

    return args.postId;
  },
});

// Delete Social Post
export const deleteSocialPost = mutation({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, args) => {
    const existingPost = await ctx.db.get(args.postId);
    if (!existingPost) {
      throw new Error("Social post not found");
    }

    // Soft delete by updating status
    await ctx.db.patch(args.postId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    return args.postId;
  },
});

// Get Scheduled Posts
export const getScheduledPosts = query({
  args: {
    beforeTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const beforeTime = args.beforeTime || Date.now();

    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_scheduled_at")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "scheduled"),
          q.lte(q.field("scheduledAt"), beforeTime),
          q.neq(q.field("scheduledAt"), undefined),
        ),
      )
      .take(args.limit || 50);

    return posts;
  },
});

// Get Posts by Status
export const getPostsByStatus = query({
  args: {
    status: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(args.limit || 50);

    return posts;
  },
});

// Get Recent Posts
export const getRecentPosts = query({
  args: {
    userId: v.optional(v.id("users")),
    hours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const hoursAgo = (args.hours || 24) * 60 * 60 * 1000;
    const cutoffTime = Date.now() - hoursAgo;

    let query = ctx.db
      .query("socialPosts")
      .withIndex("by_published_at")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "published"),
          q.gte(q.field("publishedAt"), cutoffTime),
        ),
      );

    if (args.userId) {
      query = ctx.db
        .query("socialPosts")
        .withIndex("by_user_scheduled", (q) => q.eq("userId", args.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "published"),
            q.gte(q.field("publishedAt"), cutoffTime),
          ),
        );
    }

    const posts = await query.order("desc").take(args.limit || 20);

    return posts;
  },
});

// Get Post Analytics Summary
export const getPostAnalyticsSummary = query({
  args: {
    userId: v.id("users"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAgo = (args.days || 30) * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - daysAgo;

    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_user_scheduled", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "published"),
          q.gte(q.field("publishedAt"), cutoffTime),
          q.neq(q.field("analytics"), undefined),
        ),
      )
      .collect();

    const summary = {
      totalPosts: posts.length,
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      totalComments: 0,
      totalClicks: 0,
      averageEngagement: 0,
      platformBreakdown: {} as Record<string, number>,
    };

    posts.forEach((post) => {
      if (post.analytics) {
        summary.totalViews += post.analytics.views || 0;
        summary.totalLikes += post.analytics.likes || 0;
        summary.totalShares += post.analytics.shares || 0;
        summary.totalComments += post.analytics.comments || 0;
        summary.totalClicks += post.analytics.clicks || 0;
      }

      post.platforms.forEach((platform) => {
        summary.platformBreakdown[platform] =
          (summary.platformBreakdown[platform] || 0) + 1;
      });
    });

    if (summary.totalViews > 0) {
      const totalEngagement =
        summary.totalLikes +
        summary.totalShares +
        summary.totalComments +
        summary.totalClicks;
      summary.averageEngagement = (totalEngagement / summary.totalViews) * 100;
    }

    return summary;
  },
});

// Get Social Post Statistics
export const getSocialPostStatistics = query({
  args: {},
  handler: async (ctx) => {
    const allPosts = await ctx.db.query("socialPosts").collect();

    const statusCounts: Record<string, number> = {};
    const platformCounts: Record<string, number> = {};

    allPosts.forEach((post) => {
      statusCounts[post.status] = (statusCounts[post.status] || 0) + 1;

      post.platforms.forEach((platform) => {
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });
    });

    const now = Date.now();
    const stats = {
      total: allPosts.length,
      statusCounts,
      platformCounts,
      published: allPosts.filter((p) => p.status === "published").length,
      scheduled: allPosts.filter((p) => p.status === "scheduled").length,
      draft: allPosts.filter((p) => p.status === "draft").length,
      failed: allPosts.filter((p) => p.status === "failed").length,
      recentPosts: allPosts.filter(
        (p) => p.createdAt > now - 7 * 24 * 60 * 60 * 1000,
      ).length,
      postsWithAnalytics: allPosts.filter((p) => p.analytics).length,
    };

    return stats;
  },
});
