/**
 * Convex Database Type Definitions
 * Types for all database entities and operations
 */

import { Id } from 'convex/values';

// Base Entity Interface
export interface BaseEntity {
  readonly _id: Id<any>;
  readonly _creationTime: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// User Entity
export interface User extends BaseEntity {
  readonly _id: Id<'users'>;
  readonly clerkId: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly username?: string;
  readonly profileImageUrl?: string;
  readonly role: 'admin' | 'premium' | 'free';
  readonly status: 'active' | 'suspended' | 'deleted';
  readonly preferences: UserPreferences;
  readonly metadata?: Record<string, any>;
  readonly lastLoginAt?: number;
  readonly emailVerifiedAt?: number;
}

export interface UserPreferences {
  readonly theme: 'light' | 'dark' | 'system';
  readonly language: string;
  readonly timezone: string;
  readonly notifications: {
    readonly email: boolean;
    readonly push: boolean;
    readonly marketing: boolean;
    readonly security: boolean;
  };
  readonly privacy: {
    readonly profileVisible: boolean;
    readonly analyticsEnabled: boolean;
    readonly dataSharing: boolean;
  };
}

// Social Account Entity
export interface SocialAccount extends BaseEntity {
  readonly _id: Id<'socialAccounts'>;
  readonly userId: Id<'users'>;
  readonly platform: SocialPlatform;
  readonly accountId: string;
  readonly accountName: string;
  readonly profileUrl?: string;
  readonly profileImageUrl?: string;
  readonly accessToken: string; // Encrypted
  readonly refreshToken?: string; // Encrypted
  readonly tokenExpiresAt?: number;
  readonly permissions: string[];
  readonly isActive: boolean;
  readonly lastSyncAt?: number;
  readonly metadata?: Record<string, any>;
}

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'linkedin'
  | 'tiktok'
  | 'youtube'
  | 'pinterest'
  | 'reddit'
  | 'snapchat'
  | 'telegram'
  | 'threads'
  | 'bluesky'
  | 'google_business';

// Customer Entity
export interface Customer extends BaseEntity {
  readonly _id: Id<'customers'>;
  readonly userId: Id<'users'>;
  readonly stripeCustomerId: string;
  readonly email: string;
  readonly name?: string;
  readonly defaultPaymentMethodId?: string;
  readonly currency: string;
  readonly taxIds?: TaxId[];
  readonly address?: Address;
  readonly metadata?: Record<string, string>;
}

export interface TaxId {
  readonly type: string;
  readonly value: string;
}

export interface Address {
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly state?: string;
  readonly postalCode: string;
  readonly country: string;
}

// Subscription Entity
export interface Subscription extends BaseEntity {
  readonly _id: Id<'subscriptions'>;
  readonly userId: Id<'users'>;
  readonly customerId: Id<'customers'>;
  readonly stripeSubscriptionId: string;
  readonly stripePriceId: string;
  readonly status: SubscriptionStatus;
  readonly currentPeriodStart: number;
  readonly currentPeriodEnd: number;
  readonly cancelAtPeriodEnd: boolean;
  readonly canceledAt?: number;
  readonly trialStart?: number;
  readonly trialEnd?: number;
  readonly quantity: number;
  readonly metadata?: Record<string, string>;
}

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';

// Social Post Entity
export interface SocialPost extends BaseEntity {
  readonly _id: Id<'socialPosts'>;
  readonly userId: Id<'users'>;
  readonly noteId?: Id<'notes'>;
  readonly ayrsharePostId?: string;
  readonly content: string;
  readonly platforms: string[];
  readonly mediaUrls?: string[];
  readonly scheduledAt?: number;
  readonly publishedAt?: number;
  readonly status: PostStatus;
  readonly analytics?: PostAnalytics;
  readonly errors?: PostError[];
  readonly metadata?: Record<string, any>;
}

export type PostStatus =
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'deleted';

export interface PostAnalytics {
  readonly views?: number;
  readonly likes?: number;
  readonly shares?: number;
  readonly comments?: number;
  readonly clicks?: number;
  readonly lastUpdated: number;
}

export interface PostError {
  readonly platform: string;
  readonly error: string;
  readonly timestamp: number;
}

// Webhook Event Entity
export interface WebhookEvent extends BaseEntity {
  readonly _id: Id<'webhookEvents'>;
  readonly source: 'clerk' | 'stripe' | 'ayrshare';
  readonly eventType: string;
  readonly eventId: string;
  readonly userId?: Id<'users'>;
  readonly payload: any;
  readonly processed: boolean;
  readonly processingError?: string;
  readonly retryCount: number;
  readonly processedAt?: number;
}

// Session Entity
export interface UserSession extends BaseEntity {
  readonly _id: Id<'userSessions'>;
  readonly userId: Id<'users'>;
  readonly clerkSessionId: string;
  readonly status: 'active' | 'ended' | 'expired';
  readonly expiresAt: number;
  readonly lastActiveAt: number;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly metadata?: Record<string, any>;
}

// Query Result Types
export interface UserWithRelations extends User {
  readonly socialAccounts: SocialAccount[];
  readonly customers: Customer[];
  readonly subscriptions: Subscription[];
  readonly socialPosts: SocialPost[];
}

export interface SocialPostWithAnalytics extends SocialPost {
  readonly platformAnalytics: Record<string, PostAnalytics>;
  readonly totalEngagement: number;
  readonly bestPerformingPlatform: string;
}

// Database Operation Types
export interface CreateUserArgs {
  readonly clerkId: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly username?: string;
  readonly profileImageUrl?: string;
  readonly role?: 'admin' | 'premium' | 'free';
  readonly preferences?: Partial<UserPreferences>;
}

export interface UpdateUserArgs {
  readonly userId: Id<'users'>;
  readonly updates: Partial<
    Omit<User, '_id' | '_creationTime' | 'clerkId' | 'createdAt'>
  >;
}

export interface CreateSocialAccountArgs {
  readonly userId: Id<'users'>;
  readonly platform: SocialPlatform;
  readonly accountId: string;
  readonly accountName: string;
  readonly accessToken: string;
  readonly permissions: string[];
  readonly metadata?: Record<string, any>;
}

export interface CreateSocialPostArgs {
  readonly userId: Id<'users'>;
  readonly content: string;
  readonly platforms: string[];
  readonly scheduledAt?: number;
  readonly mediaUrls?: string[];
  readonly metadata?: Record<string, any>;
}

// Validation Types
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: ValidationError[];
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

// Index Definitions
export interface DatabaseIndexes {
  readonly users: {
    readonly by_clerk_id: ['clerkId'];
    readonly by_email: ['email'];
    readonly by_role: ['role'];
    readonly by_status: ['status'];
  };
  readonly socialAccounts: {
    readonly by_user_id: ['userId'];
    readonly by_platform: ['platform'];
    readonly by_is_active: ['isActive'];
    readonly by_user_platform_active: ['userId', 'platform', 'isActive'];
  };
  readonly customers: {
    readonly by_user_id: ['userId'];
    readonly by_stripe_customer_id: ['stripeCustomerId'];
  };
  readonly subscriptions: {
    readonly by_user_id: ['userId'];
    readonly by_status: ['status'];
    readonly by_current_period_end: ['currentPeriodEnd'];
    readonly by_user_subscription_status: ['userId', 'status'];
  };
  readonly socialPosts: {
    readonly by_user_id: ['userId'];
    readonly by_status: ['status'];
    readonly by_scheduled_at: ['scheduledAt'];
    readonly by_published_at: ['publishedAt'];
    readonly by_user_scheduled: ['userId', 'scheduledAt'];
  };
  readonly webhookEvents: {
    readonly by_source: ['source'];
    readonly by_processed: ['processed'];
    readonly by_created_at: ['createdAt'];
  };
  readonly userSessions: {
    readonly by_user_id: ['userId'];
    readonly by_clerk_session_id: ['clerkSessionId'];
    readonly by_status: ['status'];
    readonly by_expires_at: ['expiresAt'];
  };
}

// Type Guards
export const isUser = (obj: any): obj is User => {
  return (
    obj && typeof obj.clerkId === 'string' && typeof obj.email === 'string'
  );
};

export const isSocialAccount = (obj: any): obj is SocialAccount => {
  return (
    obj && typeof obj.userId === 'string' && typeof obj.platform === 'string'
  );
};

export const isWebhookEvent = (obj: any): obj is WebhookEvent => {
  return (
    obj && typeof obj.source === 'string' && typeof obj.eventType === 'string'
  );
};
