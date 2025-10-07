/**
 * Data Validation and Integrity Rules
 * Comprehensive validation for all database entities
 */

import { v } from "convex/values";

// User Validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return (
    usernameRegex.test(username) &&
    username.length >= 3 &&
    username.length <= 30
  );
};

export const validateClerkId = (clerkId: string): boolean => {
  return clerkId.startsWith("user_") && clerkId.length > 10;
};

// Social Account Validation
export const validatePlatform = (platform: string): boolean => {
  const validPlatforms = [
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
  ];
  return validPlatforms.includes(platform);
};

export const validateAccessToken = (token: string): boolean => {
  return token.length > 10 && !token.includes(" ");
};

// Customer Validation
export const validateStripeCustomerId = (customerId: string): boolean => {
  return customerId.startsWith("cus_") && customerId.length > 10;
};

export const validateCurrency = (currency: string): boolean => {
  const validCurrencies = [
    "usd",
    "eur",
    "gbp",
    "cad",
    "aud",
    "jpy",
    "chf",
    "sek",
    "nok",
    "dkk",
    "pln",
    "czk",
    "huf",
    "bgn",
    "ron",
    "hrk",
    "rub",
    "try",
    "brl",
    "cny",
    "inr",
    "krw",
    "sgd",
    "hkd",
    "mxn",
  ];
  return validCurrencies.includes(currency.toLowerCase());
};

export const validateCountryCode = (country: string): boolean => {
  // ISO 3166-1 alpha-2 country codes (simplified list)
  const validCountries = [
    "US",
    "CA",
    "GB",
    "DE",
    "FR",
    "IT",
    "ES",
    "NL",
    "BE",
    "CH",
    "AT",
    "SE",
    "NO",
    "DK",
    "FI",
    "PL",
    "CZ",
    "HU",
    "AU",
    "JP",
    "KR",
    "SG",
    "HK",
    "IN",
    "BR",
    "MX",
    "AR",
    "CL",
    "CO",
    "PE",
  ];
  return validCountries.includes(country.toUpperCase());
};

// Subscription Validation
export const validateStripeSubscriptionId = (
  subscriptionId: string,
): boolean => {
  return subscriptionId.startsWith("sub_") && subscriptionId.length > 10;
};

export const validateStripePriceId = (priceId: string): boolean => {
  return priceId.startsWith("price_") && priceId.length > 10;
};

export const validateSubscriptionStatus = (status: string): boolean => {
  const validStatuses = [
    "active",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "past_due",
    "trialing",
    "unpaid",
  ];
  return validStatuses.includes(status);
};

export const validatePeriodDates = (start: number, end: number): boolean => {
  return start < end && start > 0 && end > 0;
};

// Social Post Validation
export const validatePostContent = (content: string): boolean => {
  return content.length > 0 && content.length <= 2000;
};

export const validatePostStatus = (status: string): boolean => {
  const validStatuses = [
    "draft",
    "scheduled",
    "published",
    "failed",
    "deleted",
  ];
  return validStatuses.includes(status);
};

export const validateScheduledDate = (scheduledAt: number): boolean => {
  const now = Date.now();
  const fiveMinutesFromNow = now + 5 * 60 * 1000;
  return scheduledAt > fiveMinutesFromNow;
};

export const validateMediaUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ["http:", "https:"].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Webhook Event Validation
export const validateWebhookSource = (source: string): boolean => {
  const validSources = ["clerk", "stripe", "ayrshare"];
  return validSources.includes(source);
};

export const validateEventType = (eventType: string): boolean => {
  return eventType.length > 0 && eventType.includes(".");
};

export const validateEventId = (eventId: string): boolean => {
  return eventId.length > 5;
};

// Session Validation
export const validateClerkSessionId = (sessionId: string): boolean => {
  return sessionId.startsWith("sess_") && sessionId.length > 10;
};

export const validateSessionStatus = (status: string): boolean => {
  const validStatuses = ["active", "ended", "expired"];
  return validStatuses.includes(status);
};

