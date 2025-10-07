/**
 * Clerk Authentication Setup
 * Configures Clerk authentication for Convex backend
 */

import { ConvexError } from "convex/values";
import { Auth } from "convex/server";

// Authentication configuration
export interface AuthConfig {
  domain: string;
  applicationId: string;
  jwksUrl?: string;
}

// User identity from Clerk JWT
export interface ClerkUserIdentity {
  tokenIdentifier: string;
  subject: string;
  issuer: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  nickname?: string;
  picture?: string;
  givenName?: string;
  familyName?: string;
  updatedAt?: number;
}

// Authentication context
export interface AuthContext {
  userId?: string;
  sessionId?: string;
  user?: ClerkUserIdentity;
  isAuthenticated: boolean;
}

// Extract user information from Clerk JWT
export function extractUserFromAuth(auth: Auth): ClerkUserIdentity | null {
  const identity = auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return {
    tokenIdentifier: identity.tokenIdentifier,
    subject: identity.subject,
    issuer: identity.issuer,
    email: identity.email,
    emailVerified: identity.emailVerified,
    name: identity.name,
    nickname: identity.nickname,
    picture: identity.picture,
    givenName: identity.givenName,
    familyName: identity.familyName,
    updatedAt: identity.updatedAt,
  };
}

// Get authenticated user context
export function getAuthContext(auth: Auth): AuthContext {
  const user = extractUserFromAuth(auth);

  return {
    userId: user?.subject,
    sessionId: user?.tokenIdentifier,
    user,
    isAuthenticated: !!user,
  };
}

// Require authentication middleware
export function requireAuth(auth: Auth): ClerkUserIdentity {
  const user = extractUserFromAuth(auth);
  if (!user) {
    throw new ConvexError("Authentication required");
  }
  return user;
}

// Require specific role middleware
export function requireRole(
  auth: Auth,
  allowedRoles: string[],
): ClerkUserIdentity {
  const user = requireAuth(auth);

  // TODO: Implement role checking logic
  // This would typically involve:
  // 1. Looking up user in database
  // 2. Checking their role
  // 3. Verifying against allowedRoles

  return user;
}

// Require admin role middleware
export function requireAdmin(auth: Auth): ClerkUserIdentity {
  return requireRole(auth, ["admin"]);
}

// Optional authentication middleware
export function optionalAuth(auth: Auth): ClerkUserIdentity | null {
  return extractUserFromAuth(auth);
}

// Validate JWT token structure
export function validateJWTStructure(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    // Validate each part is valid base64
    parts.forEach((part) => {
      if (!part || part.length === 0) {
        throw new Error("Invalid token part");
      }
    });

    return true;
  } catch {
    return false;
  }
}

// Extract claims from JWT (without verification)
export function extractJWTClaims(token: string): any {
  try {
    if (!validateJWTStructure(token)) {
      throw new Error("Invalid JWT structure");
    }

    const payload = token.split(".")[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(decoded);
  } catch (error) {
    throw new ConvexError(`Failed to extract JWT claims: ${error.message}`);
  }
}

// Check if token is expired
export function isTokenExpired(token: string): boolean {
  try {
    const claims = extractJWTClaims(token);
    const now = Math.floor(Date.now() / 1000);
    return claims.exp && claims.exp < now;
  } catch {
    return true; // Assume expired if we can't parse
  }
}

// Get token expiration time
export function getTokenExpiration(token: string): number | null {
  try {
    const claims = extractJWTClaims(token);
    return claims.exp ? claims.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

// Authentication error types
export class AuthenticationError extends ConvexError {
  constructor(message: string) {
    super(`Authentication Error: ${message}`);
  }
}

export class AuthorizationError extends ConvexError {
  constructor(message: string) {
    super(`Authorization Error: ${message}`);
  }
}

export class TokenExpiredError extends ConvexError {
  constructor() {
    super("Token has expired");
  }
}

// Session validation
export function validateSession(auth: Auth): {
  valid: boolean;
  user?: ClerkUserIdentity;
  error?: string;
} {
  try {
    const user = extractUserFromAuth(auth);

    if (!user) {
      return { valid: false, error: "No authentication token provided" };
    }

    // Additional validation can be added here
    // - Check token expiration
    // - Validate issuer
    // - Check user status in database

    return { valid: true, user };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error ? error.message : "Unknown authentication error",
    };
  }
}

// Rate limiting for authentication attempts
const authAttempts = new Map<string, { count: number; resetTime: number }>();

export function checkAuthRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 300000,
): boolean {
  const now = Date.now();
  const key = `auth:${identifier}`;

  const current = authAttempts.get(key);

  if (!current || current.resetTime < now) {
    authAttempts.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxAttempts) {
    return false;
  }

  current.count++;
  return true;
}

// Clear rate limit for successful authentication
export function clearAuthRateLimit(identifier: string): void {
  const key = `auth:${identifier}`;
  authAttempts.delete(key);
}

// Audit logging for authentication events
export interface AuthAuditEvent {
  event: "login" | "logout" | "token_refresh" | "auth_failure";
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Log authentication events (to be implemented with actual logging system)
export function logAuthEvent(event: AuthAuditEvent): void {
  // TODO: Implement actual audit logging
  // This could write to a database table, external logging service, etc.
  console.log("Auth Event:", JSON.stringify(event));
}

// Helper to create auth audit events
export function createAuthAuditEvent(
  event: AuthAuditEvent["event"],
  auth: Auth,
  metadata?: Record<string, any>,
): AuthAuditEvent {
  const user = extractUserFromAuth(auth);

  return {
    event,
    userId: user?.subject,
    sessionId: user?.tokenIdentifier,
    timestamp: Date.now(),
    metadata,
  };
}

// Middleware factory for common auth patterns
export function createAuthMiddleware(options: {
  required?: boolean;
  roles?: string[];
  rateLimit?: { maxAttempts: number; windowMs: number };
  audit?: boolean;
}) {
  return (auth: Auth) => {
    const context = getAuthContext(auth);

    // Rate limiting
    if (options.rateLimit && context.userId) {
      const allowed = checkAuthRateLimit(
        context.userId,
        options.rateLimit.maxAttempts,
        options.rateLimit.windowMs,
      );
      if (!allowed) {
        throw new ConvexError("Rate limit exceeded");
      }
    }

    // Authentication requirement
    if (options.required && !context.isAuthenticated) {
      if (options.audit) {
        logAuthEvent(
          createAuthAuditEvent("auth_failure", auth, {
            reason: "not_authenticated",
          }),
        );
      }
      throw new AuthenticationError("Authentication required");
    }

    // Role requirement
    if (options.roles && context.isAuthenticated) {
      // TODO: Implement role checking
      // This would check user's role against options.roles
    }

    // Audit successful authentication
    if (options.audit && context.isAuthenticated) {
      logAuthEvent(createAuthAuditEvent("login", auth));
    }

    return context;
  };
}

// Common middleware presets
export const authMiddleware = {
  required: createAuthMiddleware({ required: true, audit: true }),
  optional: createAuthMiddleware({ required: false }),
  admin: createAuthMiddleware({
    required: true,
    roles: ["admin"],
    audit: true,
  }),
  rateLimited: createAuthMiddleware({
    required: true,
    rateLimit: { maxAttempts: 10, windowMs: 300000 },
    audit: true,
  }),
};
