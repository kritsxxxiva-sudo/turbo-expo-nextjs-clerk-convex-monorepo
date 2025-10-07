# Data Model: Comprehensive External Service Integration

**Date**: 2025-10-06  
**Feature**: Comprehensive External Service Integration  
**Status**: Complete

## Overview

This document defines the comprehensive data model for integrating external services (Clerk, Stripe, Ayrshare) with our Convex database, including entity relationships, validation rules, and state transitions.

## Core Entities

### User Entity

**Purpose**: Central user management with Clerk integration  
**Source**: Clerk webhooks + application data

```typescript
interface User {
  _id: Id<"users">;
  clerkId: string; // Unique Clerk user identifier
  email: string; // Primary email address
  firstName?: string; // User's first name
  lastName?: string; // User's last name
  username?: string; // Unique username
  profileImageUrl?: string; // Profile image URL
  role: "admin" | "premium" | "free"; // User role for access control
  status: "active" | "suspended" | "deleted"; // Account status
  preferences: UserPreferences; // User preferences object
  metadata?: Record<string, any>; // Additional user metadata
  createdAt: number; // Account creation timestamp
  updatedAt: number; // Last update timestamp
  lastLoginAt?: number; // Last login timestamp
  emailVerifiedAt?: number; // Email verification timestamp
}

interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string; // ISO language code
  timezone: string; // IANA timezone identifier
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
    security: boolean;
  };
  privacy: {
    profileVisible: boolean;
    analyticsEnabled: boolean;
    dataSharing: boolean;
  };
}
```

**Validation Rules**:

- `clerkId`: Required, unique, non-empty string
- `email`: Required, valid email format, unique
- `username`: Optional, unique, alphanumeric + underscore/dash
- `role`: Required, must be one of defined values
- `preferences`: Required, all nested fields required

**Relationships**:

- One-to-many with `socialAccounts`
- One-to-many with `customers`
- One-to-many with `subscriptions`
- One-to-many with `socialPosts`

### Social Account Entity

**Purpose**: Social media account connections via Ayrshare  
**Source**: Ayrshare OAuth flows

```typescript
interface SocialAccount {
  _id: Id<"socialAccounts">;
  userId: Id<"users">; // Reference to user
  platform: SocialPlatform; // Social media platform
  accountId: string; // Platform-specific account ID
  accountName: string; // Display name for account
  profileUrl?: string; // Profile URL on platform
  profileImageUrl?: string; // Profile image URL
  accessToken: string; // Encrypted access token
  refreshToken?: string; // Encrypted refresh token
  tokenExpiresAt?: number; // Token expiration timestamp
  permissions: string[]; // Granted permissions
  isActive: boolean; // Account connection status
  lastSyncAt?: number; // Last synchronization timestamp
  metadata?: Record<string, any>; // Platform-specific metadata
  createdAt: number; // Connection creation timestamp
  updatedAt: number; // Last update timestamp
}

type SocialPlatform =
  | "facebook"
  | "instagram"
  | "x"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "reddit"
  | "snapchat"
  | "telegram"
  | "threads"
  | "bluesky"
  | "google_business";
```

**Validation Rules**:

- `userId`: Required, valid user reference
- `platform`: Required, must be supported platform
- `accountId`: Required, unique per platform
- `accessToken`: Required, encrypted before storage
- `permissions`: Required, non-empty array

**State Transitions**:

- `isActive`: true ↔ false (user can enable/disable)
- Connection flow: OAuth → token exchange → active
- Disconnection flow: active → token revocation → inactive

### Customer Entity

**Purpose**: Stripe customer data synchronization  
**Source**: Stripe webhooks + API calls

```typescript
interface Customer {
  _id: Id<"customers">;
  userId: Id<"users">; // Reference to user
  stripeCustomerId: string; // Stripe customer ID
  email: string; // Customer email
  name?: string; // Customer name
  defaultPaymentMethodId?: string; // Default payment method
  currency: string; // Customer currency (ISO 4217)
  taxIds?: TaxId[]; // Tax identification numbers
  address?: Address; // Billing address
  metadata?: Record<string, string>; // Stripe metadata
  createdAt: number; // Customer creation timestamp
  updatedAt: number; // Last update timestamp
}

interface TaxId {
  type: string; // Tax ID type (e.g., "vat", "ein")
  value: string; // Tax ID value
}

interface Address {
  line1: string; // Address line 1
  line2?: string; // Address line 2
  city: string; // City
  state?: string; // State/province
  postalCode: string; // Postal/ZIP code
  country: string; // Country code (ISO 3166-1)
}
```

