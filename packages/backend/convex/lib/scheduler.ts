/**
 * Content Scheduling Logic
 * Handles social media post scheduling and automation
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

// Scheduling configuration
export interface ScheduleConfig {
  timezone: string;
  businessHours: {
    start: number; // Hour in 24h format
    end: number; // Hour in 24h format
  };
  optimalTimes: {
    [platform: string]: number[]; // Hours in 24h format
  };
  blackoutDates: string[]; // ISO date strings
  maxPostsPerDay: number;
  minIntervalMinutes: number;
}

// Default scheduling configuration
export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  timezone: "America/New_York",
  businessHours: {
    start: 9,
    end: 17,
  },
  optimalTimes: {
    facebook: [9, 13, 15],
    instagram: [11, 14, 17],
    x: [9, 12, 15, 18],
    linkedin: [8, 12, 17],
    tiktok: [18, 19, 20],
  },
  blackoutDates: [],
  maxPostsPerDay: 10,
  minIntervalMinutes: 30,
};

// Get optimal posting times for a platform
export function getOptimalPostingTimes(
  platform: string,
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
): number[] {
  return config.optimalTimes[platform] || [9, 12, 15];
}

// Check if a time is within business hours
export function isWithinBusinessHours(
  hour: number,
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
): boolean {
  return hour >= config.businessHours.start && hour <= config.businessHours.end;
}

// Check if a date is a blackout date
export function isBlackoutDate(
  date: Date,
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
): boolean {
  const dateString = date.toISOString().split("T")[0];
  return config.blackoutDates.includes(dateString);
}

// Calculate next optimal posting time
export function calculateNextOptimalTime(
  platform: string,
  fromTime: Date = new Date(),
  config: ScheduleConfig = DEFAULT_SCHEDULE_CONFIG,
): Date {
  const optimalHours = getOptimalPostingTimes(platform, config);
  const currentHour = fromTime.getHours();

  // Find next optimal hour today
  const nextHourToday = optimalHours.find((hour) => hour > currentHour);

  if (nextHourToday && !isBlackoutDate(fromTime, config)) {
    const nextTime = new Date(fromTime);
    nextTime.setHours(nextHourToday, 0, 0, 0);
    return nextTime;
  }

  // Move to next day and use first optimal hour
  const nextDay = new Date(fromTime);
  nextDay.setDate(nextDay.getDate() + 1);
  nextDay.setHours(optimalHours[0], 0, 0, 0);

  // Skip blackout dates
  while (isBlackoutDate(nextDay, config)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return nextDay;
}

// Auto-schedule posts based on optimal times
export const autoSchedulePosts = internalMutation({
  args: {
    userId: v.id("users"),
    postIds: v.array(v.id("socialPosts")),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const scheduleConfig = args.config || DEFAULT_SCHEDULE_CONFIG;
    const now = new Date();

    // Get existing scheduled posts to avoid conflicts
    const existingScheduled = await ctx.db
      .query("socialPosts")
      .withIndex("by_user_scheduled", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "scheduled"),
          q.gt(q.field("scheduledAt"), now.getTime()),
        ),
      )
      .collect();

    const scheduledTimes = new Set(
      existingScheduled.map((post) => post.scheduledAt).filter(Boolean),
    );

    // Schedule each post
    for (const postId of args.postIds) {
      const post = await ctx.db.get(postId);
      if (!post || post.status !== "draft") continue;

      // Find optimal time for each platform
      const platformTimes: Record<string, Date> = {};

      for (const platform of post.platforms) {
        let optimalTime = calculateNextOptimalTime(
          platform,
          now,
          scheduleConfig,
        );

        // Ensure minimum interval between posts
        while (scheduledTimes.has(optimalTime.getTime())) {
          optimalTime = new Date(
            optimalTime.getTime() +
              scheduleConfig.minIntervalMinutes * 60 * 1000,
          );
        }

        platformTimes[platform] = optimalTime;
      }

      // Use the earliest optimal time across all platforms
      const earliestTime = Math.min(
        ...Object.values(platformTimes).map((d) => d.getTime()),
      );

      // Update post with scheduled time
      await ctx.db.patch(postId, {
        scheduledAt: earliestTime,
        status: "scheduled",
        updatedAt: Date.now(),
      });

      scheduledTimes.add(earliestTime);
    }

    return args.postIds.length;
  },
});

// Process scheduled posts that are ready to publish
export const processScheduledPosts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get posts scheduled for now or earlier
    const readyPosts = await ctx.db
      .query("socialPosts")
      .withIndex("by_scheduled_at")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "scheduled"),
          q.lte(q.field("scheduledAt"), now),
          q.neq(q.field("scheduledAt"), undefined),
        ),
      )
      .take(50); // Process in batches

    const publishedCount = readyPosts.length;

    // Publish each post
    for (const post of readyPosts) {
      try {
        // Update status to publishing
        await ctx.db.patch(post._id, {
          status: "publishing",
          updatedAt: now,
        });

        // TODO: Trigger actual publishing via Ayrshare
        // This would typically call an external API or queue a job

        console.log(
          `Publishing post ${post._id} to platforms: ${post.platforms.join(", ")}`,
        );
      } catch (error) {
        console.error(`Failed to publish post ${post._id}:`, error);

        // Mark as failed
        await ctx.db.patch(post._id, {
          status: "failed",
          errors: [
            ...(post.errors || []),
            {
              platform: "scheduler",
              error: error instanceof Error ? error.message : "Unknown error",
              timestamp: now,
            },
          ],
          updatedAt: now,
        });
      }
    }

    return publishedCount;
  },
});

// Get scheduling analytics
export const getSchedulingAnalytics = internalQuery({
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
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();

    const analytics = {
      totalPosts: posts.length,
      scheduled: posts.filter((p) => p.status === "scheduled").length,
      published: posts.filter((p) => p.status === "published").length,
      failed: posts.filter((p) => p.status === "failed").length,

      // Platform breakdown
      platformBreakdown: {} as Record<string, number>,

      // Time distribution
      hourlyDistribution: {} as Record<number, number>,

      // Success rate
      successRate: 0,

      // Average time to publish
      averageTimeToPublish: 0,
    };

    // Calculate platform breakdown
    posts.forEach((post) => {
      post.platforms.forEach((platform) => {
        analytics.platformBreakdown[platform] =
          (analytics.platformBreakdown[platform] || 0) + 1;
      });
    });

    // Calculate hourly distribution
    posts.forEach((post) => {
      if (post.scheduledAt) {
        const hour = new Date(post.scheduledAt).getHours();
        analytics.hourlyDistribution[hour] =
          (analytics.hourlyDistribution[hour] || 0) + 1;
      }
    });

    // Calculate success rate
    const completedPosts = posts.filter((p) =>
      ["published", "failed"].includes(p.status),
    );
    if (completedPosts.length > 0) {
      analytics.successRate =
        (analytics.published / completedPosts.length) * 100;
    }

    // Calculate average time to publish
    const publishedPosts = posts.filter(
      (p) => p.status === "published" && p.publishedAt && p.scheduledAt,
    );
    if (publishedPosts.length > 0) {
      const totalDelay = publishedPosts.reduce((sum, post) => {
        return sum + (post.publishedAt! - post.scheduledAt!);
      }, 0);
      analytics.averageTimeToPublish = totalDelay / publishedPosts.length;
    }

    return analytics;
  },
});

// Optimize posting schedule based on analytics
export const optimizeSchedule = internalMutation({
  args: {
    userId: v.id("users"),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    // Get historical performance data
    const posts = await ctx.db
      .query("socialPosts")
      .withIndex("by_user_scheduled", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "published"),
          q.neq(q.field("analytics"), undefined),
        ),
      )
      .collect();

    // Filter posts for the specific platform
    const platformPosts = posts.filter(
      (post) => post.platforms.includes(args.platform) && post.analytics,
    );

    if (platformPosts.length < 10) {
      // Not enough data for optimization
      return {
        optimized: false,
        reason:
          "Insufficient data for optimization (minimum 10 posts required)",
        currentOptimalTimes: getOptimalPostingTimes(args.platform),
      };
    }

    // Analyze performance by hour
    const hourlyPerformance: Record<
      number,
      { posts: number; totalEngagement: number }
    > = {};

    platformPosts.forEach((post) => {
      if (!post.scheduledAt || !post.analytics) return;

      const hour = new Date(post.scheduledAt).getHours();
      const engagement =
        (post.analytics.likes || 0) +
        (post.analytics.shares || 0) +
        (post.analytics.comments || 0);

      if (!hourlyPerformance[hour]) {
        hourlyPerformance[hour] = { posts: 0, totalEngagement: 0 };
      }

      hourlyPerformance[hour].posts++;
      hourlyPerformance[hour].totalEngagement += engagement;
    });

    // Calculate average engagement per hour
    const hourlyAverages = Object.entries(hourlyPerformance).map(
      ([hour, data]) => ({
        hour: parseInt(hour),
        averageEngagement: data.totalEngagement / data.posts,
        postCount: data.posts,
      }),
    );

    // Sort by average engagement and filter out hours with too few posts
    const optimizedHours = hourlyAverages
      .filter((h) => h.postCount >= 3) // Minimum 3 posts for reliability
      .sort((a, b) => b.averageEngagement - a.averageEngagement)
      .slice(0, 3) // Top 3 hours
      .map((h) => h.hour);

    return {
      optimized: true,
      previousOptimalTimes: getOptimalPostingTimes(args.platform),
      newOptimalTimes: optimizedHours,
      performanceData: hourlyAverages,
      improvementPotential:
        hourlyAverages.length > 0
          ? Math.max(...hourlyAverages.map((h) => h.averageEngagement)) /
            (hourlyAverages.reduce((sum, h) => sum + h.averageEngagement, 0) /
              hourlyAverages.length)
          : 1,
    };
  },
});
