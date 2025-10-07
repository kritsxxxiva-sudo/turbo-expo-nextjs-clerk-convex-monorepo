/**
 * User Management Functions
 * Handles user CRUD operations with Clerk integration
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  validateUserData,
  validateUniqueUserEmail,
  validateUniqueClerkId,
} from "../lib/validation";

// User Preferences Schema for validation
const userPreferencesValidator = v.object({
  theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
  language: v.string(),
  timezone: v.string(),
  notifications: v.object({
    email: v.boolean(),
    push: v.boolean(),
    marketing: v.boolean(),
    security: v.boolean(),
  }),
  privacy: v.object({
    profileVisible: v.boolean(),
    analyticsEnabled: v.boolean(),
    dataSharing: v.boolean(),
  }),
});

// Create User
export const createUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    role: v.optional(
      v.union(v.literal("admin"), v.literal("premium"), v.literal("free")),
    ),
    preferences: v.optional(userPreferencesValidator),
  },
  handler: async (ctx, args) => {
    // Validate input data
    const userData = {
      ...args,
      role: args.role || "free",
      status: "active",
    };

    const validation = validateUserData(userData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check for unique Clerk ID
    const isUniqueClerkId = await validateUniqueClerkId(ctx, args.clerkId);
    if (!isUniqueClerkId) {
      throw new Error("User with this Clerk ID already exists");
    }

    // Check for unique email
    const isUniqueEmail = await validateUniqueUserEmail(ctx, args.email);
    if (!isUniqueEmail) {
      throw new Error("User with this email already exists");
    }

    // Default preferences
    const defaultPreferences = {
      theme: "system" as const,
      language: "en",
      timezone: "America/New_York",
      notifications: {
        email: true,
        push: true,
        marketing: false,
        security: true,
      },
      privacy: {
        profileVisible: true,
        analyticsEnabled: true,
        dataSharing: false,
      },
    };

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      username: args.username,
      profileImageUrl: args.profileImageUrl,
      role: userData.role,
      status: "active",
      preferences: args.preferences || defaultPreferences,
      metadata: {},
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    });

    return userId;
  },
});

// Get User by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Don't return sensitive data in queries
    const { ...publicUser } = user;
    return publicUser;
  },
});

// Get User by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const { ...publicUser } = user;
    return publicUser;
  },
});

// Update User
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    preferences: v.optional(userPreferencesValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;

    // Get existing user
    const existingUser = await ctx.db.get(userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Validate username uniqueness if provided
    if (updates.username) {
      const existingUserWithUsername = await ctx.db
        .query("users")
        .filter((q) =>
          q.and(
            q.eq(q.field("username"), updates.username),
            q.neq(q.field("_id"), userId),
          ),
        )
        .first();

      if (existingUserWithUsername) {
        throw new Error("Username already taken");
      }
    }

    // Update user
    await ctx.db.patch(userId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return userId;
  },
});

// Update User Role (Admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("premium"), v.literal("free")),
  },
  handler: async (ctx, args) => {
    // TODO: Add authentication check for admin role

    const existingUser = await ctx.db.get(args.userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return args.userId;
  },
});

// Update User Status (Admin only)
export const updateUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("deleted"),
    ),
  },
  handler: async (ctx, args) => {
    // TODO: Add authentication check for admin role

    const existingUser = await ctx.db.get(args.userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return args.userId;
  },
});

// Update Last Login
export const updateLastLogin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    });

    return user._id;
  },
});

// Soft Delete User
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db.get(args.userId);
    if (!existingUser) {
      throw new Error("User not found");
    }

    // Soft delete by updating status
    await ctx.db.patch(args.userId, {
      status: "deleted",
      updatedAt: Date.now(),
    });

    // TODO: Handle cascading soft deletes for related entities
    // - Social accounts
    // - Customers
    // - Subscriptions
    // - Social posts

    return args.userId;
  },
});

// Get Users by Role (Admin only)
export const getUsersByRole = query({
  args: {
    role: v.union(v.literal("admin"), v.literal("premium"), v.literal("free")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // TODO: Add authentication check for admin role

    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .filter((q) => q.neq(q.field("status"), "deleted"))
      .take(args.limit || 50);

    return users.map((user) => {
      const { ...publicUser } = user;
      return publicUser;
    });
  },
});

// Get Users by Status (Admin only)
export const getUsersByStatus = query({
  args: {
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("deleted"),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // TODO: Add authentication check for admin role

    const users = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .take(args.limit || 50);

    return users.map((user) => {
      const { ...publicUser } = user;
      return publicUser;
    });
  },
});

// Search Users (Admin only)
export const searchUsers = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // TODO: Add authentication check for admin role

    const users = await ctx.db
      .query("users")
      .filter((q) =>
        q.and(
          q.neq(q.field("status"), "deleted"),
          q.or(
            q.eq(q.field("email"), args.searchTerm),
            q.eq(q.field("username"), args.searchTerm),
            q.eq(q.field("firstName"), args.searchTerm),
            q.eq(q.field("lastName"), args.searchTerm),
          ),
        ),
      )
      .take(args.limit || 20);

    return users.map((user) => {
      const { ...publicUser } = user;
      return publicUser;
    });
  },
});

// Get User Statistics (Admin only)
export const getUserStatistics = query({
  args: {},
  handler: async (ctx) => {
    // TODO: Add authentication check for admin role

    const allUsers = await ctx.db.query("users").collect();

    const stats = {
      total: allUsers.length,
      active: allUsers.filter((u) => u.status === "active").length,
      suspended: allUsers.filter((u) => u.status === "suspended").length,
      deleted: allUsers.filter((u) => u.status === "deleted").length,
      admin: allUsers.filter((u) => u.role === "admin").length,
      premium: allUsers.filter((u) => u.role === "premium").length,
      free: allUsers.filter((u) => u.role === "free").length,
      recentSignups: allUsers.filter(
        (u) => u.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).length,
    };

    return stats;
  },
});
