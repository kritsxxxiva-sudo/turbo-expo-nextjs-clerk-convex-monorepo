/**
 * Analytics Integration
 * Comprehensive analytics for social media performance and user engagement
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../_generated/server";

// Analytics data types
export interface PlatformAnalytics {
  platform: string;
  totalPosts: number;
  totalEngagement: number;
  averageEngagement: number;
  topPost: {
    postId: string;
    engagement: number;
    content: string;
  } | null;
  engagementTrend: number; // Percentage change from previous period
}

export interface UserAnalytics {
  userId: string;
  totalPosts: number;
  totalEngagement: number;
  averageEngagement: number;
  platformBreakdown: PlatformAnalytics[];
  topPerformingContent: Array<{
    postId: string;
    content: string;
    engagement: number;
    platforms: string[];
  }>;
  engagementTrend: number;
  optimalPostingTimes: Record<string, number[]>;
}

export interface SystemAnalytics {
  totalUsers: number;
  totalPosts: number;
  totalEngagement: number;
  platformDistribution: Record<string, number>;
  userGrowth: number;
  postGrowth: number;
  engagementGrowth: number;
  topPerformers: Array<{
    userId: string;
    engagement: number;
    postCount: number;
  }>;
}

// Get comprehensive user analytics
export const getUserAnalytics = internalQuery({
  args: {
    userId: v.id("users"),
    days: v.optional(v.number()),
    compareWithPrevious: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get user's posts for the period
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

    // Calculate total engagement
    const totalEngagement = posts.reduce((sum, post) => {
      if (!post.analytics) return sum;
      return (
        sum +
        (post.analytics.likes || 0) +
        (post.analytics.shares || 0) +
        (post.analytics.comments || 0) +
        (post.analytics.clicks || 0)
      );
    }, 0);

    // Platform breakdown
    const platformData: Record<
      string,
      {
        posts: number;
        engagement: number;
        topPost: { postId: string; engagement: number; content: string } | null;
      }
    > = {};

    posts.forEach((post) => {
      if (!post.analytics) return;

      const postEngagement =
        (post.analytics.likes || 0) +
        (post.analytics.shares || 0) +
        (post.analytics.comments || 0) +
        (post.analytics.clicks || 0);

      post.platforms.forEach((platform) => {
        if (!platformData[platform]) {
          platformData[platform] = { posts: 0, engagement: 0, topPost: null };
        }

        platformData[platform].posts++;
        platformData[platform].engagement += postEngagement;

        if (
          !platformData[platform].topPost ||
          postEngagement > platformData[platform].topPost!.engagement
        ) {
          platformData[platform].topPost = {
            postId: post._id,
            engagement: postEngagement,
            content: post.content.substring(0, 100) + "...",
          };
        }
      });
    });

    // Convert to platform analytics
    const platformBreakdown: PlatformAnalytics[] = Object.entries(
      platformData,
    ).map(([platform, data]) => ({
      platform,
      totalPosts: data.posts,
      totalEngagement: data.engagement,
      averageEngagement: data.posts > 0 ? data.engagement / data.posts : 0,
      topPost: data.topPost,
      engagementTrend: 0, // Will be calculated if comparison is enabled
    }));

    // Top performing content
    const topPerformingContent = posts
      .map((post) => ({
        postId: post._id,
        content: post.content,
        engagement: post.analytics
          ? (post.analytics.likes || 0) +
            (post.analytics.shares || 0) +
            (post.analytics.comments || 0) +
            (post.analytics.clicks || 0)
          : 0,
        platforms: post.platforms,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);

    // Optimal posting times analysis
    const hourlyPerformance: Record<
      string,
      Record<number, { posts: number; engagement: number }>
    > = {};

    posts.forEach((post) => {
      if (!post.scheduledAt || !post.analytics) return;

      const hour = new Date(post.scheduledAt).getHours();
      const engagement =
        (post.analytics.likes || 0) +
        (post.analytics.shares || 0) +
        (post.analytics.comments || 0);

      post.platforms.forEach((platform) => {
        if (!hourlyPerformance[platform]) {
          hourlyPerformance[platform] = {};
        }
        if (!hourlyPerformance[platform][hour]) {
          hourlyPerformance[platform][hour] = { posts: 0, engagement: 0 };
        }

        hourlyPerformance[platform][hour].posts++;
        hourlyPerformance[platform][hour].engagement += engagement;
      });
    });

    const optimalPostingTimes: Record<string, number[]> = {};
    Object.entries(hourlyPerformance).forEach(([platform, hours]) => {
      const hourlyAverages = Object.entries(hours)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          averageEngagement: data.engagement / data.posts,
        }))
        .filter((h) => hours[h.hour].posts >= 2) // Minimum 2 posts for reliability
        .sort((a, b) => b.averageEngagement - a.averageEngagement)
        .slice(0, 3)
        .map((h) => h.hour);

      optimalPostingTimes[platform] = hourlyAverages;
    });

    // Calculate trend if comparison is enabled
    let engagementTrend = 0;
    if (args.compareWithPrevious) {
      const previousCutoffTime = cutoffTime - days * 24 * 60 * 60 * 1000;
      const previousPosts = await ctx.db
        .query("socialPosts")
        .withIndex("by_user_scheduled", (q) => q.eq("userId", args.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "published"),
            q.gte(q.field("publishedAt"), previousCutoffTime),
            q.lt(q.field("publishedAt"), cutoffTime),
            q.neq(q.field("analytics"), undefined),
          ),
        )
        .collect();

      const previousEngagement = previousPosts.reduce((sum, post) => {
        if (!post.analytics) return sum;
        return (
          sum +
          (post.analytics.likes || 0) +
          (post.analytics.shares || 0) +
          (post.analytics.comments || 0) +
          (post.analytics.clicks || 0)
        );
      }, 0);

      if (previousEngagement > 0) {
        engagementTrend =
          ((totalEngagement - previousEngagement) / previousEngagement) * 100;
      }
    }

    const analytics: UserAnalytics = {
      userId: args.userId,
      totalPosts: posts.length,
      totalEngagement,
      averageEngagement: posts.length > 0 ? totalEngagement / posts.length : 0,
      platformBreakdown,
      topPerformingContent,
      engagementTrend,
      optimalPostingTimes,
    };

    return analytics;
  },
});

// Get system-wide analytics
export const getSystemAnalytics = internalQuery({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get all users
    const users = await ctx.db.query("users").collect();
    const activeUsers = users.filter((u) => u.status === "active");

    // Get all posts for the period
    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_published_at")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "published"),
          q.gte(q.field("publishedAt"), cutoffTime),
        ),
      )
      .collect();

    // Calculate total engagement
    const totalEngagement = posts.reduce((sum, post) => {
      if (!post.analytics) return sum;
      return (
        sum +
        (post.analytics.likes || 0) +
        (post.analytics.shares || 0) +
        (post.analytics.comments || 0) +
        (post.analytics.clicks || 0)
      );
    }, 0);

    // Platform distribution
    const platformDistribution: Record<string, number> = {};
    posts.forEach((post) => {
      post.platforms.forEach((platform) => {
        platformDistribution[platform] =
          (platformDistribution[platform] || 0) + 1;
      });
    });

    // Top performers
    const userEngagement: Record<
      string,
      { engagement: number; postCount: number }
    > = {};
    posts.forEach((post) => {
      if (!post.analytics) return;

      const engagement =
        (post.analytics.likes || 0) +
        (post.analytics.shares || 0) +
        (post.analytics.comments || 0) +
        (post.analytics.clicks || 0);

      if (!userEngagement[post.userId]) {
        userEngagement[post.userId] = { engagement: 0, postCount: 0 };
      }

      userEngagement[post.userId].engagement += engagement;
      userEngagement[post.userId].postCount++;
    });

    const topPerformers = Object.entries(userEngagement)
      .map(([userId, data]) => ({
        userId,
        engagement: data.engagement,
        postCount: data.postCount,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 10);

    // Growth calculations (simplified - would need historical data for accurate trends)
    const userGrowth = 0; // Placeholder
    const postGrowth = 0; // Placeholder
    const engagementGrowth = 0; // Placeholder

    const analytics: SystemAnalytics = {
      totalUsers: activeUsers.length,
      totalPosts: posts.length,
      totalEngagement,
      platformDistribution,
      userGrowth,
      postGrowth,
      engagementGrowth,
      topPerformers,
    };

    return analytics;
  },
});

// Update post analytics from external source
export const updatePostAnalytics = internalMutation({
  args: {
    postId: v.id("socialPosts"),
    analytics: v.object({
      views: v.optional(v.number()),
      likes: v.optional(v.number()),
      shares: v.optional(v.number()),
      comments: v.optional(v.number()),
      clicks: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    await ctx.db.patch(args.postId, {
      analytics: {
        ...args.analytics,
        lastUpdated: Date.now(),
      },
      updatedAt: Date.now(),
    });

    return args.postId;
  },
});

// Generate analytics report
export const generateAnalyticsReport = internalQuery({
  args: {
    userId: v.optional(v.id("users")),
    type: v.union(v.literal("user"), v.literal("system")),
    period: v.union(v.literal("7d"), v.literal("30d"), v.literal("90d")),
    format: v.union(v.literal("summary"), v.literal("detailed")),
  },
  handler: async (ctx, args) => {
    const days = args.period === "7d" ? 7 : args.period === "30d" ? 30 : 90;

    if (args.type === "user" && args.userId) {
      const analytics = await getUserAnalytics(ctx, {
        userId: args.userId,
        days,
        compareWithPrevious: true,
      });

      if (args.format === "summary") {
        return {
          type: "user_summary",
          period: args.period,
          data: {
            totalPosts: analytics.totalPosts,
            totalEngagement: analytics.totalEngagement,
            averageEngagement: analytics.averageEngagement,
            engagementTrend: analytics.engagementTrend,
            topPlatform:
              analytics.platformBreakdown.length > 0
                ? analytics.platformBreakdown.reduce((a, b) =>
                    a.totalEngagement > b.totalEngagement ? a : b,
                  ).platform
                : null,
          },
        };
      }

      return {
        type: "user_detailed",
        period: args.period,
        data: analytics,
      };
    } else {
      const analytics = await getSystemAnalytics(ctx, { days });

      if (args.format === "summary") {
        return {
          type: "system_summary",
          period: args.period,
          data: {
            totalUsers: analytics.totalUsers,
            totalPosts: analytics.totalPosts,
            totalEngagement: analytics.totalEngagement,
            topPlatform:
              Object.entries(analytics.platformDistribution).length > 0
                ? Object.entries(analytics.platformDistribution).reduce(
                    (a, b) => (a[1] > b[1] ? a : b),
                  )[0]
                : null,
          },
        };
      }

      return {
        type: "system_detailed",
        period: args.period,
        data: analytics,
      };
    }
  },
});
