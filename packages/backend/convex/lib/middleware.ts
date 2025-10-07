/**
 * Advanced Middleware System
 * Comprehensive request/response processing with authentication, rate limiting, and monitoring
 */

import { ConvexError } from "convex/values";
import { createLogger } from "./logging";
import { createPerformanceMonitor, createErrorTracker } from "./monitoring";

// Middleware context
export interface MiddlewareContext {
  requestId: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  headers: Record<string, string>;
  metadata: Record<string, any>;
}

// Middleware function type
export type MiddlewareFunction = (
  ctx: any,
  context: MiddlewareContext,
  next: () => Promise<any>,
) => Promise<any>;

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (context: MiddlewareContext) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

// Authentication middleware
export function authenticationMiddleware(options: {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
}): MiddlewareFunction {
  return async (ctx, context, next) => {
    const logger = createLogger("middleware", "authentication", {
      requestId: context.requestId,
    });
    const monitor = createPerformanceMonitor("middleware.authentication");

    try {
      // Extract JWT token from headers
      const authHeader = context.headers.authorization;
      if (!authHeader && options.required) {
        throw new ConvexError("Authentication required");
      }

      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");

        // Verify JWT token (simplified - in production use proper JWT verification)
        try {
          // In a real implementation, verify the JWT token with Clerk
          const payload = JSON.parse(atob(token.split(".")[1]));
          context.userId = payload.sub;
          context.sessionId = payload.sid;

          // Get user from database
          const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", context.userId))
            .first();

          if (!user) {
            throw new ConvexError("User not found");
          }

          // Check role requirements
          if (options.roles && !options.roles.includes(user.role)) {
            throw new ConvexError("Insufficient role permissions");
          }

          // Check permission requirements
          if (options.permissions) {
            const userPermissions = getUserPermissions(user.role);
            const hasPermission = options.permissions.every(
              (permission) =>
                userPermissions.includes("*") ||
                userPermissions.includes(permission),
            );

            if (!hasPermission) {
              throw new ConvexError("Insufficient permissions");
            }
          }

          // Add user to context
          context.metadata.user = user;

          await logger.info("Authentication successful", {
            userId: context.userId,
            userRole: user.role,
          });
        } catch (error) {
          await logger.warn("Authentication failed", { error: error.message });
          if (options.required) {
            throw new ConvexError("Invalid authentication token");
          }
        }
      }

      const result = await next();
      await monitor.end(ctx, true);
      return result;
    } catch (error) {
      await monitor.end(ctx, false);
      throw error;
    }
  };
}

// Rate limiting middleware
export function rateLimitMiddleware(
  config: RateLimitConfig,
): MiddlewareFunction {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (ctx, context, next) => {
    const logger = createLogger("middleware", "rateLimit", {
      requestId: context.requestId,
    });
    const key = config.keyGenerator(context);
    const now = Date.now();

    // Clean up expired entries
    for (const [k, v] of requests.entries()) {
      if (now > v.resetTime) {
        requests.delete(k);
      }
    }

    // Get or create rate limit entry
    let entry = requests.get(key);
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      requests.set(key, entry);
    }

    // Check rate limit
    if (entry.count >= config.maxRequests) {
      await logger.warn("Rate limit exceeded", {
        key,
        count: entry.count,
        maxRequests: config.maxRequests,
        resetTime: entry.resetTime,
      });

      throw new ConvexError(config.message || "Rate limit exceeded");
    }

    // Increment counter
    entry.count++;

    try {
      const result = await next();

      // Optionally skip successful requests
      if (config.skipSuccessfulRequests) {
        entry.count--;
      }

      return result;
    } catch (error) {
      // Optionally skip failed requests
      if (config.skipFailedRequests) {
        entry.count--;
      }
      throw error;
    }
  };
}

