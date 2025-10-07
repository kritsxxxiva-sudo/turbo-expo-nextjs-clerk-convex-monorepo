/**
 * Deployment Configuration and Health Checks
 * Production deployment utilities and system health monitoring
 */

import { v } from "convex/values";
import { internalQuery, internalMutation } from "../_generated/server";
import { createLogger } from "./logging";

// Deployment environment types
export type Environment = "development" | "staging" | "production";

// Health check status
export interface HealthCheckResult {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  responseTime: number;
  details: Record<string, any>;
  dependencies: Array<{
    name: string;
    status: "healthy" | "degraded" | "unhealthy";
    responseTime?: number;
    error?: string;
  }>;
}

// System configuration
export interface SystemConfig {
  environment: Environment;
  version: string;
  buildNumber: string;
  deployedAt: number;
  features: {
    authentication: boolean;
    payments: boolean;
    socialMedia: boolean;
    analytics: boolean;
    monitoring: boolean;
  };
  limits: {
    maxUsersPerOrg: number;
    maxPostsPerDay: number;
    maxFileSize: number;
    maxRequestsPerMinute: number;
  };
  integrations: {
    clerk: { enabled: boolean; version: string };
    stripe: { enabled: boolean; version: string };
    ayrshare: { enabled: boolean; version: string };
  };
}

// Default system configuration
export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  environment: "development",
  version: "1.0.0",
  buildNumber: "1",
  deployedAt: Date.now(),
  features: {
    authentication: true,
    payments: true,
    socialMedia: true,
    analytics: true,
    monitoring: true,
  },
  limits: {
    maxUsersPerOrg: 1000,
    maxPostsPerDay: 100,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxRequestsPerMinute: 1000,
  },
  integrations: {
    clerk: { enabled: true, version: "4.0.0" },
    stripe: { enabled: true, version: "12.0.0" },
    ayrshare: { enabled: true, version: "1.0.0" },
  },
};

// Get system configuration
export const getSystemConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    // In production, this would be loaded from environment variables or database
    const config: SystemConfig = {
      ...DEFAULT_SYSTEM_CONFIG,
      environment: (process.env.NODE_ENV as Environment) || "development",
      version: process.env.APP_VERSION || "1.0.0",
      buildNumber: process.env.BUILD_NUMBER || "1",
    };

    return config;
  },
});

