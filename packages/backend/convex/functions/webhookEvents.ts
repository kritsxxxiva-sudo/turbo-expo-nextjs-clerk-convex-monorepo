/**
 * Webhook Event Functions
 * Handles webhook event tracking and processing
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  validateWebhookSource,
  validateEventType,
  validateEventId,
} from "../lib/validation";

// Create Webhook Event
export const createWebhookEvent = mutation({
  args: {
    source: v.union(
      v.literal("clerk"),
      v.literal("stripe"),
      v.literal("ayrshare"),
    ),
    eventType: v.string(),
    eventId: v.string(),
    userId: v.optional(v.id("users")),
    payload: v.any(),
    processed: v.optional(v.boolean()),
    retryCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate input data
    if (!validateWebhookSource(args.source)) {
      throw new Error("Invalid webhook source");
    }

    if (!validateEventType(args.eventType)) {
      throw new Error("Invalid event type");
    }

    if (!validateEventId(args.eventId)) {
      throw new Error("Invalid event ID");
    }

    // Check for duplicate event
    const existingEvent = await ctx.db
      .query("webhookEvents")
      .filter((q) =>
        q.and(
          q.eq(q.field("source"), args.source),
          q.eq(q.field("eventId"), args.eventId),
        ),
      )
      .first();

    if (existingEvent) {
      console.log(
        `Duplicate webhook event ignored: ${args.source}:${args.eventId}`,
      );
      return existingEvent._id;
    }

    const now = Date.now();
    const webhookEventId = await ctx.db.insert("webhookEvents", {
      source: args.source,
      eventType: args.eventType,
      eventId: args.eventId,
      userId: args.userId,
      payload: args.payload,
      processed: args.processed || false,
      processingError: undefined,
      retryCount: args.retryCount || 0,
      createdAt: now,
      processedAt: undefined,
    });

    return webhookEventId;
  },
});

// Get Webhook Event by ID
export const getWebhookEventById = query({
  args: { webhookEventId: v.id("webhookEvents") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.webhookEventId);
    return event;
  },
});

// Get Webhook Events by Source
export const getWebhookEventsBySource = query({
  args: {
    source: v.union(
      v.literal("clerk"),
      v.literal("stripe"),
      v.literal("ayrshare"),
    ),
    processed: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("webhookEvents")
      .withIndex("by_source", (q) => q.eq("source", args.source));

    if (args.processed !== undefined) {
      query = query.filter((q) => q.eq(q.field("processed"), args.processed));
    }

    const events = await query.order("desc").take(args.limit || 50);

    return events;
  },
});

// Get Unprocessed Webhook Events
export const getUnprocessedWebhookEvents = query({
  args: {
    source: v.optional(
      v.union(v.literal("clerk"), v.literal("stripe"), v.literal("ayrshare")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("webhookEvents")
      .withIndex("by_processed", (q) => q.eq("processed", false));

    if (args.source) {
      query = query.filter((q) => q.eq(q.field("source"), args.source));
    }

    const events = await query
      .order("asc") // Process oldest first
      .take(args.limit || 100);

    return events;
  },
});

// Mark Webhook Event as Processed
export const markWebhookProcessed = mutation({
  args: {
    source: v.union(
      v.literal("clerk"),
      v.literal("stripe"),
      v.literal("ayrshare"),
    ),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("webhookEvents")
      .filter((q) =>
        q.and(
          q.eq(q.field("source"), args.source),
          q.eq(q.field("eventId"), args.eventId),
        ),
      )
      .first();

    if (!event) {
      throw new Error("Webhook event not found");
    }

    await ctx.db.patch(event._id, {
      processed: true,
      processedAt: Date.now(),
      processingError: undefined,
    });

    return event._id;
  },
});

// Mark Webhook Event with Error
export const markWebhookError = mutation({
  args: {
    source: v.union(
      v.literal("clerk"),
      v.literal("stripe"),
      v.literal("ayrshare"),
    ),
    eventId: v.string(),
    error: v.string(),
    incrementRetry: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("webhookEvents")
      .filter((q) =>
        q.and(
          q.eq(q.field("source"), args.source),
          q.eq(q.field("eventId"), args.eventId),
        ),
      )
      .first();

    if (!event) {
      throw new Error("Webhook event not found");
    }

    const updates: any = {
      processingError: args.error,
      processedAt: Date.now(),
    };

    if (args.incrementRetry) {
      updates.retryCount = event.retryCount + 1;
    }

    await ctx.db.patch(event._id, updates);
    return event._id;
  },
});

// Retry Failed Webhook Event
export const retryWebhookEvent = mutation({
  args: { webhookEventId: v.id("webhookEvents") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.webhookEventId);
    if (!event) {
      throw new Error("Webhook event not found");
    }

    if (event.processed && !event.processingError) {
      throw new Error("Event already processed successfully");
    }

    const maxRetries = 5;
    if (event.retryCount >= maxRetries) {
      throw new Error("Maximum retry attempts exceeded");
    }

    await ctx.db.patch(args.webhookEventId, {
      processed: false,
      processingError: undefined,
      retryCount: event.retryCount + 1,
    });

    return args.webhookEventId;
  },
});

// Get Failed Webhook Events
export const getFailedWebhookEvents = query({
  args: {
    source: v.optional(
      v.union(v.literal("clerk"), v.literal("stripe"), v.literal("ayrshare")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("webhookEvents")
      .filter((q) => q.neq(q.field("processingError"), undefined));

    if (args.source) {
      query = query.filter((q) => q.eq(q.field("source"), args.source));
    }

    const events = await query.order("desc").take(args.limit || 50);

    return events;
  },
});

// Get Webhook Events by User
export const getWebhookEventsByUser = query({
  args: {
    userId: v.id("users"),
    source: v.optional(
      v.union(v.literal("clerk"), v.literal("stripe"), v.literal("ayrshare")),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("webhookEvents")
      .filter((q) => q.eq(q.field("userId"), args.userId));

    if (args.source) {
      query = query.filter((q) => q.eq(q.field("source"), args.source));
    }

    const events = await query.order("desc").take(args.limit || 50);

    return events;
  },
});

// Clean Up Old Webhook Events
export const cleanupOldWebhookEvents = mutation({
  args: {
    olderThanDays: v.optional(v.number()),
    keepFailed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const daysToKeep = args.olderThanDays || 30;
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

    let query = ctx.db
      .query("webhookEvents")
      .withIndex("by_created_at")
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime));

    if (args.keepFailed) {
      query = query.filter((q) => q.eq(q.field("processingError"), undefined));
    }

    const oldEvents = await query.collect();

    // Delete old events in batches
    const deletePromises = oldEvents.map((event) => ctx.db.delete(event._id));
    await Promise.all(deletePromises);

    return oldEvents.length;
  },
});

// Get Webhook Event Statistics
export const getWebhookEventStatistics = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const daysAgo = (args.days || 7) * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - daysAgo;

    const recentEvents = await ctx.db
      .query("webhookEvents")
      .withIndex("by_created_at")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();

    const allEvents = await ctx.db.query("webhookEvents").collect();

    const sourceCounts: Record<string, number> = {};
    const eventTypeCounts: Record<string, number> = {};
    const recentSourceCounts: Record<string, number> = {};

    allEvents.forEach((event) => {
      sourceCounts[event.source] = (sourceCounts[event.source] || 0) + 1;
      eventTypeCounts[event.eventType] =
        (eventTypeCounts[event.eventType] || 0) + 1;
    });

    recentEvents.forEach((event) => {
      recentSourceCounts[event.source] =
        (recentSourceCounts[event.source] || 0) + 1;
    });

    const stats = {
      total: allEvents.length,
      recent: recentEvents.length,
      processed: allEvents.filter((e) => e.processed).length,
      failed: allEvents.filter((e) => e.processingError).length,
      pending: allEvents.filter((e) => !e.processed && !e.processingError)
        .length,
      sourceCounts,
      eventTypeCounts,
      recentSourceCounts,
      averageProcessingTime: this.calculateAverageProcessingTime(allEvents),
      retryRate: this.calculateRetryRate(allEvents),
    };

    return stats;
  },
});

// Helper function for average processing time
function calculateAverageProcessingTime(events: any[]): number {
  const processedEvents = events.filter((e) => e.processed && e.processedAt);

  if (processedEvents.length === 0) return 0;

  const totalTime = processedEvents.reduce((sum, event) => {
    return sum + (event.processedAt - event.createdAt);
  }, 0);

  return Math.round(totalTime / processedEvents.length);
}

// Helper function for retry rate
function calculateRetryRate(events: any[]): number {
  if (events.length === 0) return 0;

  const eventsWithRetries = events.filter((e) => e.retryCount > 0);
  return (eventsWithRetries.length / events.length) * 100;
}

// Bulk Retry Failed Events
export const bulkRetryFailedEvents = mutation({
  args: {
    source: v.optional(
      v.union(v.literal("clerk"), v.literal("stripe"), v.literal("ayrshare")),
    ),
    maxRetries: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxRetries = args.maxRetries || 5;

    let query = ctx.db
      .query("webhookEvents")
      .filter((q) =>
        q.and(
          q.neq(q.field("processingError"), undefined),
          q.lt(q.field("retryCount"), maxRetries),
        ),
      );

    if (args.source) {
      query = query.filter((q) => q.eq(q.field("source"), args.source));
    }

    const failedEvents = await query.take(args.limit || 10);

    const retryPromises = failedEvents.map((event) =>
      ctx.db.patch(event._id, {
        processed: false,
        processingError: undefined,
        retryCount: event.retryCount + 1,
      }),
    );

    await Promise.all(retryPromises);
    return failedEvents.length;
  },
});

// Get Webhook Event Processing Queue
export const getWebhookProcessingQueue = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const unprocessedEvents = await ctx.db
      .query("webhookEvents")
      .withIndex("by_processed", (q) => q.eq("processed", false))
      .filter((q) => q.eq(q.field("processingError"), undefined))
      .order("asc")
      .take(args.limit || 20);

    return unprocessedEvents.map((event) => ({
      _id: event._id,
      source: event.source,
      eventType: event.eventType,
      eventId: event.eventId,
      createdAt: event.createdAt,
      retryCount: event.retryCount,
      waitTime: Date.now() - event.createdAt,
    }));
  },
});