**Validation Rules**:

- `stripeCustomerId`: Required, unique, starts with "cus\_"
- `email`: Required, valid email format
- `currency`: Required, valid ISO 4217 currency code
- `address.country`: Required, valid ISO 3166-1 country code

### Subscription Entity

**Purpose**: Stripe subscription management  
**Source**: Stripe webhooks

```typescript
interface Subscription {
  _id: Id<"subscriptions">;
  userId: Id<"users">; // Reference to user
  customerId: Id<"customers">; // Reference to customer
  stripeSubscriptionId: string; // Stripe subscription ID
  stripePriceId: string; // Stripe price ID
  status: SubscriptionStatus; // Subscription status
  currentPeriodStart: number; // Current period start timestamp
  currentPeriodEnd: number; // Current period end timestamp
  cancelAtPeriodEnd: boolean; // Cancel at period end flag
  canceledAt?: number; // Cancellation timestamp
  trialStart?: number; // Trial start timestamp
  trialEnd?: number; // Trial end timestamp
  quantity: number; // Subscription quantity
  metadata?: Record<string, string>; // Stripe metadata
  createdAt: number; // Subscription creation timestamp
  updatedAt: number; // Last update timestamp
}

type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid";
```

**Validation Rules**:

- `stripeSubscriptionId`: Required, unique, starts with "sub\_"
- `stripePriceId`: Required, starts with "price\_"
- `quantity`: Required, positive integer
- `currentPeriodEnd`: Must be after `currentPeriodStart`

**State Transitions**:

- `incomplete` → `active` (payment successful)
- `active` → `past_due` (payment failed)
- `active` → `canceled` (user cancellation)
- `trialing` → `active` (trial ended, payment successful)

### Social Post Entity

**Purpose**: Social media posting history and analytics  
**Source**: Ayrshare API + webhooks

```typescript
interface SocialPost {
  _id: Id<"socialPosts">;
  userId: Id<"users">; // Reference to user
  noteId?: Id<"notes">; // Optional reference to note
  ayrsharePostId?: string; // Ayrshare post ID
  content: string; // Post content
  platforms: string[]; // Target platforms
  mediaUrls?: string[]; // Media attachment URLs
  scheduledAt?: number; // Scheduled publication timestamp
  publishedAt?: number; // Actual publication timestamp
  status: PostStatus; // Post status
  analytics?: PostAnalytics; // Post performance analytics
  errors?: PostError[]; // Platform-specific errors
  metadata?: Record<string, any>; // Additional post metadata
  createdAt: number; // Post creation timestamp
  updatedAt: number; // Last update timestamp
}

type PostStatus = "draft" | "scheduled" | "published" | "failed" | "deleted";

interface PostAnalytics {
  views?: number; // Total views
  likes?: number; // Total likes
  shares?: number; // Total shares
  comments?: number; // Total comments
  clicks?: number; // Total clicks
  lastUpdated: number; // Analytics last update timestamp
}

interface PostError {
  platform: string; // Platform where error occurred
  error: string; // Error message
  timestamp: number; // Error timestamp
}
```

**Validation Rules**:

- `content`: Required, non-empty, max 2000 characters
- `platforms`: Required, non-empty array of valid platforms
- `status`: Required, valid status value
- `scheduledAt`: If present, must be future timestamp

**State Transitions**:

- `draft` → `scheduled` (user schedules post)
- `scheduled` → `published` (successful publication)
- `scheduled` → `failed` (publication failure)
- `published` → `deleted` (user deletion)

### Webhook Event Entity

**Purpose**: External service webhook tracking  
**Source**: Clerk, Stripe, Ayrshare webhooks