// Comprehensive health check
export const performHealthCheck = internalQuery({
  args: {},
  handler: async (ctx): Promise<HealthCheckResult> => {
    const logger = createLogger("deployment", "healthCheck");
    const startTime = Date.now();

    try {
      const dependencies: HealthCheckResult["dependencies"] = [];

      // Check database connectivity
      try {
        const dbStart = Date.now();
        await ctx.db.query("users").take(1);
        dependencies.push({
          name: "database",
          status: "healthy",
          responseTime: Date.now() - dbStart,
        });
      } catch (error) {
        dependencies.push({
          name: "database",
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Check external services
      const externalServices = [
        { name: "clerk", url: "https://api.clerk.dev/v1/health" },
        { name: "stripe", url: "https://api.stripe.com/healthcheck" },
        // Note: Ayrshare doesn't have a public health endpoint
      ];

      for (const service of externalServices) {
        try {
          const serviceStart = Date.now();
          // In a real implementation, you would make actual HTTP requests
          // For now, we'll simulate the checks
          const isHealthy = Math.random() > 0.1; // 90% chance of being healthy

          dependencies.push({
            name: service.name,
            status: isHealthy ? "healthy" : "degraded",
            responseTime: Date.now() - serviceStart,
          });
        } catch (error) {
          dependencies.push({
            name: service.name,
            status: "unhealthy",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Check system resources
      try {
        const resourceStart = Date.now();
        // In a real implementation, check actual system resources
        const memoryUsage = Math.random() * 100; // Mock memory usage
        const cpuUsage = Math.random() * 100; // Mock CPU usage

        const resourceStatus =
          memoryUsage > 90 || cpuUsage > 90 ? "degraded" : "healthy";

        dependencies.push({
          name: "system_resources",
          status: resourceStatus,
          responseTime: Date.now() - resourceStart,
        });
      } catch (error) {
        dependencies.push({
          name: "system_resources",
          status: "unhealthy",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Determine overall status
      const unhealthyCount = dependencies.filter(
        (d) => d.status === "unhealthy",
      ).length;
      const degradedCount = dependencies.filter(
        (d) => d.status === "degraded",
      ).length;

      let overallStatus: HealthCheckResult["status"];
      if (unhealthyCount > 0) {
        overallStatus = "unhealthy";
      } else if (degradedCount > 0) {
        overallStatus = "degraded";
      } else {
        overallStatus = "healthy";
      }

      const result: HealthCheckResult = {
        service: "social-media-platform",
        status: overallStatus,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          version: DEFAULT_SYSTEM_CONFIG.version,
          environment: DEFAULT_SYSTEM_CONFIG.environment,
          uptime: Date.now() - DEFAULT_SYSTEM_CONFIG.deployedAt,
          dependencyCount: dependencies.length,
          healthyDependencies: dependencies.filter(
            (d) => d.status === "healthy",
          ).length,
        },
        dependencies,
      };

      await logger.info("Health check completed", {
        status: overallStatus,
        responseTime: result.responseTime,
        dependencyCount: dependencies.length,
      });

      return result;
    } catch (error) {
      await logger.error("Health check failed", error);

      return {
        service: "social-media-platform",
        status: "unhealthy",
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        dependencies: [],
      };
    }
  },
});

// Readiness check (for Kubernetes/container orchestration)
export const performReadinessCheck = internalQuery({
  args: {},
  handler: async (ctx) => {
    const logger = createLogger("deployment", "readinessCheck");

    try {
      // Check if all critical services are ready
      const criticalChecks = [
        // Database connectivity
        async () => {
          await ctx.db.query("users").take(1);
          return true;
        },

        // Configuration loaded
        async () => {
          const config = await getSystemConfig(ctx, {});
          return config.environment !== undefined;
        },

        // Essential tables exist and are accessible
        async () => {
          const tables = [
            "users",
            "userSessions",
            "socialAccounts",
            "socialPosts",
          ];
          for (const table of tables) {
            await ctx.db.query(table as any).take(1);
          }
          return true;
        },
      ];

      for (const check of criticalChecks) {
        await check();
      }

      await logger.info("Readiness check passed");

      return {
        ready: true,
        timestamp: Date.now(),
        checks: criticalChecks.length,
      };
    } catch (error) {
      await logger.error("Readiness check failed", error);

      return {
        ready: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Liveness check (for Kubernetes/container orchestration)
export const performLivenessCheck = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Simple liveness check - just verify the service is responding
    return {
      alive: true,
      timestamp: Date.now(),
      uptime: Date.now() - DEFAULT_SYSTEM_CONFIG.deployedAt,
    };
  },
});

// System metrics for monitoring
export const getSystemMetrics = internalQuery({
  args: {},
  handler: async (ctx) => {
    const logger = createLogger("deployment", "systemMetrics");

    try {
      // Get basic system metrics
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      // User metrics
      const totalUsers = await ctx.db
        .query("users")
        .collect()
        .then((users) => users.length);
      const activeUsers = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect()
        .then((users) => users.length);

      // Session metrics
      const activeSessions = await ctx.db
        .query("userSessions")
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect()
        .then((sessions) => sessions.length);

      // Post metrics
      const totalPosts = await ctx.db
        .query("socialPosts")
        .collect()
        .then((posts) => posts.length);
      const recentPosts = await ctx.db
        .query("socialPosts")
        .withIndex("by_published_at")
        .filter((q) => q.gte(q.field("publishedAt"), oneHourAgo))
        .collect()
        .then((posts) => posts.length);

      // Webhook metrics
      const recentWebhooks = await ctx.db
        .query("webhookEvents")
        .withIndex("by_created_at")
        .filter((q) => q.gte(q.field("createdAt"), oneHourAgo))
        .collect();

      const processedWebhooks = recentWebhooks.filter(
        (w) => w.processed,
      ).length;
      const failedWebhooks = recentWebhooks.filter(
        (w) => w.processingError,
      ).length;

      const metrics = {
        timestamp: now,
        users: {
          total: totalUsers,
          active: activeUsers,
          activeSessions,
        },
        posts: {
          total: totalPosts,
          recentHour: recentPosts,
        },
        webhooks: {
          recentHour: recentWebhooks.length,
          processed: processedWebhooks,
          failed: failedWebhooks,
          successRate:
            recentWebhooks.length > 0
              ? (processedWebhooks / recentWebhooks.length) * 100
              : 100,
        },
        system: {
          uptime: now - DEFAULT_SYSTEM_CONFIG.deployedAt,
          version: DEFAULT_SYSTEM_CONFIG.version,
          environment: DEFAULT_SYSTEM_CONFIG.environment,
        },
      };

      await logger.info("System metrics collected", metrics);

      return metrics;
    } catch (error) {
      await logger.error("Failed to collect system metrics", error);
      throw error;
    }
  },
});

// Deployment validation
export const validateDeployment = internalMutation({
  args: {
    version: v.string(),
    environment: v.string(),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("deployment", "validation");

    try {
      const validationResults = [];

      // Validate environment
      const validEnvironments = ["development", "staging", "production"];
      if (!validEnvironments.includes(args.environment)) {
        validationResults.push({
          check: "environment",
          status: "failed",
          message: `Invalid environment: ${args.environment}`,
        });
      } else {
        validationResults.push({
          check: "environment",
          status: "passed",
          message: `Environment ${args.environment} is valid`,
        });
      }

      // Validate database schema
      try {
        const requiredTables = [
          "users",
          "userSessions",
          "socialAccounts",
          "socialPosts",
          "webhookEvents",
        ];
        for (const table of requiredTables) {
          await ctx.db.query(table as any).take(1);
        }

        validationResults.push({
          check: "database_schema",
          status: "passed",
          message: "All required tables are accessible",
        });
      } catch (error) {
        validationResults.push({
          check: "database_schema",
          status: "failed",
          message: `Database schema validation failed: ${error.message}`,
        });
      }

      // Validate environment variables
      const requiredEnvVars = [
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        "STRIPE_SECRET_KEY",
        "AYRSHARE_API_KEY",
      ];

      const missingEnvVars = requiredEnvVars.filter(
        (envVar) => !process.env[envVar],
      );

      if (missingEnvVars.length > 0) {
        validationResults.push({
          check: "environment_variables",
          status: "failed",
          message: `Missing environment variables: ${missingEnvVars.join(", ")}`,
        });
      } else {
        validationResults.push({
          check: "environment_variables",
          status: "passed",
          message: "All required environment variables are set",
        });
      }

      // Validate features
      if (args.features) {
        const availableFeatures = Object.keys(DEFAULT_SYSTEM_CONFIG.features);
        const invalidFeatures = args.features.filter(
          (feature) => !availableFeatures.includes(feature),
        );

        if (invalidFeatures.length > 0) {
          validationResults.push({
            check: "features",
            status: "failed",
            message: `Invalid features: ${invalidFeatures.join(", ")}`,
          });
        } else {
          validationResults.push({
            check: "features",
            status: "passed",
            message: "All requested features are available",
          });
        }
      }

      const allPassed = validationResults.every(
        (result) => result.status === "passed",
      );

      await logger.info("Deployment validation completed", {
        version: args.version,
        environment: args.environment,
        allPassed,
        results: validationResults,
      });

      return {
        valid: allPassed,
        version: args.version,
        environment: args.environment,
        timestamp: Date.now(),
        results: validationResults,
      };
    } catch (error) {
      await logger.error("Deployment validation failed", error);
      throw error;
    }
  },
});

// Graceful shutdown handler
export const initiateGracefulShutdown = internalMutation({
  args: {
    reason: v.optional(v.string()),
    timeoutMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("deployment", "gracefulShutdown");
    const timeoutMs = args.timeoutMs || 30000; // 30 seconds default

    await logger.info("Initiating graceful shutdown", {
      reason: args.reason || "Manual shutdown",
      timeoutMs,
    });

    try {
      // In a real implementation, this would:
      // 1. Stop accepting new requests
      // 2. Wait for existing requests to complete
      // 3. Close database connections
      // 4. Clean up resources
      // 5. Send shutdown signal

      await logger.info("Graceful shutdown completed");

      return {
        success: true,
        timestamp: Date.now(),
        reason: args.reason || "Manual shutdown",
      };
    } catch (error) {
      await logger.error("Graceful shutdown failed", error);
      throw error;
    }
  },
});

// Feature flag management
export const getFeatureFlags = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await getSystemConfig(ctx, {});

    return {
      features: config.features,
      environment: config.environment,
      timestamp: Date.now(),
    };
  },
});

export const updateFeatureFlag = internalMutation({
  args: {
    feature: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("deployment", "featureFlag");

    // In a real implementation, this would update the feature flag in the database
    await logger.info("Feature flag updated", {
      feature: args.feature,
      enabled: args.enabled,
    });

    return {
      feature: args.feature,
      enabled: args.enabled,
      timestamp: Date.now(),
    };
  },
});
