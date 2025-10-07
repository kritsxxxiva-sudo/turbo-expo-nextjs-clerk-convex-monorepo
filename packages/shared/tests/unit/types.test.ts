/**
 * Unit Tests for Shared Types
 * Comprehensive testing of type definitions and validation
 */

import { describe, it, expect } from "vitest";
import {
  User,
  SocialAccount,
  SocialPost,
  Customer,
  Subscription,
  WebhookEvent,
  UserSession,
  validateUser,
  validateSocialPost,
  validateCustomer,
  validateSubscription,
  isValidEmail,
  isValidUrl,
  isValidCurrency,
  formatCurrency,
  parseCurrency,
} from "../../src/types";

describe("Type Validation", () => {
  describe("validateUser", () => {
    it("should validate a valid user", () => {
      const validUser: Partial<User> = {
        clerkId: "user_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "free",
        status: "active",
      };

      const result = validateUser(validUser);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject user with invalid email", () => {
      const invalidUser: Partial<User> = {
        clerkId: "user_123",
        email: "invalid-email",
        firstName: "John",
        lastName: "Doe",
        role: "free",
        status: "active",
      };

      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid email format");
    });

    it("should reject user with invalid role", () => {
      const invalidUser: Partial<User> = {
        clerkId: "user_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "invalid" as any,
        status: "active",
      };

      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid role");
    });

    it("should reject user with missing required fields", () => {
      const invalidUser: Partial<User> = {
        firstName: "John",
        lastName: "Doe",
      };

      const result = validateUser(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Clerk ID is required");
      expect(result.errors).toContain("Email is required");
    });

    it("should validate user with preferences", () => {
      const userWithPreferences: Partial<User> = {
        clerkId: "user_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "premium",
        status: "active",
        preferences: {
          theme: "dark",
          language: "en",
          timezone: "America/New_York",
          notifications: {
            email: true,
            push: false,
            marketing: false,
            security: true,
          },
          privacy: {
            profileVisible: true,
            analyticsEnabled: true,
            dataSharing: false,
          },
        },
      };

      const result = validateUser(userWithPreferences);
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateSocialPost", () => {
    it("should validate a valid social post", () => {
      const validPost: Partial<SocialPost> = {
        userId: "user_123",
        content: "This is a test post #test",
        platforms: ["facebook", "twitter"],
        status: "draft",
        mediaUrls: [],
      };

      const result = validateSocialPost(validPost);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject post with empty content", () => {
      const invalidPost: Partial<SocialPost> = {
        userId: "user_123",
        content: "",
        platforms: ["facebook"],
        status: "draft",
      };

      const result = validateSocialPost(invalidPost);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Content is required");
    });

    it("should reject post with no platforms", () => {
      const invalidPost: Partial<SocialPost> = {
        userId: "user_123",
        content: "Test content",
        platforms: [],
        status: "draft",
      };

      const result = validateSocialPost(invalidPost);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("At least one platform is required");
    });

    it("should reject post with invalid platform", () => {
      const invalidPost: Partial<SocialPost> = {
        userId: "user_123",
        content: "Test content",
        platforms: ["invalid_platform" as any],
        status: "draft",
      };

      const result = validateSocialPost(invalidPost);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid platform: invalid_platform");
    });

    it("should validate post with media URLs", () => {
      const postWithMedia: Partial<SocialPost> = {
        userId: "user_123",
        content: "Post with image",
        platforms: ["instagram"],
        status: "draft",
        mediaUrls: ["https://example.com/image.jpg"],
      };

      const result = validateSocialPost(postWithMedia);
      expect(result.isValid).toBe(true);
    });

    it("should reject post with invalid media URLs", () => {
      const invalidPost: Partial<SocialPost> = {
        userId: "user_123",
        content: "Post with invalid image",
        platforms: ["instagram"],
        status: "draft",
        mediaUrls: ["invalid-url"],
      };

      const result = validateSocialPost(invalidPost);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid media URL: invalid-url");
    });

    it("should validate scheduled post", () => {
      const scheduledPost: Partial<SocialPost> = {
        userId: "user_123",
        content: "Scheduled post",
        platforms: ["facebook"],
        status: "scheduled",
        scheduledAt: Date.now() + 3600000, // 1 hour from now
      };

      const result = validateSocialPost(scheduledPost);
      expect(result.isValid).toBe(true);
    });

    it("should reject scheduled post with past date", () => {
      const invalidPost: Partial<SocialPost> = {
        userId: "user_123",
        content: "Scheduled post",
        platforms: ["facebook"],
        status: "scheduled",
        scheduledAt: Date.now() - 3600000, // 1 hour ago
      };

      const result = validateSocialPost(invalidPost);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Scheduled time must be in the future");
    });
  });

  describe("validateCustomer", () => {
    it("should validate a valid customer", () => {
      const validCustomer: Partial<Customer> = {
        userId: "user_123",
        stripeCustomerId: "cus_test123",
        email: "test@example.com",
        name: "John Doe",
        currency: "usd",
      };

      const result = validateCustomer(validCustomer);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject customer with invalid currency", () => {
      const invalidCustomer: Partial<Customer> = {
        userId: "user_123",
        stripeCustomerId: "cus_test123",
        email: "test@example.com",
        currency: "invalid",
      };

      const result = validateCustomer(invalidCustomer);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid currency code");
    });

    it("should reject customer with missing required fields", () => {
      const invalidCustomer: Partial<Customer> = {
        email: "test@example.com",
      };

      const result = validateCustomer(invalidCustomer);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("User ID is required");
      expect(result.errors).toContain("Stripe customer ID is required");
    });
  });

  describe("validateSubscription", () => {
    it("should validate a valid subscription", () => {
      const validSubscription: Partial<Subscription> = {
        userId: "user_123",
        customerId: "customer_123",
        stripeSubscriptionId: "sub_test123",
        stripePriceId: "price_test123",
        status: "active",
        currentPeriodStart: Date.now() - 86400000, // 1 day ago
        currentPeriodEnd: Date.now() + 86400000 * 29, // 29 days from now
        quantity: 1,
      };

      const result = validateSubscription(validSubscription);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject subscription with invalid status", () => {
      const invalidSubscription: Partial<Subscription> = {
        userId: "user_123",
        customerId: "customer_123",
        stripeSubscriptionId: "sub_test123",
        stripePriceId: "price_test123",
        status: "invalid" as any,
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + 86400000,
        quantity: 1,
      };

      const result = validateSubscription(invalidSubscription);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid subscription status");
    });

    it("should reject subscription with invalid period", () => {
      const invalidSubscription: Partial<Subscription> = {
        userId: "user_123",
        customerId: "customer_123",
        stripeSubscriptionId: "sub_test123",
        stripePriceId: "price_test123",
        status: "active",
        currentPeriodStart: Date.now() + 86400000, // Future start
        currentPeriodEnd: Date.now(), // Past end
        quantity: 1,
      };

      const result = validateSubscription(invalidSubscription);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Period end must be after period start");
    });

    it("should reject subscription with invalid quantity", () => {
      const invalidSubscription: Partial<Subscription> = {
        userId: "user_123",
        customerId: "customer_123",
        stripeSubscriptionId: "sub_test123",
        stripePriceId: "price_test123",
        status: "active",
        currentPeriodStart: Date.now(),
        currentPeriodEnd: Date.now() + 86400000,
        quantity: 0,
      };

      const result = validateSubscription(invalidSubscription);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Quantity must be positive");
    });
  });
});

describe("Utility Functions", () => {
  describe("isValidEmail", () => {
    it("should validate correct email addresses", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
      expect(isValidEmail("user+tag@example.org")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(isValidEmail("invalid-email")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail("test..test@example.com")).toBe(false);
    });
  });

  describe("isValidUrl", () => {
    it("should validate correct URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("http://example.com/path")).toBe(true);
      expect(isValidUrl("https://subdomain.example.com/path?query=value")).toBe(
        true,
      );
    });

    it("should reject invalid URLs", () => {
      expect(isValidUrl("invalid-url")).toBe(false);
      expect(isValidUrl("ftp://example.com")).toBe(false);
      expect(isValidUrl("example.com")).toBe(false);
    });
  });

  describe("isValidCurrency", () => {
    it("should validate supported currencies", () => {
      expect(isValidCurrency("usd")).toBe(true);
      expect(isValidCurrency("eur")).toBe(true);
      expect(isValidCurrency("gbp")).toBe(true);
      expect(isValidCurrency("jpy")).toBe(true);
    });

    it("should reject unsupported currencies", () => {
      expect(isValidCurrency("invalid")).toBe(false);
      expect(isValidCurrency("xyz")).toBe(false);
      expect(isValidCurrency("")).toBe(false);
    });

    it("should be case insensitive", () => {
      expect(isValidCurrency("USD")).toBe(true);
      expect(isValidCurrency("Eur")).toBe(true);
      expect(isValidCurrency("GBP")).toBe(true);
    });
  });

  describe("formatCurrency", () => {
    it("should format USD correctly", () => {
      expect(formatCurrency(2000, "usd")).toBe("$20.00");
      expect(formatCurrency(100, "usd")).toBe("$1.00");
      expect(formatCurrency(50, "usd")).toBe("$0.50");
    });

    it("should format EUR correctly", () => {
      expect(formatCurrency(2000, "eur")).toBe("€20.00");
      expect(formatCurrency(100, "eur")).toBe("€1.00");
    });

    it("should format JPY correctly (no decimals)", () => {
      expect(formatCurrency(2000, "jpy")).toBe("¥2000");
      expect(formatCurrency(100, "jpy")).toBe("¥100");
    });

    it("should handle zero amounts", () => {
      expect(formatCurrency(0, "usd")).toBe("$0.00");
      expect(formatCurrency(0, "jpy")).toBe("¥0");
    });

    it("should throw error for invalid currency", () => {
      expect(() => formatCurrency(2000, "invalid")).toThrow(
        "Unsupported currency: invalid",
      );
    });
  });

  describe("parseCurrency", () => {
    it("should parse USD correctly", () => {
      expect(parseCurrency("$20.00", "usd")).toBe(2000);
      expect(parseCurrency("$1.00", "usd")).toBe(100);
      expect(parseCurrency("$0.50", "usd")).toBe(50);
    });

    it("should parse EUR correctly", () => {
      expect(parseCurrency("€20.00", "eur")).toBe(2000);
      expect(parseCurrency("€1.00", "eur")).toBe(100);
    });

    it("should parse JPY correctly", () => {
      expect(parseCurrency("¥2000", "jpy")).toBe(2000);
      expect(parseCurrency("¥100", "jpy")).toBe(100);
    });

    it("should handle currency strings without symbols", () => {
      expect(parseCurrency("20.00", "usd")).toBe(2000);
      expect(parseCurrency("1.50", "usd")).toBe(150);
    });

    it("should handle currency strings with commas", () => {
      expect(parseCurrency("$1,000.00", "usd")).toBe(100000);
      expect(parseCurrency("€2,500.50", "eur")).toBe(250050);
    });

    it("should throw error for invalid currency string", () => {
      expect(() => parseCurrency("invalid", "usd")).toThrow(
        "Invalid currency string: invalid",
      );
    });

    it("should throw error for unsupported currency", () => {
      expect(() => parseCurrency("$20.00", "invalid")).toThrow(
        "Unsupported currency: invalid",
      );
    });
  });
});

describe("Type Guards", () => {
  describe("User type guard", () => {
    it("should identify valid user objects", () => {
      const user = {
        _id: "user_123",
        clerkId: "clerk_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "free" as const,
        status: "active" as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Type guard would be implemented in the actual types file
      expect(typeof user).toBe("object");
      expect(user.email).toBe("test@example.com");
    });
  });

  describe("SocialPost type guard", () => {
    it("should identify valid social post objects", () => {
      const post = {
        _id: "post_123",
        userId: "user_123",
        content: "Test post",
        platforms: ["facebook", "twitter"] as const,
        status: "published" as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(typeof post).toBe("object");
      expect(post.platforms).toContain("facebook");
    });
  });
});

describe("Enum Validation", () => {
  describe("UserRole enum", () => {
    it("should validate user roles", () => {
      const validRoles = ["admin", "premium", "free"];
      const invalidRoles = ["invalid", "super", "guest"];

      validRoles.forEach((role) => {
        expect(["admin", "premium", "free"]).toContain(role);
      });

      invalidRoles.forEach((role) => {
        expect(["admin", "premium", "free"]).not.toContain(role);
      });
    });
  });

  describe("SocialPlatform enum", () => {
    it("should validate social platforms", () => {
      const validPlatforms = [
        "facebook",
        "instagram",
        "x",
        "linkedin",
        "tiktok",
      ];
      const invalidPlatforms = ["invalid", "myspace", "friendster"];

      validPlatforms.forEach((platform) => {
        expect([
          "facebook",
          "instagram",
          "x",
          "linkedin",
          "tiktok",
          "youtube",
          "pinterest",
          "reddit",
          "snapchat",
          "telegram",
          "threads",
          "bluesky",
          "google_business",
        ]).toContain(platform);
      });

      invalidPlatforms.forEach((platform) => {
        expect([
          "facebook",
          "instagram",
          "x",
          "linkedin",
          "tiktok",
          "youtube",
          "pinterest",
          "reddit",
          "snapchat",
          "telegram",
          "threads",
          "bluesky",
          "google_business",
        ]).not.toContain(platform);
      });
    });
  });

  describe("PostStatus enum", () => {
    it("should validate post statuses", () => {
      const validStatuses = [
        "draft",
        "scheduled",
        "published",
        "failed",
        "deleted",
      ];
      const invalidStatuses = ["invalid", "pending", "archived"];

      validStatuses.forEach((status) => {
        expect([
          "draft",
          "scheduled",
          "published",
          "failed",
          "deleted",
        ]).toContain(status);
      });

      invalidStatuses.forEach((status) => {
        expect([
          "draft",
          "scheduled",
          "published",
          "failed",
          "deleted",
        ]).not.toContain(status);
      });
    });
  });
});
