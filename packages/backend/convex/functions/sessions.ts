/**
 * Session Management Functions
 * Handles configurable session timeouts and session tracking
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  validateClerkSessionId,
  validateSessionStatus,
  validateExpirationDate,
  validateIpAddress,
} from "../lib/validation";

// Session Configuration
const DEFAULT_SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SESSION_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_THRESHOLD = 60 * 60 * 1000; // 1 hour

// Create Session
export const createSession = mutation({
  args: {
    userId: v.id("users"),
    clerkSessionId: v.string(),
    customTimeout: v.optional(v.number()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Validate Clerk session ID
    if (!validateClerkSessionId(args.clerkSessionId)) {
      throw new Error("Invalid Clerk session ID format");
    }

    // Check if user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Validate IP address if provided
    if (args.ipAddress && !validateIpAddress(args.ipAddress)) {
      throw new Error("Invalid IP address format");
    }

    // Calculate expiration time
    const timeout = Math.min(
      args.customTimeout || DEFAULT_SESSION_TIMEOUT,
      MAX_SESSION_TIMEOUT,
    );
    const now = Date.now();
    const expiresAt = now + timeout;

    // Check for existing session with same Clerk session ID
    const existingSession = await ctx.db
      .query("userSessions")
      .withIndex("by_clerk_session_id", (q) =>
        q.eq("clerkSessionId", args.clerkSessionId),
      )
      .first();

    if (existingSession) {
      // Update existing session
      await ctx.db.patch(existingSession._id, {
        status: "active",
        expiresAt,
        lastActiveAt: now,
        ipAddress: args.ipAddress,
        userAgent: args.userAgent,
        metadata: args.metadata || {},
        updatedAt: now,
      });
      return existingSession._id;
    }

    // Create new session
    const sessionId = await ctx.db.insert("userSessions", {
      userId: args.userId,
      clerkSessionId: args.clerkSessionId,
      status: "active",
      expiresAt,
      lastActiveAt: now,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      metadata: args.metadata || {},
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

// Get Session by Clerk Session ID
export const getSessionByClerkId = query({
  args: { clerkSessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_clerk_session_id", (q) =>
        q.eq("clerkSessionId", args.clerkSessionId),
      )
      .first();

    return session;
  },
});

// Get User Sessions
export const getUserSessions = query({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("userSessions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const sessions = await query.order("desc").take(args.limit || 20);

    return sessions;
  },
});

// Validate Session
export const validateSession = query({
  args: { clerkSessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_clerk_session_id", (q) =>
        q.eq("clerkSessionId", args.clerkSessionId),
      )
      .first();

    if (!session) {
      return { valid: false, reason: "Session not found" };
    }

    const now = Date.now();

    // Check if session is expired
    if (session.expiresAt <= now) {
      return { valid: false, reason: "Session expired" };
    }

    // Check if session is active
    if (session.status !== "active") {
      return { valid: false, reason: `Session status: ${session.status}` };
    }

    return {
      valid: true,
      session: {
        _id: session._id,
        userId: session.userId,
        expiresAt: session.expiresAt,
        lastActiveAt: session.lastActiveAt,
      },
    };
  },
});

// Update Session Activity
export const updateSessionActivity = mutation({
  args: {
    clerkSessionId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_clerk_session_id", (q) =>
        q.eq("clerkSessionId", args.clerkSessionId),
      )
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    const now = Date.now();
    const updates: any = {
      lastActiveAt: now,
      updatedAt: now,
    };

    // Update IP and user agent if provided
    if (args.ipAddress) {
      updates.ipAddress = args.ipAddress;
    }
    if (args.userAgent) {
      updates.userAgent = args.userAgent;
    }

    // Extend session if close to expiry
    const timeUntilExpiry = session.expiresAt - now;
    if (timeUntilExpiry < REFRESH_THRESHOLD) {
      updates.expiresAt = now + DEFAULT_SESSION_TIMEOUT;
    }

    await ctx.db.patch(session._id, updates);
    return session._id;
  },
});

// End Session
export const endSession = mutation({
  args: { clerkSessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_clerk_session_id", (q) =>
        q.eq("clerkSessionId", args.clerkSessionId),
      )
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      status: "ended",
      updatedAt: Date.now(),
    });

    return session._id;
  },
});

// Expire Session
export const expireSession = mutation({
  args: { sessionId: v.id("userSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      status: "expired",
      updatedAt: Date.now(),
    });

    return args.sessionId;
  },
});

// Clean Up Expired Sessions
export const cleanupExpiredSessions = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all expired sessions that are still marked as active
    const expiredSessions = await ctx.db
      .query("userSessions")
      .withIndex("by_expires_at")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("expiresAt"), now),
        ),
      )
      .collect();

    // Update them to expired status
    const updatePromises = expiredSessions.map((session) =>
      ctx.db.patch(session._id, {
        status: "expired",
        updatedAt: now,
      }),
    );

    await Promise.all(updatePromises);
    return expiredSessions.length;
  },
});

// Get Active Sessions Count
export const getActiveSessionsCount = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const now = Date.now();

    let query = ctx.db
      .query("userSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.gt(q.field("expiresAt"), now));

    if (args.userId) {
      query = ctx.db
        .query("userSessions")
        .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("status"), "active"),
            q.gt(q.field("expiresAt"), now),
          ),
        );
    }

    const sessions = await query.collect();
    return sessions.length;
  },
});

// Get Session Configuration
export const getSessionConfig = query({
  args: {},
  handler: async (ctx) => {
    return {
      defaultTimeout: DEFAULT_SESSION_TIMEOUT,
      maxTimeout: MAX_SESSION_TIMEOUT,
      refreshThreshold: REFRESH_THRESHOLD,
      allowConcurrentSessions: true,
      requireFreshSession: false,
    };
  },
});

// Get Session Statistics
export const getSessionStatistics = query({
  args: {},
  handler: async (ctx) => {
    const allSessions = await ctx.db.query("userSessions").collect();
    const now = Date.now();

    const statusCounts: Record<string, number> = {};
    allSessions.forEach((session) => {
      statusCounts[session.status] = (statusCounts[session.status] || 0) + 1;
    });

    const stats = {
      total: allSessions.length,
      statusCounts,
      active: allSessions.filter(
        (s) => s.status === "active" && s.expiresAt > now,
      ).length,
      expired: allSessions.filter(
        (s) => s.status === "active" && s.expiresAt <= now,
      ).length,
      ended: allSessions.filter((s) => s.status === "ended").length,
      averageSessionDuration: this.calculateAverageSessionDuration(allSessions),
      recentSessions: allSessions.filter(
        (s) => s.createdAt > now - 24 * 60 * 60 * 1000,
      ).length,
    };

    return stats;
  },
});

// Helper function for average session duration
function calculateAverageSessionDuration(sessions: any[]): number {
  const completedSessions = sessions.filter(
    (s) => s.status === "ended" || s.status === "expired",
  );

  if (completedSessions.length === 0) return 0;

  const totalDuration = completedSessions.reduce((sum, session) => {
    const endTime =
      session.status === "ended" ? session.updatedAt : session.expiresAt;
    return sum + (endTime - session.createdAt);
  }, 0);

  return Math.round(totalDuration / completedSessions.length);
}

// End All User Sessions
export const endAllUserSessions = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const activeSessions = await ctx.db
      .query("userSessions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const now = Date.now();
    const updatePromises = activeSessions.map((session) =>
      ctx.db.patch(session._id, {
        status: "ended",
        updatedAt: now,
      }),
    );

    await Promise.all(updatePromises);
    return activeSessions.length;
  },
});

// Extend Session
export const extendSession = mutation({
  args: {
    clerkSessionId: v.string(),
    additionalTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_clerk_session_id", (q) =>
        q.eq("clerkSessionId", args.clerkSessionId),
      )
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== "active") {
      throw new Error("Cannot extend inactive session");
    }

    const extensionTime = Math.min(
      args.additionalTime || DEFAULT_SESSION_TIMEOUT,
      MAX_SESSION_TIMEOUT,
    );

    const newExpiresAt = Math.min(
      session.expiresAt + extensionTime,
      Date.now() + MAX_SESSION_TIMEOUT,
    );

    await ctx.db.patch(session._id, {
      expiresAt: newExpiresAt,
      updatedAt: Date.now(),
    });

    return session._id;
  },
});
