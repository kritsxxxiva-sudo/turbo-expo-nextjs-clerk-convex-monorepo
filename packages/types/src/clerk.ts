/**
 * Clerk Authentication Type Definitions
 * Comprehensive types for Clerk integration
 */

// Core User Types
export interface ClerkUser {
  readonly id: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly imageUrl?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly lastSignInAt?: number;
  readonly emailVerified: boolean;
  readonly phoneNumbers: ClerkPhoneNumber[];
  readonly emailAddresses: ClerkEmailAddress[];
  readonly externalAccounts: ClerkExternalAccount[];
}

export interface ClerkEmailAddress {
  readonly id: string;
  readonly emailAddress: string;
  readonly verification: ClerkVerification;
  readonly linkedTo: ClerkLinkedTo[];
}

export interface ClerkPhoneNumber {
  readonly id: string;
  readonly phoneNumber: string;
  readonly verification: ClerkVerification;
  readonly linkedTo: ClerkLinkedTo[];
}

export interface ClerkExternalAccount {
  readonly id: string;
  readonly provider: string;
  readonly providerUserId: string;
  readonly emailAddress: string;
  readonly verification: ClerkVerification;
}

export interface ClerkVerification {
  readonly status: 'verified' | 'unverified' | 'transferable';
  readonly strategy: string;
  readonly attempts?: number;
  readonly expireAt?: number;
}

export interface ClerkLinkedTo {
  readonly type: 'email_address' | 'phone_number';
  readonly id: string;
}

// Session Types
export interface ClerkSession {
  readonly id: string;
  readonly userId: string;
  readonly status:
    | 'active'
    | 'ended'
    | 'expired'
    | 'removed'
    | 'replaced'
    | 'revoked';
  readonly lastActiveAt: number;
  readonly expireAt: number;
  readonly abandonAt: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface ClerkSessionToken {
  readonly token: string;
  readonly expiresAt: number;
  readonly userId: string;
  readonly sessionId: string;
}

// Authentication Response Types
export interface ClerkAuthResponse {
  readonly user: ClerkUser;
  readonly session: ClerkSession;
  readonly token: ClerkSessionToken;
}

export interface ClerkTokenValidation {
  readonly valid: boolean;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly error?: string;
}

// Webhook Types
export interface ClerkWebhookEvent {
  readonly type: ClerkWebhookEventType;
  readonly data: ClerkWebhookData;
  readonly object: 'event';
  readonly created: number;
}

export type ClerkWebhookEventType =
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'session.created'
  | 'session.ended'
  | 'session.removed'
  | 'session.revoked'
  | 'email.created'
  | 'sms.created';

export interface ClerkWebhookData {
  readonly id: string;
  readonly object: string;
  readonly [key: string]: any;
}

// Configuration Types
export interface ClerkConfig {
  readonly publishableKey: string;
  readonly secretKey: string;
  readonly webhookSecret: string;
  readonly apiUrl?: string;
  readonly apiVersion?: string;
  readonly jwtTemplate?: string;
}

export interface ClerkSessionConfig {
  readonly defaultTimeout: number; // milliseconds
  readonly maxTimeout: number; // milliseconds
  readonly refreshThreshold: number; // milliseconds before expiry to refresh
  readonly allowConcurrentSessions: boolean;
  readonly requireFreshSession: boolean;
}

// Error Types
export interface ClerkError {
  readonly code: string;
  readonly message: string;
  readonly longMessage?: string;
  readonly meta?: Record<string, any>;
}

export interface ClerkApiError extends ClerkError {
  readonly status: number;
  readonly clerkTraceId?: string;
}

// Utility Types
export type ClerkUserId = string;
export type ClerkSessionId = string;
export type ClerkEmailId = string;

// Type Guards
export const isClerkUser = (obj: any): obj is ClerkUser => {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
};

export const isClerkSession = (obj: any): obj is ClerkSession => {
  return obj && typeof obj.id === 'string' && typeof obj.userId === 'string';
};

export const isClerkWebhookEvent = (obj: any): obj is ClerkWebhookEvent => {
  return (
    obj && typeof obj.type === 'string' && obj.data && obj.object === 'event'
  );
};

// Constants
export const CLERK_WEBHOOK_EVENTS = [
  'user.created',
  'user.updated',
  'user.deleted',
  'session.created',
  'session.ended',
  'session.removed',
  'session.revoked',
  'email.created',
  'sms.created',
] as const;

export const CLERK_SESSION_STATUSES = [
  'active',
  'ended',
  'expired',
  'removed',
  'replaced',
  'revoked',
] as const;