// Request logging middleware
export function requestLoggingMiddleware(): MiddlewareFunction {
  return async (ctx, context, next) => {
    const logger = createLogger("middleware", "requestLogging", {
      requestId: context.requestId,
    });
    const monitor = createPerformanceMonitor("request.total");

    await logger.info("Request started", {
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    try {
      const result = await next();
      const duration = await monitor.end(ctx, true);

      await logger.info("Request completed", {
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = await monitor.end(ctx, false);

      await logger.error("Request failed", error, {
        duration,
        success: false,
      });

      throw error;
    }
  };
}

// Input validation middleware
export function validationMiddleware<T>(
  schema: (input: any) => T,
  options: { sanitize?: boolean } = {},
): MiddlewareFunction {
  return async (ctx, context, next) => {
    const logger = createLogger("middleware", "validation", {
      requestId: context.requestId,
    });

    try {
      // Validate input (simplified - in production use a proper validation library)
      const validatedInput = schema(context.metadata.input);

      // Sanitize input if requested
      if (options.sanitize) {
        context.metadata.input = sanitizeInput(validatedInput);
      } else {
        context.metadata.input = validatedInput;
      }

      await logger.debug("Input validation successful");
      return await next();
    } catch (error) {
      await logger.warn("Input validation failed", { error: error.message });
      throw new ConvexError(`Validation error: ${error.message}`);
    }
  };
}

// Error handling middleware
export function errorHandlingMiddleware(): MiddlewareFunction {
  return async (ctx, context, next) => {
    const logger = createLogger("middleware", "errorHandling", {
      requestId: context.requestId,
    });
    const errorTracker = createErrorTracker({ requestId: context.requestId });

    try {
      return await next();
    } catch (error) {
      // Log error
      await logger.error("Unhandled error in middleware chain", error);

      // Track error
      await errorTracker.recordError(ctx, error, "high");

      // Transform error for client
      if (error instanceof ConvexError) {
        throw error;
      }

      // Don't expose internal errors to client
      throw new ConvexError("Internal server error");
    }
  };
}

// CORS middleware
export function corsMiddleware(options: {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
}): MiddlewareFunction {
  return async (ctx, context, next) => {
    const origin = context.headers.origin;
    const allowedOrigins = Array.isArray(options.origin)
      ? options.origin
      : [options.origin || "*"];

    // Check origin
    if (
      origin &&
      !allowedOrigins.includes("*") &&
      !allowedOrigins.includes(origin)
    ) {
      throw new ConvexError("CORS: Origin not allowed");
    }

    // Add CORS headers to context for response
    context.metadata.corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigins.includes("*")
        ? "*"
        : origin || allowedOrigins[0],
      "Access-Control-Allow-Methods": (
        options.methods || ["GET", "POST", "PUT", "DELETE"]
      ).join(", "),
      "Access-Control-Allow-Headers": (
        options.allowedHeaders || ["Content-Type", "Authorization"]
      ).join(", "),
      "Access-Control-Allow-Credentials": options.credentials
        ? "true"
        : "false",
    };

    return await next();
  };
}

// Security headers middleware
export function securityHeadersMiddleware(): MiddlewareFunction {
  return async (ctx, context, next) => {
    // Add security headers to context for response
    context.metadata.securityHeaders = {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Content-Security-Policy": "default-src 'self'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    };

    return await next();
  };
}

// Middleware composer
export class MiddlewareComposer {
  private middlewares: MiddlewareFunction[] = [];

  use(middleware: MiddlewareFunction): this {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(
    ctx: any,
    initialContext: Partial<MiddlewareContext>,
  ): Promise<any> {
    const context: MiddlewareContext = {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      headers: {},
      metadata: {},
      ...initialContext,
    };

    let index = 0;

    const next = async (): Promise<any> => {
      if (index >= this.middlewares.length) {
        return context.metadata.result;
      }

      const middleware = this.middlewares[index++];
      return await middleware(ctx, context, next);
    };

    return await next();
  }
}

// Utility functions
function getUserPermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    admin: ["*"],
    premium: [
      "social:post",
      "social:schedule",
      "social:analytics",
      "payments:manage",
      "profile:edit",
    ],
    free: ["profile:edit", "social:post:limited"],
  };

  return rolePermissions[role] || [];
}

function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    // Basic HTML sanitization
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === "object" && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

// Pre-configured middleware stacks
export const webMiddlewareStack = new MiddlewareComposer()
  .use(errorHandlingMiddleware())
  .use(requestLoggingMiddleware())
  .use(corsMiddleware({ origin: "*", credentials: true }))
  .use(securityHeadersMiddleware())
  .use(
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyGenerator: (context) => context.ipAddress || "anonymous",
    }),
  )
  .use(authenticationMiddleware({ required: false }));

export const apiMiddlewareStack = new MiddlewareComposer()
  .use(errorHandlingMiddleware())
  .use(requestLoggingMiddleware())
  .use(
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
      keyGenerator: (context) =>
        context.userId || context.ipAddress || "anonymous",
    }),
  )
  .use(authenticationMiddleware({ required: true }));

export const adminMiddlewareStack = new MiddlewareComposer()
  .use(errorHandlingMiddleware())
  .use(requestLoggingMiddleware())
  .use(
    rateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 500,
      keyGenerator: (context) =>
        context.userId || context.ipAddress || "anonymous",
    }),
  )
  .use(
    authenticationMiddleware({
      required: true,
      roles: ["admin"],
      permissions: ["admin:access"],
    }),
  );

// Middleware wrapper for Convex functions
export function withMiddleware(
  middlewareStack: MiddlewareComposer,
  handler: (ctx: any, args: any, context: MiddlewareContext) => Promise<any>,
) {
  return async (ctx: any, args: any) => {
    const context: Partial<MiddlewareContext> = {
      metadata: { input: args },
    };

    // Add the actual handler as the final step
    middlewareStack.use(async (ctx, context, next) => {
      context.metadata.result = await handler(ctx, args, context);
      return context.metadata.result;
    });

    return await middlewareStack.execute(ctx, context);
  };
}
