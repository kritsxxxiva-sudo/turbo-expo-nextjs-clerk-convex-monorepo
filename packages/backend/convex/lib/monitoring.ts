/**
 * System Monitoring and Observability
 * Comprehensive monitoring, metrics, and alerting system
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// Metric types
export interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  error: string;
  count: number;
  lastOccurrence: number;
  severity: "low" | "medium" | "high" | "critical";
  context?: Record<string, any>;
}

// Health check status
export interface HealthStatus {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastCheck: number;
  responseTime?: number;
  details?: Record<string, any>;
}

// Alert configuration
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: "gt" | "lt" | "eq" | "ne";
  threshold: number;
  duration: number; // milliseconds
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  channels: string[]; // email, slack, webhook, etc.
}

// System metrics collection
export const recordSystemMetric = internalMutation({
  args: {
    name: v.string(),
    value: v.number(),
    unit: v.string(),
    tags: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const metric: SystemMetric = {
      name: args.name,
      value: args.value,
      unit: args.unit,
      timestamp: Date.now(),
      tags: args.tags || {},
    };

    // In a real implementation, this would be sent to a metrics system
    // like Prometheus, DataDog, or CloudWatch
    console.log("System Metric:", metric);

    // Store recent metrics for dashboard
    // This is a simplified implementation - in production you'd use a time-series database
    return metric;
  },
});

// Performance monitoring
export const recordPerformanceMetric = internalMutation({
  args: {
    operation: v.string(),
    duration: v.number(),
    success: v.boolean(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const metric: PerformanceMetric = {
      operation: args.operation,
      duration: args.duration,
      success: args.success,
      timestamp: Date.now(),
      metadata: args.metadata,
    };

    // Record performance metrics
    console.log("Performance Metric:", metric);

    // Check for performance alerts
    await checkPerformanceAlerts(ctx, metric);

    return metric;
  },
});

// Error tracking
export const recordError = internalMutation({
  args: {
    error: v.string(),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const errorMetric: ErrorMetric = {
      error: args.error,
      count: 1,
      lastOccurrence: Date.now(),
      severity: args.severity,
      context: args.context,
    };

    // In a real implementation, this would be sent to an error tracking system
    // like Sentry, Rollbar, or Bugsnag
    console.log("Error Metric:", errorMetric);

    // Trigger alerts for critical errors
    if (args.severity === "critical") {
      await triggerAlert(ctx, {
        type: "error",
        message: `Critical error: ${args.error}`,
        severity: "critical",
        context: args.context,
      });
    }

    return errorMetric;
  },
});

// Health checks
export const performHealthCheck = internalQuery({
  args: {
    service: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    let status: HealthStatus["status"] = "healthy";
    let details: Record<string, any> = {};

    try {
      // Perform service-specific health checks
      switch (args.service) {
        case "database":
          // Check database connectivity
          await ctx.db.query("users").take(1);
          details.connection = "ok";
          break;

        case "external_apis":
          // Check external API connectivity
          details.stripe = "ok"; // Would actually ping Stripe
          details.ayrshare = "ok"; // Would actually ping Ayrshare
          details.clerk = "ok"; // Would actually ping Clerk
          break;

        case "webhooks":
          // Check webhook processing
          const recentWebhooks = await ctx.db
            .query("webhookEvents")
            .withIndex("by_created_at")
            .filter((q) => q.gte(q.field("createdAt"), Date.now() - 300000)) // Last 5 minutes
            .take(10);

          const failedWebhooks = recentWebhooks.filter(
            (w) => w.processingError,
          );
          if (failedWebhooks.length > recentWebhooks.length * 0.5) {
            status = "degraded";
            details.webhook_failure_rate =
              failedWebhooks.length / recentWebhooks.length;
          }
          break;

        default:
          throw new Error(`Unknown service: ${args.service}`);
      }
    } catch (error) {
      status = "unhealthy";
      details.error = error instanceof Error ? error.message : "Unknown error";
    }

    const responseTime = Date.now() - startTime;

    const healthStatus: HealthStatus = {
      service: args.service,
      status,
      lastCheck: Date.now(),
      responseTime,
      details,
    };

    // Record health metric
    await recordSystemMetric(ctx, {
      name: `health.${args.service}`,
      value: status === "healthy" ? 1 : status === "degraded" ? 0.5 : 0,
      unit: "status",
      tags: { service: args.service },
    });

    return healthStatus;
  },
});

// System dashboard metrics
export const getSystemDashboard = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get recent metrics
    const recentUsers = await ctx.db
      .query("users")
      .withIndex("by_created_at")
      .filter((q) => q.gte(q.field("createdAt"), oneHourAgo))
      .collect();

    const recentPosts = await ctx.db
      .query("socialPosts")
      .withIndex("by_published_at")
      .filter((q) => q.gte(q.field("publishedAt"), oneHourAgo))
      .collect();

    const recentWebhooks = await ctx.db
      .query("webhookEvents")
      .withIndex("by_created_at")
      .filter((q) => q.gte(q.field("createdAt"), oneHourAgo))
      .collect();

    const recentSessions = await ctx.db
      .query("userSessions")
      .withIndex("by_created_at")
      .filter((q) => q.gte(q.field("createdAt"), oneHourAgo))
      .collect();

    // Calculate metrics
    const dashboard = {
      timestamp: now,
      users: {
        total: await ctx.db
          .query("users")
          .collect()
          .then((users) => users.length),
        active: await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect()
          .then((users) => users.length),
        newInLastHour: recentUsers.length,
      },
      posts: {
        total: await ctx.db
          .query("socialPosts")
          .collect()
          .then((posts) => posts.length),
        published: await ctx.db
          .query("socialPosts")
          .filter((q) => q.eq(q.field("status"), "published"))
          .collect()
          .then((posts) => posts.length),
        publishedInLastHour: recentPosts.length,
      },
      webhooks: {
        total: await ctx.db
          .query("webhookEvents")
          .collect()
          .then((events) => events.length),
        processed: await ctx.db
          .query("webhookEvents")
          .filter((q) => q.eq(q.field("processed"), true))
          .collect()
          .then((events) => events.length),
        failed: await ctx.db
          .query("webhookEvents")
          .filter((q) => q.neq(q.field("processingError"), undefined))
          .collect()
          .then((events) => events.length),
        processedInLastHour: recentWebhooks.filter((w) => w.processed).length,
      },
      sessions: {
        total: await ctx.db
          .query("userSessions")
          .collect()
          .then((sessions) => sessions.length),
        active: await ctx.db
          .query("userSessions")
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect()
          .then((sessions) => sessions.length),
        createdInLastHour: recentSessions.length,
      },
      health: {
        database: "healthy",
        external_apis: "healthy",
        webhooks:
          recentWebhooks.filter((w) => w.processingError).length >
          recentWebhooks.length * 0.1
            ? "degraded"
            : "healthy",
      },
    };

    return dashboard;
  },
});

// Alert management
async function checkPerformanceAlerts(ctx: any, metric: PerformanceMetric) {
  // Example alert rules
  const alertRules: AlertRule[] = [
    {
      id: "slow_api_response",
      name: "Slow API Response",
      metric: "api_response_time",
      condition: "gt",
      threshold: 5000, // 5 seconds
      duration: 60000, // 1 minute
      severity: "high",
      enabled: true,
      channels: ["email", "slack"],
    },
    {
      id: "high_error_rate",
      name: "High Error Rate",
      metric: "error_rate",
      condition: "gt",
      threshold: 0.05, // 5%
      duration: 300000, // 5 minutes
      severity: "critical",
      enabled: true,
      channels: ["email", "slack", "pagerduty"],
    },
  ];

  // Check if metric triggers any alerts
  for (const rule of alertRules) {
    if (!rule.enabled) continue;

    let shouldAlert = false;

    if (
      rule.metric === "api_response_time" &&
      metric.operation.includes("api")
    ) {
      shouldAlert = rule.condition === "gt" && metric.duration > rule.threshold;
    }

    if (shouldAlert) {
      await triggerAlert(ctx, {
        type: "performance",
        rule: rule.id,
        message: `${rule.name}: ${metric.operation} took ${metric.duration}ms`,
        severity: rule.severity,
        context: { metric, rule },
      });
    }
  }
}

async function triggerAlert(
  ctx: any,
  alert: {
    type: string;
    message: string;
    severity: string;
    rule?: string;
    context?: any;
  },
) {
  // In a real implementation, this would send alerts via configured channels
  console.log("ALERT:", alert);

  // Log alert for audit trail
  // In production, you'd store this in a dedicated alerts table
  return alert;
}

// Performance monitoring utilities
export function createPerformanceMonitor(operation: string) {
  const startTime = Date.now();

  return {
    end: async (ctx: any, success: boolean = true, metadata?: any) => {
      const duration = Date.now() - startTime;

      await recordPerformanceMetric(ctx, {
        operation,
        duration,
        success,
        metadata,
      });

      return duration;
    },
  };
}

// Error tracking utilities
export function createErrorTracker(context?: any) {
  return {
    recordError: async (
      ctx: any,
      error: Error | string,
      severity: ErrorMetric["severity"] = "medium",
    ) => {
      const errorMessage = error instanceof Error ? error.message : error;

      await recordError(ctx, {
        error: errorMessage,
        severity,
        context: {
          ...context,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: Date.now(),
        },
      });
    },
  };
}

// System resource monitoring
export const getSystemResources = internalQuery({
  args: {},
  handler: async (ctx) => {
    // In a real implementation, this would collect actual system metrics
    // from the runtime environment (CPU, memory, disk, network)

    const resources = {
      timestamp: Date.now(),
      cpu: {
        usage: Math.random() * 100, // Mock data
        cores: 4,
      },
      memory: {
        used: Math.random() * 8 * 1024 * 1024 * 1024, // Mock data in bytes
        total: 8 * 1024 * 1024 * 1024, // 8GB
        usage: Math.random() * 100,
      },
      disk: {
        used: Math.random() * 100 * 1024 * 1024 * 1024, // Mock data in bytes
        total: 500 * 1024 * 1024 * 1024, // 500GB
        usage: Math.random() * 100,
      },
      network: {
        bytesIn: Math.random() * 1024 * 1024, // Mock data
        bytesOut: Math.random() * 1024 * 1024,
        connectionsActive: Math.floor(Math.random() * 1000),
      },
    };

    // Record resource metrics
    await recordSystemMetric(ctx, {
      name: "system.cpu.usage",
      value: resources.cpu.usage,
      unit: "percent",
      tags: { resource: "cpu" },
    });

    await recordSystemMetric(ctx, {
      name: "system.memory.usage",
      value: resources.memory.usage,
      unit: "percent",
      tags: { resource: "memory" },
    });

    return resources;
  },
});
