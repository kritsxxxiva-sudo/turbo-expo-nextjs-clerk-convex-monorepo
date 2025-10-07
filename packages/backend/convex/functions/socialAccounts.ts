/**
 * Social Account Management Functions
 * Handles social media account connections via Ayrshare
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  validateSocialAccountData,
  validateUniqueSocialAccount,
  validatePlatform,
} from "../lib/validation";

// Create Social Account
export const createSocialAccount = mutation({
  args: {
    userId: v.id("users"),
    platform: v.union(
      v.literal("facebook"),
      v.literal("instagram"),
      v.literal("x"),
      v.literal("linkedin"),
      v.literal("tiktok"),
      v.literal("youtube"),
      v.literal("pinterest"),
      v.literal("reddit"),
      v.literal("snapchat"),
      v.literal("telegram"),
      v.literal("threads"),
      v.literal("bluesky"),
      v.literal("google_business"),
    ),
    accountId: v.string(),
    accountName: v.string(),
    profileUrl: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
    permissions: v.array(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Validate input data
    const validation = validateSocialAccountData(args);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check if user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check for unique platform per user
    const isUnique = await validateUniqueSocialAccount(
      ctx,
      args.userId,
      args.platform,
    );
    if (!isUnique) {
      throw new Error(
        `User already has an active ${args.platform} account connected`,
      );
    }

    const now = Date.now();
    const accountId = await ctx.db.insert("socialAccounts", {
      userId: args.userId,
      platform: args.platform,
      accountId: args.accountId,
      accountName: args.accountName,
      profileUrl: args.profileUrl,
      profileImageUrl: args.profileImageUrl,
      accessToken: args.accessToken, // TODO: Encrypt before storage
      refreshToken: args.refreshToken, // TODO: Encrypt before storage
      tokenExpiresAt: args.tokenExpiresAt,
      permissions: args.permissions,
      isActive: true,
      lastSyncAt: now,
      metadata: args.metadata || {},
      createdAt: now,
      updatedAt: now,
    });

    return accountId;
  },
});

// Get User's Social Accounts
export const getUserSocialAccounts = query({
  args: {
    userId: v.id("users"),
    platform: v.optional(v.string()),
    activeOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("socialAccounts")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId));

    if (args.platform) {
      query = ctx.db
        .query("socialAccounts")
        .withIndex("by_user_platform_active", (q) =>
          q.eq("userId", args.userId).eq("platform", args.platform),
        );
    }

    const accounts = await query.collect();

    return accounts
      .filter((account) => (args.activeOnly ? account.isActive : true))
      .map((account) => ({
        ...account,
        accessToken: undefined, // Don't expose tokens in queries
        refreshToken: undefined,
      }));
  },
});

// Get Social Account by ID
export const getSocialAccountById = query({
  args: { accountId: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    if (!account) {
      return null;
    }

    return {
      ...account,
      accessToken: undefined, // Don't expose tokens in queries
      refreshToken: undefined,
    };
  },
});

// Update Social Account
export const updateSocialAccount = mutation({
  args: {
    accountId: v.id("socialAccounts"),
    accountName: v.optional(v.string()),
    profileUrl: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { accountId, ...updates } = args;

    const existingAccount = await ctx.db.get(accountId);
    if (!existingAccount) {
      throw new Error("Social account not found");
    }

    await ctx.db.patch(accountId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return accountId;
  },
});

// Update Access Token
export const updateAccessToken = mutation({
  args: {
    accountId: v.id("socialAccounts"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { accountId, ...tokenData } = args;

    const existingAccount = await ctx.db.get(accountId);
    if (!existingAccount) {
      throw new Error("Social account not found");
    }

    await ctx.db.patch(accountId, {
      accessToken: tokenData.accessToken, // TODO: Encrypt before storage
      refreshToken: tokenData.refreshToken, // TODO: Encrypt before storage
      tokenExpiresAt: tokenData.tokenExpiresAt,
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });

    return accountId;
  },
});

// Deactivate Social Account
export const deactivateSocialAccount = mutation({
  args: { accountId: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    const existingAccount = await ctx.db.get(args.accountId);
    if (!existingAccount) {
      throw new Error("Social account not found");
    }

    await ctx.db.patch(args.accountId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.accountId;
  },
});

// Reactivate Social Account
export const reactivateSocialAccount = mutation({
  args: { accountId: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    const existingAccount = await ctx.db.get(args.accountId);
    if (!existingAccount) {
      throw new Error("Social account not found");
    }

    // Check for unique platform per user
    const isUnique = await validateUniqueSocialAccount(
      ctx,
      existingAccount.userId,
      existingAccount.platform,
    );
    if (!isUnique) {
      throw new Error(
        `User already has an active ${existingAccount.platform} account connected`,
      );
    }

    await ctx.db.patch(args.accountId, {
      isActive: true,
      updatedAt: Date.now(),
    });

    return args.accountId;
  },
});

// Delete Social Account
export const deleteSocialAccount = mutation({
  args: { accountId: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    const existingAccount = await ctx.db.get(args.accountId);
    if (!existingAccount) {
      throw new Error("Social account not found");
    }

    // TODO: Revoke tokens with external service before deletion
    await ctx.db.delete(args.accountId);

    return args.accountId;
  },
});

// Get Accounts by Platform
export const getAccountsByPlatform = query({
  args: {
    platform: v.string(),
    activeOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!validatePlatform(args.platform)) {
      throw new Error("Invalid platform");
    }

    const accounts = await ctx.db
      .query("socialAccounts")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .take(args.limit || 50);

    return accounts
      .filter((account) => (args.activeOnly ? account.isActive : true))
      .map((account) => ({
        ...account,
        accessToken: undefined,
        refreshToken: undefined,
      }));
  },
});

// Get Expired Tokens
export const getExpiredTokens = query({
  args: { bufferMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const buffer = (args.bufferMinutes || 30) * 60 * 1000; // Default 30 minutes
    const expirationThreshold = Date.now() + buffer;

    const accounts = await ctx.db
      .query("socialAccounts")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .filter((q) =>
        q.and(
          q.neq(q.field("tokenExpiresAt"), undefined),
          q.lt(q.field("tokenExpiresAt"), expirationThreshold),
        ),
      )
      .collect();

    return accounts.map((account) => ({
      accountId: account._id,
      userId: account.userId,
      platform: account.platform,
      accountName: account.accountName,
      tokenExpiresAt: account.tokenExpiresAt,
    }));
  },
});

// Update Last Sync Time
export const updateLastSync = mutation({
  args: { accountId: v.id("socialAccounts") },
  handler: async (ctx, args) => {
    const existingAccount = await ctx.db.get(args.accountId);
    if (!existingAccount) {
      throw new Error("Social account not found");
    }

    await ctx.db.patch(args.accountId, {
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.accountId;
  },
});

// Get Social Account Statistics
export const getSocialAccountStatistics = query({
  args: {},
  handler: async (ctx) => {
    const allAccounts = await ctx.db.query("socialAccounts").collect();

    const platformCounts: Record<string, number> = {};
    const activePlatformCounts: Record<string, number> = {};

    allAccounts.forEach((account) => {
      platformCounts[account.platform] =
        (platformCounts[account.platform] || 0) + 1;
      if (account.isActive) {
        activePlatformCounts[account.platform] =
          (activePlatformCounts[account.platform] || 0) + 1;
      }
    });

    const stats = {
      total: allAccounts.length,
      active: allAccounts.filter((a) => a.isActive).length,
      inactive: allAccounts.filter((a) => !a.isActive).length,
      platformCounts,
      activePlatformCounts,
      recentConnections: allAccounts.filter(
        (a) => a.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).length,
    };

    return stats;
  },
});
