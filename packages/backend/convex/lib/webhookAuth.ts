/**
 * Webhook Signature Verification Middleware
 * Provides secure webhook authentication for all external services
 */

import { ConvexError } from "convex/values";
import crypto from "crypto";

// Webhook verification result
export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  timestamp?: number;
}

// Webhook signature verification for Clerk
export function verifyClerkWebhook(
  payload: string,
  signature: string,
  secret: string,
): WebhookVerificationResult {
  try {
    if (!signature || !secret) {
      return { valid: false, error: "Missing signature or secret" };
    }

    // Clerk uses HMAC SHA-256
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );

    return { valid: isValid, timestamp: Date.now() };
  } catch (error) {
    return {
      valid: false,
      error: `Clerk webhook verification failed: ${error.message}`,
    };
  }
}

// Webhook signature verification for Stripe
export function verifyStripeWebhook(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300, // 5 minutes
): WebhookVerificationResult {
  try {
    if (!signature || !secret) {
      return { valid: false, error: "Missing signature or secret" };
    }

    // Parse Stripe signature header
    const elements = signature.split(",");
    const signatureElements: Record<string, string> = {};

    elements.forEach((element) => {
      const [key, value] = element.split("=");
      if (key && value) {
        signatureElements[key] = value;
      }
    });

    const timestamp = parseInt(signatureElements.t || "0", 10);
    const signatures = [signatureElements.v1, signatureElements.v0].filter(
      Boolean,
    );

    if (!timestamp || signatures.length === 0) {
      return { valid: false, error: "Invalid signature format" };
    }

    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) {
      return { valid: false, error: "Timestamp outside tolerance" };
    }

    // Verify signature
    const payloadForSignature = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadForSignature, "utf8")
      .digest("hex");

    const isValid = signatures.some((sig) =>
      crypto.timingSafeEqual(
        Buffer.from(sig, "hex"),
        Buffer.from(expectedSignature, "hex"),
      ),
    );

    return { valid: isValid, timestamp: timestamp * 1000 };
  } catch (error) {
    return {
      valid: false,
      error: `Stripe webhook verification failed: ${error.message}`,
    };
  }
}

// Webhook signature verification for Ayrshare
export function verifyAyrshareWebhook(
  payload: string,
  signature: string,
  secret: string,
): WebhookVerificationResult {
  try {
    if (!signature || !secret) {
      return { valid: false, error: "Missing signature or secret" };
    }

    // Ayrshare uses HMAC SHA-256
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Compare signatures using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );

    return { valid: isValid, timestamp: Date.now() };
  } catch (error) {
    return {
      valid: false,
      error: `Ayrshare webhook verification failed: ${error.message}`,
    };
  }
}

// Generic webhook verification
export function verifyWebhook(
  service: "clerk" | "stripe" | "ayrshare",
  payload: string,
  signature: string,
  secret: string,
  options?: { tolerance?: number },
): WebhookVerificationResult {
  switch (service) {
    case "clerk":
      return verifyClerkWebhook(payload, signature, secret);

    case "stripe":
      return verifyStripeWebhook(
        payload,
        signature,
        secret,
        options?.tolerance,
      );

    case "ayrshare":
      return verifyAyrshareWebhook(payload, signature, secret);

    default:
      return { valid: false, error: `Unsupported service: ${service}` };
  }
}

// Webhook rate limiting
const webhookAttempts = new Map<string, { count: number; resetTime: number }>();

export function checkWebhookRateLimit(
  service: string,
  identifier: string,
  maxAttempts: number = 100,
  windowMs: number = 60000, // 1 minute
): boolean {
  const now = Date.now();
  const key = `webhook:${service}:${identifier}`;

  const current = webhookAttempts.get(key);

  if (!current || current.resetTime < now) {
    webhookAttempts.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxAttempts) {
    return false;
  }

  current.count++;
  return true;
}

// Clear webhook rate limit
export function clearWebhookRateLimit(
  service: string,
  identifier: string,
): void {
  const key = `webhook:${service}:${identifier}`;
  webhookAttempts.delete(key);
}