export const validateExpirationDate = (expiresAt: number): boolean => {
  return expiresAt > Date.now();
};

export const validateIpAddress = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

// Business Rules Validation
export const validateUniqueUserEmail = async (
  ctx: any,
  email: string,
  excludeUserId?: string,
): Promise<boolean> => {
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();

  if (!existingUser) return true;
  if (excludeUserId && existingUser._id === excludeUserId) return true;
  return false;
};

export const validateUniqueClerkId = async (
  ctx: any,
  clerkId: string,
): Promise<boolean> => {
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .first();

  return !existingUser;
};

export const validateUniqueSocialAccount = async (
  ctx: any,
  userId: string,
  platform: string,
): Promise<boolean> => {
  const existingAccount = await ctx.db
    .query("socialAccounts")
    .withIndex("by_user_platform_active", (q: any) =>
      q.eq("userId", userId).eq("platform", platform).eq("isActive", true),
    )
    .first();

  return !existingAccount;
};

export const validateActiveSubscriptionLimit = async (
  ctx: any,
  userId: string,
  priceId: string,
): Promise<boolean> => {
  const activeSubscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_user_subscription_status", (q: any) =>
      q.eq("userId", userId).eq("status", "active"),
    )
    .filter((q: any) => q.eq(q.field("stripePriceId"), priceId))
    .collect();

  return activeSubscriptions.length === 0;
};

// Comprehensive Entity Validation
export const validateUserData = (
  userData: any,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!validateClerkId(userData.clerkId)) {
    errors.push("Invalid Clerk ID format");
  }

  if (!validateEmail(userData.email)) {
    errors.push("Invalid email format");
  }

  if (userData.username && !validateUsername(userData.username)) {
    errors.push("Invalid username format");
  }

  if (!["admin", "premium", "free"].includes(userData.role)) {
    errors.push("Invalid user role");
  }

  if (!["active", "suspended", "deleted"].includes(userData.status)) {
    errors.push("Invalid user status");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateSocialAccountData = (
  accountData: any,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!validatePlatform(accountData.platform)) {
    errors.push("Invalid social platform");
  }

  if (!accountData.accountId || accountData.accountId.length === 0) {
    errors.push("Account ID is required");
  }

  if (!accountData.accountName || accountData.accountName.length === 0) {
    errors.push("Account name is required");
  }

  if (!validateAccessToken(accountData.accessToken)) {
    errors.push("Invalid access token format");
  }

  if (
    !Array.isArray(accountData.permissions) ||
    accountData.permissions.length === 0
  ) {
    errors.push("Permissions array is required and must not be empty");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateCustomerData = (
  customerData: any,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!validateStripeCustomerId(customerData.stripeCustomerId)) {
    errors.push("Invalid Stripe customer ID format");
  }

  if (!validateEmail(customerData.email)) {
    errors.push("Invalid email format");
  }

  if (!validateCurrency(customerData.currency)) {
    errors.push("Invalid currency code");
  }

  if (
    customerData.address &&
    !validateCountryCode(customerData.address.country)
  ) {
    errors.push("Invalid country code in address");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateSocialPostData = (
  postData: any,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!validatePostContent(postData.content)) {
    errors.push("Invalid post content length");
  }

  if (!Array.isArray(postData.platforms) || postData.platforms.length === 0) {
    errors.push("At least one platform is required");
  }

  for (const platform of postData.platforms) {
    if (!validatePlatform(platform)) {
      errors.push(`Invalid platform: ${platform}`);
    }
  }

  if (!validatePostStatus(postData.status)) {
    errors.push("Invalid post status");
  }

  if (postData.scheduledAt && !validateScheduledDate(postData.scheduledAt)) {
    errors.push("Scheduled date must be at least 5 minutes in the future");
  }

  if (postData.mediaUrls) {
    for (const url of postData.mediaUrls) {
      if (!validateMediaUrl(url)) {
        errors.push(`Invalid media URL: ${url}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