```typescript
interface WebhookEvent {
  _id: Id<"webhookEvents">;
  source: "clerk" | "stripe" | "ayrshare"; // Webhook source
  eventType: string; // Event type (e.g., "user.created")
  eventId: string; // External event ID
  userId?: Id<"users">; // Related user (if applicable)
  payload: any; // Raw webhook payload
  processed: boolean; // Processing status
  processingError?: string; // Processing error message
  retryCount: number; // Number of retry attempts
  createdAt: number; // Webhook receipt timestamp
  processedAt?: number; // Processing completion timestamp
}
```

**Validation Rules**:

- `source`: Required, valid webhook source
- `eventType`: Required, non-empty string
- `eventId`: Required, unique per source
- `retryCount`: Non-negative integer

## Entity Relationships

### Primary Relationships

```
User (1) ←→ (N) SocialAccount
User (1) ←→ (N) Customer
User (1) ←→ (N) Subscription
User (1) ←→ (N) SocialPost
Customer (1) ←→ (N) Subscription
```

### Referential Integrity Rules

- Cascade delete: User deletion removes all related entities
- Soft delete: Mark entities as deleted rather than physical deletion
- Foreign key validation: All references must point to existing entities
- Orphan cleanup: Periodic cleanup of orphaned records

## Indexing Strategy

### Primary Indexes

```typescript
// Users
.index("by_clerk_id", ["clerkId"])
.index("by_email", ["email"])
.index("by_role", ["role"])
.index("by_status", ["status"])

// Social Accounts
.index("by_user_id", ["userId"])
.index("by_platform", ["platform"])
.index("by_is_active", ["isActive"])

// Customers
.index("by_user_id", ["userId"])
.index("by_stripe_customer_id", ["stripeCustomerId"])

// Subscriptions
.index("by_user_id", ["userId"])
.index("by_status", ["status"])
.index("by_current_period_end", ["currentPeriodEnd"])

// Social Posts
.index("by_user_id", ["userId"])
.index("by_status", ["status"])
.index("by_scheduled_at", ["scheduledAt"])
.index("by_published_at", ["publishedAt"])

// Webhook Events
.index("by_source", ["source"])
.index("by_processed", ["processed"])
.index("by_created_at", ["createdAt"])
```

### Compound Indexes

```typescript
// Active social accounts by user and platform
.index("by_user_platform_active", ["userId", "platform", "isActive"])

// User subscriptions by status
.index("by_user_subscription_status", ["userId", "status"])

// Scheduled posts by user and time
.index("by_user_scheduled", ["userId", "scheduledAt"])
```

## Data Validation

### Runtime Validation

- Use Convex validators (`v`) for all schema fields
- Custom validation functions for complex business rules
- Type guards for external API responses
- Input sanitization for user-generated content

### Business Rules

- Users can have only one active subscription per price
- Social accounts must be unique per user-platform combination
- Webhook events must be processed idempotently
- Post scheduling must be at least 5 minutes in the future

## Data Migration Strategy

### Schema Versioning

- Version all schema changes with migration scripts
- Backward compatibility for at least 2 versions
- Gradual migration for large datasets
- Rollback procedures for failed migrations

### Data Consistency

- Atomic operations for related entity updates
- Transaction-like behavior using Convex mutations
- Eventual consistency for cross-service synchronization
- Conflict resolution for concurrent updates

## Security Considerations

### Data Encryption

- Encrypt sensitive fields (access tokens, payment data)
- Use environment-specific encryption keys
- Rotate encryption keys periodically
- Secure key storage and access

### Access Control

- Row-level security based on user ownership
- Role-based access for admin functions
- API key validation for external service calls
- Audit logging for all data access

## Performance Optimization

### Query Optimization

- Strategic indexing for common query patterns
- Pagination for large result sets
- Caching for frequently accessed data
- Lazy loading for related entities

### Data Archiving

- Archive old webhook events (>90 days)
- Soft delete with periodic cleanup
- Data retention policies per entity type
- Export capabilities for archived data

## Monitoring and Observability

### Data Quality Metrics

- Entity count and growth trends
- Data consistency validation
- Schema compliance monitoring
- Performance metrics per entity type

### Alerting

- Failed webhook processing
- Data synchronization failures
- Schema validation errors
- Performance degradation alerts