// Webhook security headers validation
export function validateWebhookHeaders(
  headers: Record<string, string>,
  service: "clerk" | "stripe" | "ayrshare",
): { valid: boolean; error?: string } {
  const contentType = headers["content-type"] || headers["Content-Type"];

  if (!contentType || !contentType.includes("application/json")) {
    return { valid: false, error: "Invalid content type" };
  }

  // Service-specific header validation
  switch (service) {
    case "clerk":
      if (!headers["clerk-signature"]) {
        return { valid: false, error: "Missing Clerk signature header" };
      }
      break;

    case "stripe":
      if (!headers["stripe-signature"]) {
        return { valid: false, error: "Missing Stripe signature header" };
      }
      break;

    case "ayrshare":
      if (!headers["x-ayrshare-signature"]) {
        return { valid: false, error: "Missing Ayrshare signature header" };
      }
      break;
  }

  return { valid: true };
}

// Webhook payload size validation
export function validateWebhookPayloadSize(
  payload: string,
  maxSizeBytes: number = 1024 * 1024, // 1MB default
): { valid: boolean; error?: string } {
  const payloadSize = Buffer.byteLength(payload, "utf8");

  if (payloadSize > maxSizeBytes) {
    return {
      valid: false,
      error: `Payload too large: ${payloadSize} bytes (max: ${maxSizeBytes})`,
    };
  }

  return { valid: true };
}

// Webhook event deduplication
const processedEvents = new Map<string, number>();

export function isDuplicateWebhookEvent(
  service: string,
  eventId: string,
  ttlMs: number = 24 * 60 * 60 * 1000, // 24 hours
): boolean {
  const key = `${service}:${eventId}`;
  const now = Date.now();

  // Clean up expired entries
  for (const [k, timestamp] of processedEvents.entries()) {
    if (now - timestamp > ttlMs) {
      processedEvents.delete(k);
    }
  }

  if (processedEvents.has(key)) {
    return true;
  }

  processedEvents.set(key, now);
  return false;
}

// Webhook middleware factory
export function createWebhookMiddleware(options: {
  service: "clerk" | "stripe" | "ayrshare";
  secret: string;
  rateLimit?: { maxAttempts: number; windowMs: number };
  maxPayloadSize?: number;
  tolerance?: number;
}) {
  return (payload: string, headers: Record<string, string>) => {
    // Validate headers
    const headerValidation = validateWebhookHeaders(headers, options.service);
    if (!headerValidation.valid) {
      throw new ConvexError(
        `Header validation failed: ${headerValidation.error}`,
      );
    }

    // Validate payload size
    const sizeValidation = validateWebhookPayloadSize(
      payload,
      options.maxPayloadSize,
    );
    if (!sizeValidation.valid) {
      throw new ConvexError(
        `Payload validation failed: ${sizeValidation.error}`,
      );
    }

    // Extract signature based on service
    let signature: string;
    switch (options.service) {
      case "clerk":
        signature = headers["clerk-signature"] || "";
        break;
      case "stripe":
        signature = headers["stripe-signature"] || "";
        break;
      case "ayrshare":
        signature = headers["x-ayrshare-signature"] || "";
        break;
    }

    // Rate limiting
    if (options.rateLimit) {
      const allowed = checkWebhookRateLimit(
        options.service,
        signature.slice(0, 10), // Use part of signature as identifier
        options.rateLimit.maxAttempts,
        options.rateLimit.windowMs,
      );
      if (!allowed) {
        throw new ConvexError("Webhook rate limit exceeded");
      }
    }

    // Verify signature
    const verification = verifyWebhook(
      options.service,
      payload,
      signature,
      options.secret,
      { tolerance: options.tolerance },
    );

    if (!verification.valid) {
      throw new ConvexError(
        `Webhook verification failed: ${verification.error}`,
      );
    }

    return verification;
  };
}

// Common webhook middleware presets
export const webhookMiddleware = {
  clerk: (secret: string) =>
    createWebhookMiddleware({
      service: "clerk",
      secret,
      rateLimit: { maxAttempts: 100, windowMs: 60000 },
      maxPayloadSize: 1024 * 1024, // 1MB
    }),

  stripe: (secret: string) =>
    createWebhookMiddleware({
      service: "stripe",
      secret,
      rateLimit: { maxAttempts: 200, windowMs: 60000 },
      maxPayloadSize: 2 * 1024 * 1024, // 2MB
      tolerance: 300, // 5 minutes
    }),

  ayrshare: (secret: string) =>
    createWebhookMiddleware({
      service: "ayrshare",
      secret,
      rateLimit: { maxAttempts: 50, windowMs: 60000 },
      maxPayloadSize: 512 * 1024, // 512KB
    }),
};
