import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// User Preferences Schema
const userPreferencesSchema = v.object({
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

// Address Schema
const addressSchema = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  state: v.optional(v.string()),
  postalCode: v.string(),
  country: v.string(),
});

// Tax ID Schema
const taxIdSchema = v.object({
  type: v.string(),
  value: v.string(),
});

// Post Analytics Schema
const postAnalyticsSchema = v.object({
  views: v.optional(v.number()),
  likes: v.optional(v.number()),
  shares: v.optional(v.number()),
  comments: v.optional(v.number()),
  clicks: v.optional(v.number()),
  lastUpdated: v.number(),
});

// Post Error Schema
const postErrorSchema = v.object({
  platform: v.string(),
  error: v.string(),
  timestamp: v.number(),
});

export default defineSchema({
  // Existing notes table
  notes: defineTable({
    userId: v.string(),
    title: v.string(),
    content: v.string(),
    summary: v.optional(v.string()),
  }),

  // Users table - Central user management with Clerk integration
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("premium"), v.literal("free")),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("deleted"),
    ),
    preferences: userPreferencesSchema,
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
    emailVerifiedAt: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_status", ["status"]),

  // Social Accounts table - Social media account connections via Ayrshare
  socialAccounts: defineTable({
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
    accessToken: v.string(), // Encrypted
    refreshToken: v.optional(v.string()), // Encrypted
    tokenExpiresAt: v.optional(v.number()),
    permissions: v.array(v.string()),
    isActive: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_platform", ["platform"])
    .index("by_is_active", ["isActive"])
    .index("by_user_platform_active", ["userId", "platform", "isActive"]),

  // Customers table - Stripe customer data synchronization
  customers: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    defaultPaymentMethodId: v.optional(v.string()),
    currency: v.string(),
    taxIds: v.optional(v.array(taxIdSchema)),
    address: v.optional(addressSchema),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"]),

  // Subscriptions table - Stripe subscription management
  subscriptions: defineTable({
    userId: v.id("users"),
    customerId: v.id("customers"),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("past_due"),
      v.literal("trialing"),
      v.literal("unpaid"),
    ),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    quantity: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_status", ["status"])
    .index("by_current_period_end", ["currentPeriodEnd"])
    .index("by_user_subscription_status", ["userId", "status"]),

  // Social Posts table - Social media posting history and analytics
  socialPosts: defineTable({
    userId: v.id("users"),
    noteId: v.optional(v.id("notes")),
    ayrsharePostId: v.optional(v.string()),
    content: v.string(),
    platforms: v.array(v.string()),
    mediaUrls: v.optional(v.array(v.string())),
    scheduledAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("deleted"),
    ),
    analytics: v.optional(postAnalyticsSchema),
    errors: v.optional(v.array(postErrorSchema)),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_status", ["status"])
    .index("by_scheduled_at", ["scheduledAt"])
    .index("by_published_at", ["publishedAt"])
    .index("by_user_scheduled", ["userId", "scheduledAt"]),

  // Webhook Events table - External service webhook tracking
  webhookEvents: defineTable({
    source: v.union(
      v.literal("clerk"),
      v.literal("stripe"),
      v.literal("ayrshare"),
    ),
    eventType: v.string(),
    eventId: v.string(),
    userId: v.optional(v.id("users")),
    payload: v.any(),
    processed: v.boolean(),
    processingError: v.optional(v.string()),
    retryCount: v.number(),
    createdAt: v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_source", ["source"])
    .index("by_processed", ["processed"])
    .index("by_created_at", ["createdAt"]),

  // User Sessions table - Session management with configurable timeouts
  userSessions: defineTable({
    userId: v.id("users"),
    clerkSessionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("ended"),
      v.literal("expired"),
    ),
    expiresAt: v.number(),
    lastActiveAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_clerk_session_id", ["clerkSessionId"])
    .index("by_status", ["status"])
    .index("by_expires_at", ["expiresAt"]),
});
