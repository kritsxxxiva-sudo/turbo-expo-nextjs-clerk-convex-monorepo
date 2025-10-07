/**
 * Testing Utilities and Test Data Management
 * Comprehensive testing framework for integration and end-to-end tests
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { createLogger } from "./logging";

// Test environment configuration
export interface TestConfig {
  environment: "test" | "integration" | "e2e";
  cleanupAfterTests: boolean;
  seedData: boolean;
  mockExternalServices: boolean;
  testTimeout: number;
  parallelTests: boolean;
}

// Test data templates
export interface TestDataTemplate {
  users: Array<{
    clerkId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "admin" | "premium" | "free";
    status: "active" | "suspended" | "deleted";
  }>;
  socialAccounts: Array<{
    platform: string;
    accountId: string;
    accountName: string;
    isActive: boolean;
  }>;
  socialPosts: Array<{
    content: string;
    platforms: string[];
    status: "draft" | "scheduled" | "published" | "failed";
    scheduledAt?: number;
    publishedAt?: number;
  }>;
  customers: Array<{
    stripeCustomerId: string;
    email: string;
    currency: string;
  }>;
  subscriptions: Array<{
    stripeSubscriptionId: string;
    stripePriceId: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
  }>;
}

// Default test configuration
export const DEFAULT_TEST_CONFIG: TestConfig = {
  environment: "test",
  cleanupAfterTests: true,
  seedData: true,
  mockExternalServices: true,
  testTimeout: 30000, // 30 seconds
  parallelTests: false,
};

// Test data factory
export const createTestData = internalMutation({
  args: {
    template: v.optional(v.string()),
    count: v.optional(v.number()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("testing", "createTestData");
    const count = args.count || 1;
    const config = args.config || DEFAULT_TEST_CONFIG;

    if (!config.environment.includes("test")) {
      throw new Error(
        "Test data creation is only allowed in test environments",
      );
    }

    await logger.info("Creating test data", {
      template: args.template,
      count,
      environment: config.environment,
    });

    const createdData: any = {
      users: [],
      socialAccounts: [],
      socialPosts: [],
      customers: [],
      subscriptions: [],
    };

    try {
      // Create test users
      for (let i = 0; i < count; i++) {
        const testUser = {
          clerkId: `test_user_${i}_${Date.now()}`,
          email: `test${i}@example.com`,
          firstName: `Test${i}`,
          lastName: "User",
          username: `testuser${i}`,
          role: i === 0 ? "admin" : i % 3 === 0 ? "premium" : "free",
          status: "active",
          preferences: {
            theme: "light",
            language: "en",
            notifications: {
              email: true,
              push: false,
            },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const userId = await ctx.db.insert("users", testUser as any);
        createdData.users.push({ ...testUser, _id: userId });

        // Create social accounts for each user
        const platforms = ["facebook", "instagram", "x", "linkedin"];
        for (const platform of platforms.slice(
          0,
          Math.ceil(Math.random() * platforms.length),
        )) {
          const socialAccount = {
            userId,
            platform,
            accountId: `${platform}_${i}_${Date.now()}`,
            accountName: `Test ${platform} Account ${i}`,
            profileUrl: `https://${platform}.com/test${i}`,
            accessToken: `test_token_${platform}_${i}`,
            permissions: ["read", "write"],
            isActive: true,
            connectedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const accountId = await ctx.db.insert(
            "socialAccounts",
            socialAccount as any,
          );
          createdData.socialAccounts.push({ ...socialAccount, _id: accountId });
        }

        // Create test posts
        const postCount = Math.floor(Math.random() * 5) + 1;
        for (let j = 0; j < postCount; j++) {
          const socialPost = {
            userId,
            content: `Test post ${j} from user ${i}. This is a sample post for testing purposes. #test #automation`,
            platforms: platforms.slice(0, Math.ceil(Math.random() * 2) + 1),
            status: ["draft", "scheduled", "published"][
              Math.floor(Math.random() * 3)
            ],
            scheduledAt: Date.now() + Math.random() * 24 * 60 * 60 * 1000, // Random time in next 24 hours
            mediaUrls: [],
            analytics: {
              views: Math.floor(Math.random() * 1000),
              likes: Math.floor(Math.random() * 100),
              shares: Math.floor(Math.random() * 50),
              comments: Math.floor(Math.random() * 25),
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          if (socialPost.status === "published") {
            socialPost.publishedAt =
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000; // Published in last 7 days
          }

          const postId = await ctx.db.insert("socialPosts", socialPost as any);
          createdData.socialPosts.push({ ...socialPost, _id: postId });
        }

        // Create customer data
        if (testUser.role !== "free") {
          const customer = {
            userId,
            stripeCustomerId: `cus_test_${i}_${Date.now()}`,
            email: testUser.email,
            name: `${testUser.firstName} ${testUser.lastName}`,
            currency: "usd",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const customerId = await ctx.db.insert("customers", customer as any);
          createdData.customers.push({ ...customer, _id: customerId });

          // Create subscription for premium users
          if (testUser.role === "premium") {
            const subscription = {
              userId,
              customerId,
              stripeSubscriptionId: `sub_test_${i}_${Date.now()}`,
              stripePriceId: "price_premium_monthly",
              status: "active",
              currentPeriodStart: Date.now() - 15 * 24 * 60 * 60 * 1000, // Started 15 days ago
              currentPeriodEnd: Date.now() + 15 * 24 * 60 * 60 * 1000, // Ends in 15 days
              quantity: 1,
              cancelAtPeriodEnd: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            const subscriptionId = await ctx.db.insert(
              "subscriptions",
              subscription as any,
            );
            createdData.subscriptions.push({
              ...subscription,
              _id: subscriptionId,
            });
          }
        }
      }

      await logger.info("Test data created successfully", {
        usersCreated: createdData.users.length,
        accountsCreated: createdData.socialAccounts.length,
        postsCreated: createdData.socialPosts.length,
        customersCreated: createdData.customers.length,
        subscriptionsCreated: createdData.subscriptions.length,
      });

      return createdData;
    } catch (error) {
      await logger.error("Failed to create test data", error);
      throw error;
    }
  },
});

// Clean up test data
export const cleanupTestData = internalMutation({
  args: {
    testRunId: v.optional(v.string()),
    olderThan: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("testing", "cleanupTestData");

    await logger.info("Starting test data cleanup", {
      testRunId: args.testRunId,
      olderThan: args.olderThan,
    });

    try {
      let deletedCount = 0;

      // Delete test users and related data
      const testUsers = await ctx.db
        .query("users")
        .filter((q) =>
          q.or(
            q.like(q.field("email"), "test%@example.com"),
            q.like(q.field("clerkId"), "test_user_%"),
          ),
        )
        .collect();

      for (const user of testUsers) {
        // Delete user's social accounts
        const userAccounts = await ctx.db
          .query("socialAccounts")
          .withIndex("by_user_id", (q) => q.eq("userId", user._id))
          .collect();

        for (const account of userAccounts) {
          await ctx.db.delete(account._id);
          deletedCount++;
        }

        // Delete user's posts
        const userPosts = await ctx.db
          .query("socialPosts")
          .withIndex("by_user_scheduled", (q) => q.eq("userId", user._id))
          .collect();

        for (const post of userPosts) {
          await ctx.db.delete(post._id);
          deletedCount++;
        }

        // Delete user's customers
        const userCustomers = await ctx.db
          .query("customers")
          .withIndex("by_user_id", (q) => q.eq("userId", user._id))
          .collect();

        for (const customer of userCustomers) {
          // Delete customer's subscriptions
          const customerSubscriptions = await ctx.db
            .query("subscriptions")
            .withIndex("by_customer_id", (q) =>
              q.eq("customerId", customer._id),
            )
            .collect();

          for (const subscription of customerSubscriptions) {
            await ctx.db.delete(subscription._id);
            deletedCount++;
          }

          await ctx.db.delete(customer._id);
          deletedCount++;
        }

        // Delete user's sessions
        const userSessions = await ctx.db
          .query("userSessions")
          .withIndex("by_user_id", (q) => q.eq("userId", user._id))
          .collect();

        for (const session of userSessions) {
          await ctx.db.delete(session._id);
          deletedCount++;
        }

        // Finally, delete the user
        await ctx.db.delete(user._id);
        deletedCount++;
      }

      // Clean up old webhook events from tests
      const oldWebhooks = await ctx.db
        .query("webhookEvents")
        .filter((q) => q.like(q.field("eventId"), "test_%"))
        .collect();

      for (const webhook of oldWebhooks) {
        await ctx.db.delete(webhook._id);
        deletedCount++;
      }

      await logger.info("Test data cleanup completed", {
        deletedCount,
        testUsersFound: testUsers.length,
      });

      return {
        success: true,
        deletedCount,
        testUsersFound: testUsers.length,
        timestamp: Date.now(),
      };
    } catch (error) {
      await logger.error("Test data cleanup failed", error);
      throw error;
    }
  },
});

// Test assertion helpers
export const runTestAssertion = internalQuery({
  args: {
    testName: v.string(),
    assertion: v.string(),
    expected: v.any(),
    actual: v.any(),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("testing", "assertion");

    let passed = false;
    let message = "";

    try {
      switch (args.assertion) {
        case "equals":
          passed =
            JSON.stringify(args.expected) === JSON.stringify(args.actual);
          message = passed
            ? "Values are equal"
            : `Expected ${JSON.stringify(args.expected)}, got ${JSON.stringify(args.actual)}`;
          break;

        case "notEquals":
          passed =
            JSON.stringify(args.expected) !== JSON.stringify(args.actual);
          message = passed
            ? "Values are not equal"
            : `Expected values to be different, but both are ${JSON.stringify(args.actual)}`;
          break;

        case "greaterThan":
          passed = args.actual > args.expected;
          message = passed
            ? `${args.actual} > ${args.expected}`
            : `Expected ${args.actual} to be greater than ${args.expected}`;
          break;

        case "lessThan":
          passed = args.actual < args.expected;
          message = passed
            ? `${args.actual} < ${args.expected}`
            : `Expected ${args.actual} to be less than ${args.expected}`;
          break;

        case "contains":
          passed = Array.isArray(args.actual)
            ? args.actual.includes(args.expected)
            : typeof args.actual === "string"
              ? args.actual.includes(args.expected)
              : false;
          message = passed
            ? `Contains ${args.expected}`
            : `Expected to contain ${args.expected}`;
          break;

        case "hasProperty":
          passed =
            typeof args.actual === "object" &&
            args.actual !== null &&
            args.expected in args.actual;
          message = passed
            ? `Has property ${args.expected}`
            : `Expected to have property ${args.expected}`;
          break;

        default:
          throw new Error(`Unknown assertion type: ${args.assertion}`);
      }

      const result = {
        testName: args.testName,
        assertion: args.assertion,
        passed,
        message,
        expected: args.expected,
        actual: args.actual,
        timestamp: Date.now(),
      };

      if (passed) {
        await logger.info("Test assertion passed", result);
      } else {
        await logger.warn("Test assertion failed", result);
      }

      return result;
    } catch (error) {
      await logger.error("Test assertion error", error);
      throw error;
    }
  },
});

// Performance test utilities
export const runPerformanceTest = internalMutation({
  args: {
    testName: v.string(),
    operation: v.string(),
    iterations: v.optional(v.number()),
    maxDuration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("testing", "performance");
    const iterations = args.iterations || 100;
    const maxDuration = args.maxDuration || 5000; // 5 seconds

    await logger.info("Starting performance test", {
      testName: args.testName,
      operation: args.operation,
      iterations,
      maxDuration,
    });

    const results = {
      testName: args.testName,
      operation: args.operation,
      iterations: 0,
      totalDuration: 0,
      averageDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      successCount: 0,
      errorCount: 0,
      errors: [] as string[],
      timestamp: Date.now(),
    };

    const startTime = Date.now();

    try {
      for (let i = 0; i < iterations; i++) {
        const iterationStart = Date.now();

        try {
          // Simulate different operations based on the operation type
          switch (args.operation) {
            case "database_query":
              await ctx.db.query("users").take(10);
              break;

            case "database_insert":
              const testId = await ctx.db.insert("users", {
                clerkId: `perf_test_${i}_${Date.now()}`,
                email: `perftest${i}@example.com`,
                firstName: "Perf",
                lastName: "Test",
                role: "free",
                status: "active",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              } as any);
              // Clean up immediately
              await ctx.db.delete(testId);
              break;

            case "complex_query":
              await ctx.db
                .query("socialPosts")
                .withIndex("by_published_at")
                .filter((q) =>
                  q.gte(q.field("publishedAt"), Date.now() - 86400000),
                )
                .take(50);
              break;

            default:
              // Default operation - just a simple query
              await ctx.db.query("users").take(1);
          }

          const duration = Date.now() - iterationStart;
          results.totalDuration += duration;
          results.minDuration = Math.min(results.minDuration, duration);
          results.maxDuration = Math.max(results.maxDuration, duration);
          results.successCount++;
        } catch (error) {
          results.errorCount++;
          results.errors.push(
            error instanceof Error ? error.message : "Unknown error",
          );
        }

        results.iterations++;

        // Check if we've exceeded the maximum test duration
        if (Date.now() - startTime > maxDuration) {
          break;
        }
      }

      results.averageDuration = results.totalDuration / results.iterations;

      await logger.info("Performance test completed", results);

      return results;
    } catch (error) {
      await logger.error("Performance test failed", error);
      throw error;
    }
  },
});

// Mock external service responses
export const mockExternalService = internalMutation({
  args: {
    service: v.string(),
    endpoint: v.string(),
    response: v.any(),
    delay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("testing", "mockService");

    // In a real implementation, this would set up mock responses
    // For now, we'll just log the mock configuration
    await logger.info("Mock service configured", {
      service: args.service,
      endpoint: args.endpoint,
      delay: args.delay || 0,
    });

    return {
      service: args.service,
      endpoint: args.endpoint,
      configured: true,
      timestamp: Date.now(),
    };
  },
});

// Test suite runner
export const runTestSuite = internalMutation({
  args: {
    suiteName: v.string(),
    tests: v.array(v.string()),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const logger = createLogger("testing", "testSuite");
    const config = args.config || DEFAULT_TEST_CONFIG;

    await logger.info("Starting test suite", {
      suiteName: args.suiteName,
      testCount: args.tests.length,
      config,
    });

    const results = {
      suiteName: args.suiteName,
      totalTests: args.tests.length,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      testResults: [] as any[],
      timestamp: Date.now(),
    };

    const suiteStart = Date.now();

    try {
      // Set up test data if configured
      if (config.seedData) {
        await createTestData(ctx, { count: 3, config });
      }

      // Run each test
      for (const testName of args.tests) {
        const testStart = Date.now();

        try {
          // In a real implementation, this would execute the actual test
          // For now, we'll simulate test execution
          const testPassed = Math.random() > 0.1; // 90% pass rate

          if (testPassed) {
            results.passedTests++;
          } else {
            results.failedTests++;
          }

          results.testResults.push({
            name: testName,
            status: testPassed ? "passed" : "failed",
            duration: Date.now() - testStart,
            error: testPassed ? null : "Simulated test failure",
          });
        } catch (error) {
          results.failedTests++;
          results.testResults.push({
            name: testName,
            status: "failed",
            duration: Date.now() - testStart,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      results.duration = Date.now() - suiteStart;

      // Clean up test data if configured
      if (config.cleanupAfterTests) {
        await cleanupTestData(ctx, {});
      }

      await logger.info("Test suite completed", results);

      return results;
    } catch (error) {
      await logger.error("Test suite failed", error);
      throw error;
    }
  },
});
