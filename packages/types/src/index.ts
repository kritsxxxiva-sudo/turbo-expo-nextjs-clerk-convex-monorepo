/**
 * Shared Types Package - Main Export
 * Centralized type definitions for external service integrations
 */

// Clerk Authentication Types
export * from './clerk';
export type {
  ClerkUser,
  ClerkSession,
  ClerkAuthResponse,
  ClerkWebhookEvent,
  ClerkConfig,
  ClerkSessionConfig,
  ClerkError,
  ClerkApiError,
} from './clerk';

// Stripe Payment Types
export * from './stripe';
export type {
  StripeCustomer,
  StripeSubscription,
  StripePaymentIntent,
  StripeWebhookEvent,
  StripeConfig,
  StripeMultiCurrencyConfig,
  StripeError,
  StripeCurrency,
  StripeCurrencyInfo,
} from './stripe';

// Ayrshare Social Media Types
export * from './ayrshare';
export type {
  SocialAccount,
  SocialPost,
  PostAnalytics,
  AyrshareWebhookEvent,
  AyrshareConfig,
  SocialPlatform,
  SocialPostStatus,
  MediaAttachment,
  PlatformConstraints,
} from './ayrshare';

// Environment Configuration Types
export * from './environment';
export type {
  EnvironmentConfig,
  ClerkEnvironment,
  StripeEnvironment,
  AyrshareEnvironment,
  ConvexEnvironment,
  CompleteEnvironment,
  EnvironmentValidation,
} from './environment';

// Convex-specific Types
export * from './convex';

// Common Utility Types
export interface ApiResponse<T = any> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly timestamp: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
  };
}

export interface WebhookPayload<T = any> {
  readonly event: string;
  readonly data: T;
  readonly timestamp: number;
  readonly signature: string;
}

// Error Types
export interface BaseError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, any>;
  readonly timestamp: number;
}

export interface ValidationError extends BaseError {
  readonly field: string;
  readonly value: any;
  readonly constraint: string;
}

export interface NetworkError extends BaseError {
  readonly statusCode: number;
  readonly retryable: boolean;
  readonly retryAfter?: number;
}

// Common Status Types
export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'error';

export type SyncStatus = 'synced' | 'syncing' | 'out_of_sync' | 'sync_failed';

// Utility Type Helpers
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// ID Types
export type UserId = string;
export type SessionId = string;
export type CustomerId = string;
export type SubscriptionId = string;
export type PostId = string;
export type AccountId = string;
export type WebhookEventId = string;

// Timestamp Types
export type Timestamp = number;
export type ISODateString = string;

// Configuration Types
export interface RetryConfig {
  readonly maxAttempts: number;
  readonly baseDelay: number;
  readonly maxDelay: number;
  readonly backoffFactor: number;
}

export interface CacheConfig {
  readonly ttl: number; // Time to live in milliseconds
  readonly maxSize: number;
  readonly strategy: 'lru' | 'fifo' | 'lfu';
}

export interface RateLimitConfig {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly skipSuccessfulRequests?: boolean;
  readonly skipFailedRequests?: boolean;
}

// Feature Flags
export interface FeatureFlags {
  readonly multiCurrencySupport: boolean;
  readonly advancedAnalytics: boolean;
  readonly contentOptimization: boolean;
  readonly realTimeSync: boolean;
  readonly auditLogging: boolean;
  readonly performanceMonitoring: boolean;
}

// Version Information
export const PACKAGE_VERSION = '1.0.0';
export const API_VERSION = 'v1';
export const SCHEMA_VERSION = '1.0.0';
