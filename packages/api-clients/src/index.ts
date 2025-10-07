/**
 * API Clients Package - Main Export
 * Centralized API client utilities for external service integrations
 */

// Base Client
export { BaseApiClient } from './base/BaseApiClient';
export type { ApiClientConfig, RequestOptions } from './base/BaseApiClient';

// Stripe Client
export { StripeClient } from './stripe/StripeClient';
export type { StripeClientConfig } from './stripe/StripeClient';

// Ayrshare Client
export { AyrshareClient } from './ayrshare/AyrshareClient';
export type {
  AyrshareClientConfig,
  CreatePostParams,
  ConnectAccountParams,
} from './ayrshare/AyrshareClient';

// Factory
export { ApiClientFactory } from './factory/ApiClientFactory';
export type {
  ApiClientFactoryConfig,
  ClientInstances,
} from './factory/ApiClientFactory';

// Re-export types from the types package for convenience
export type {
  // Stripe Types
  StripeCustomer,
  StripeSubscription,
  StripePaymentIntent,
  StripeCurrency,
  StripeError,

  // Ayrshare Types
  SocialAccount,
  SocialPost,
  PostAnalytics,
  SocialPlatform,
  SocialPostStatus,
  MediaAttachment,

  // Common Types
  RetryConfig,
  CacheConfig,
  RateLimitConfig,
} from '@packages/types';

// Package version
export const VERSION = '1.0.0';
