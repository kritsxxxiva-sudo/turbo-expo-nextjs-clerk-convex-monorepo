/**
 * Advanced Logging and Audit System
 * Comprehensive logging with structured data and audit trails
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// Log levels
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

// Log entry structure
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  service: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

// Audit event types
export type AuditEventType =
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.login"
  | "user.logout"
  | "payment.created"
  | "payment.succeeded"
  | "payment.failed"
  | "subscription.created"
  | "subscription.canceled"
  | "post.created"
  | "post.published"
  | "post.deleted"
  | "account.connected"
  | "account.disconnected"
  | "admin.action"
  | "security.violation"
  | "data.export"
  | "data.import";

// Audit entry structure
export interface AuditEntry {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource: string;
  resourceId?: string;
  action: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

// Logging configuration
export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableDatabase: boolean;
  enableExternal: boolean;
  retention: {
    debug: number; // days
    info: number;
    warn: number;
    error: number;
    critical: number;
  };
  sampling: {
    debug: number; // percentage
    info: number;
    warn: number;
    error: number;
    critical: number;
  };
  externalEndpoints: {
    webhook?: string;
    elasticsearch?: string;
    datadog?: string;
    newrelic?: string;
  };
}

// Default logging configuration
export const DEFAULT_LOGGING_CONFIG: LoggingConfig = {
  level: "info",
  enableConsole: true,
  enableDatabase: true,
  enableExternal: false,
  retention: {
    debug: 1,
    info: 7,
    warn: 30,
    error: 90,
    critical: 365,
  },
  sampling: {
    debug: 10,
    info: 50,
    warn: 100,
    error: 100,
    critical: 100,
  },
  externalEndpoints: {},
};

// Log entry creation
export const createLogEntry = internalMutation({
  args: {
    level: v.union(
      v.literal("debug"),
      v.literal("info"),
      v.literal("warn"),
      v.literal("error"),
      v.literal("critical"),
    ),
    message: v.string(),
    service: v.string(),
    operation: v.optional(v.string()),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    requestId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    tags: v.optional(v.array(v.string())),
    duration: v.optional(v.number()),
    error: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const config = DEFAULT_LOGGING_CONFIG; // In production, load from database

    // Check if we should log this level
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
    if (levelPriority[args.level] < levelPriority[config.level]) {
      return null;
    }

    // Apply sampling
    const samplingRate = config.sampling[args.level];
    if (Math.random() * 100 > samplingRate) {
      return null;
    }

    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level: args.level,
      message: args.message,
      service: args.service,
      operation: args.operation,
      userId: args.userId,
      sessionId: args.sessionId,
      requestId: args.requestId,
      metadata: args.metadata,
      tags: args.tags,
      duration: args.duration,
      error: args.error,
    };

    // Console logging
    if (config.enableConsole) {
      const logMethod =
        args.level === "error" || args.level === "critical"
          ? console.error
          : args.level === "warn"
            ? console.warn
            : console.log;

      logMethod(
        `[${args.level.toUpperCase()}] ${args.service}${args.operation ? `::${args.operation}` : ""}: ${args.message}`,
        {
          timestamp: new Date(logEntry.timestamp).toISOString(),
          metadata: args.metadata,
          error: args.error,
        },
      );
    }

    // Database logging
    if (config.enableDatabase) {
      // In a real implementation, this would store to a logs table
      // For now, we'll just return the log entry
    }

    // External logging
    if (config.enableExternal) {
      await sendToExternalLogging(logEntry, config);
    }

    return logEntry;
  },
});

// Audit entry creation
export const createAuditEntry = internalMutation({
  args: {
    eventType: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    resource: v.string(),
    resourceId: v.optional(v.string()),
    action: v.string(),
    changes: v.optional(v.any()),
    metadata: v.optional(v.any()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auditEntry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      eventType: args.eventType as AuditEventType,
      userId: args.userId,
      sessionId: args.sessionId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      resource: args.resource,
      resourceId: args.resourceId,
      action: args.action,
      changes: args.changes,
      metadata: args.metadata,
      success: args.success,
      errorMessage: args.errorMessage,
    };

    // Log audit event
    await createLogEntry(ctx, {
      level: "info",
      message: `Audit: ${args.eventType} - ${args.action} on ${args.resource}`,
      service: "audit",
      operation: args.action,
      userId: args.userId,
      sessionId: args.sessionId,
      metadata: {
        auditEntry,
        resource: args.resource,
        resourceId: args.resourceId,
      },
      tags: ["audit", args.eventType],
    });

    // In a real implementation, this would store to an audit_logs table
    console.log("AUDIT:", auditEntry);

    return auditEntry;
  },
});

// Query logs
export const queryLogs = internalQuery({
  args: {
    level: v.optional(v.string()),
    service: v.optional(v.string()),
    userId: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    limit: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would query the logs table
    // For now, return mock data
    const mockLogs: LogEntry[] = [
      {
        id: "log_1",
        timestamp: Date.now() - 3600000,
        level: "info",
        message: "User logged in",
        service: "auth",
        operation: "login",
        userId: args.userId,
        metadata: { method: "email" },
        tags: ["auth", "login"],
      },
      {
        id: "log_2",
        timestamp: Date.now() - 1800000,
        level: "error",
        message: "Payment processing failed",
        service: "payments",
        operation: "process_payment",
        userId: args.userId,
        error: {
          name: "PaymentError",
          message: "Insufficient funds",
          code: "INSUFFICIENT_FUNDS",
        },
        tags: ["payments", "error"],
      },
    ];

    // Apply filters
    let filteredLogs = mockLogs;

    if (args.level) {
      filteredLogs = filteredLogs.filter((log) => log.level === args.level);
    }

    if (args.service) {
      filteredLogs = filteredLogs.filter((log) => log.service === args.service);
    }

    if (args.userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === args.userId);
    }

    if (args.startTime) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp >= args.startTime!,
      );
    }

    if (args.endTime) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp <= args.endTime!,
      );
    }

    if (args.tags) {
      filteredLogs = filteredLogs.filter(
        (log) => log.tags && args.tags!.some((tag) => log.tags!.includes(tag)),
      );
    }

    // Apply limit
    const limit = args.limit || 100;
    return filteredLogs.slice(0, limit);
  },
});

// Query audit logs
export const queryAuditLogs = internalQuery({
  args: {
    eventType: v.optional(v.string()),
    userId: v.optional(v.string()),
    resource: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // In a real implementation, this would query the audit_logs table
    // For now, return mock data
    const mockAuditLogs: AuditEntry[] = [
      {
        id: "audit_1",
        timestamp: Date.now() - 3600000,
        eventType: "user.login",
        userId: args.userId,
        resource: "user",
        resourceId: args.userId,
        action: "login",
        success: true,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0...",
      },
      {
        id: "audit_2",
        timestamp: Date.now() - 1800000,
        eventType: "post.created",
        userId: args.userId,
        resource: "social_post",
        resourceId: "post_123",
        action: "create",
        success: true,
        changes: {
          after: { content: "Hello world!", platforms: ["twitter"] },
        },
      },
    ];

    // Apply filters (similar to queryLogs)
    let filteredLogs = mockAuditLogs;

    if (args.eventType) {
      filteredLogs = filteredLogs.filter(
        (log) => log.eventType === args.eventType,
      );
    }

    if (args.userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === args.userId);
    }

    if (args.resource) {
      filteredLogs = filteredLogs.filter(
        (log) => log.resource === args.resource,
      );
    }

    if (args.startTime) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp >= args.startTime!,
      );
    }

    if (args.endTime) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp <= args.endTime!,
      );
    }

    const limit = args.limit || 100;
    return filteredLogs.slice(0, limit);
  },
});

// Log cleanup
export const cleanupOldLogs = internalMutation({
  args: {
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const config = args.config || DEFAULT_LOGGING_CONFIG;
    const now = Date.now();

    let cleanedCount = 0;

    // Calculate cutoff times for each log level
    const cutoffTimes = {
      debug: now - config.retention.debug * 24 * 60 * 60 * 1000,
      info: now - config.retention.info * 24 * 60 * 60 * 1000,
      warn: now - config.retention.warn * 24 * 60 * 60 * 1000,
      error: now - config.retention.error * 24 * 60 * 60 * 1000,
      critical: now - config.retention.critical * 24 * 60 * 60 * 1000,
    };

    // In a real implementation, this would delete old logs from the database
    // based on the retention policy
    console.log("Log cleanup completed:", { cleanedCount, cutoffTimes });

    return { cleanedCount, cutoffTimes };
  },
});

// External logging integration
async function sendToExternalLogging(
  logEntry: LogEntry,
  config: LoggingConfig,
) {
  try {
    // Webhook logging
    if (config.externalEndpoints.webhook) {
      await fetch(config.externalEndpoints.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntry),
      });
    }

    // Elasticsearch logging
    if (config.externalEndpoints.elasticsearch) {
      await fetch(`${config.externalEndpoints.elasticsearch}/logs/_doc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logEntry),
      });
    }

    // DataDog logging
    if (config.externalEndpoints.datadog) {
      await fetch(config.externalEndpoints.datadog, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "DD-API-KEY": process.env.DATADOG_API_KEY || "",
        },
        body: JSON.stringify({
          ddsource: "convex",
          ddtags: logEntry.tags?.join(","),
          hostname: "convex-backend",
          message: logEntry.message,
          level: logEntry.level,
          timestamp: logEntry.timestamp,
          ...logEntry.metadata,
        }),
      });
    }
  } catch (error) {
    console.error("Failed to send log to external service:", error);
  }
}

// Structured logging utilities
export class Logger {
  constructor(
    private service: string,
    private operation?: string,
    private context?: Record<string, any>,
  ) {}

  async debug(message: string, metadata?: Record<string, any>) {
    return this.log("debug", message, metadata);
  }

  async info(message: string, metadata?: Record<string, any>) {
    return this.log("info", message, metadata);
  }

  async warn(message: string, metadata?: Record<string, any>) {
    return this.log("warn", message, metadata);
  }

  async error(message: string, error?: Error, metadata?: Record<string, any>) {
    return this.log("error", message, {
      ...metadata,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  async critical(
    message: string,
    error?: Error,
    metadata?: Record<string, any>,
  ) {
    return this.log("critical", message, {
      ...metadata,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
    });
  }

  private async log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
  ) {
    // In a real implementation, this would call createLogEntry
    const logEntry = {
      level,
      message,
      service: this.service,
      operation: this.operation,
      metadata: { ...this.context, ...metadata },
      timestamp: Date.now(),
    };

    console.log(
      `[${level.toUpperCase()}] ${this.service}${this.operation ? `::${this.operation}` : ""}: ${message}`,
      logEntry,
    );
    return logEntry;
  }

  withContext(context: Record<string, any>): Logger {
    return new Logger(this.service, this.operation, {
      ...this.context,
      ...context,
    });
  }

  withOperation(operation: string): Logger {
    return new Logger(this.service, operation, this.context);
  }
}

// Create logger instance
export function createLogger(
  service: string,
  operation?: string,
  context?: Record<string, any>,
): Logger {
  return new Logger(service, operation, context);
}
