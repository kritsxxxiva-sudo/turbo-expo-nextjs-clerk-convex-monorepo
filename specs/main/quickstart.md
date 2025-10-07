# Quickstart Guide: Comprehensive External Service Integration

**Date**: 2025-10-06  
**Feature**: Comprehensive External Service Integration  
**Estimated Time**: 30-45 minutes for basic setup

## Overview

This quickstart guide walks you through setting up and testing the comprehensive external service integration including Clerk authentication, Stripe payments, Ayrshare social media management, enhanced database schema, strict TypeScript configuration, and centralized API client utilities.

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] Yarn package manager installed
- [ ] Git repository cloned and dependencies installed
- [ ] Convex account and project set up
- [ ] Clerk account and application configured
- [ ] Stripe account with test mode enabled
- [ ] Ayrshare account with API access
- [ ] VS Code or preferred IDE with TypeScript support

## Phase 1: Foundation Setup (10 minutes)

### 1.1 TypeScript Configuration

Verify strict TypeScript configuration is working:

```bash
# Check TypeScript compilation
yarn type-check

# Expected output: No errors, all packages compile successfully
```

Test type safety:

```typescript
// In apps/web/src/test-types.ts
import type { User } from "@/types/clerk";

const testUser: User = {
  // TypeScript should provide full autocomplete and validation
  _id: "test-id",
  clerkId: "user_test",
  email: "test@example.com",
  role: "free", // Should only allow: admin | premium | free
  status: "active",
  preferences: {
    theme: "system",
    language: "en",
    timezone: "America/New_York",
    notifications: {
      email: true,
      push: true,
      marketing: false,
      security: true,
    },
    privacy: {
      profileVisible: true,
      analyticsEnabled: true,
      dataSharing: false,
    },
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

### 1.2 API Client Utilities

Test the base API client:

```typescript
// In packages/api-clients/src/test-client.ts
import { BaseApiClient } from "./base/BaseApiClient";

const testClient = new BaseApiClient({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 5000,
  retryAttempts: 2,
  cache: { enabled: true, ttl: 60000 },
});

// Test basic functionality
async function testApiClient() {
  try {
    const response = await testClient.get("/posts/1");
    console.log("API Client Test Success:", response);
  } catch (error) {
    console.error("API Client Test Failed:", error);
  }
}

testApiClient();
```

**Expected Result**: API client successfully makes request with retry logic and caching.

## Phase 2: Database Schema Setup (5 minutes)

### 2.1 Convex Schema Deployment

Deploy the enhanced database schema:

```bash
# Navigate to backend package
cd packages/backend

# Deploy schema to Convex
npx convex deploy

# Expected output: Schema deployed successfully with all tables created
```

### 2.2 Verify Database Tables

Check that all tables are created in Convex dashboard:

- [ ] `users` table with proper indexes
- [ ] `socialAccounts` table
- [ ] `customers` table
- [ ] `subscriptions` table
- [ ] `socialPosts` table
- [ ] `webhookEvents` table
- [ ] `userSessions` table

### 2.3 Test Database Operations

```typescript
// In packages/backend/convex/test-db.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const testDatabaseOperations = mutation({
  args: {},
  handler: async (ctx) => {
    // Test user creation
    const userId = await ctx.db.insert("users", {
      clerkId: "test_user_123",
      email: "test@example.com",
      role: "free",
      status: "active",
      preferences: {
        theme: "system",
        language: "en",
        timezone: "America/New_York",
        notifications: {
          email: true,
          push: true,
          marketing: false,
          security: true,
        },
        privacy: {
          profileVisible: true,
          analyticsEnabled: true,
          dataSharing: false,
        },
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("Test user created:", userId);
    return { success: true, userId };
  },
});
```

**Expected Result**: User created successfully with all required fields and proper validation.

## Phase 3: Authentication Integration (10 minutes)

### 3.1 Clerk Configuration

Verify Clerk environment variables:

```bash
# Check environment variables are set
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY
echo $EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
```

### 3.2 Test Authentication Flow

**Web App Test**:

```bash
# Start web development server
cd apps/web
yarn dev

# Navigate to http://localhost:3000
# Test sign-up/sign-in flows with Google, email, etc.
```

**Native App Test**:

```bash
# Start native development server
cd apps/native
yarn start

# Test authentication on iOS/Android simulator
```

### 3.3 Webhook Processing Test

Test Clerk webhook processing:

```bash
# Use ngrok to expose local webhook endpoint
ngrok http 3000

# Configure Clerk webhook URL: https://your-ngrok-url.ngrok.io/api/webhooks/clerk
# Create a test user in Clerk dashboard
# Verify webhook is processed in Convex logs
```

**Expected Result**: User creation webhook creates corresponding user record in Convex database.

## Phase 4: Payment Integration (10 minutes)

### 4.1 Stripe Configuration

Verify Stripe environment variables:

```bash
# Check Stripe configuration
echo $STRIPE_SECRET_KEY
echo $STRIPE_WEBHOOK_SECRET
echo $NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### 4.2 Test Payment Flow

Create a test payment intent:

```typescript
// Test in Convex dashboard or via API
import { ApiClientFactory } from "@packages/api-clients";

const stripe = ApiClientFactory.getStripeClient();

async function testPayment() {
  try {
    const paymentIntent = await stripe.createPaymentIntent({
      amount: 2000, // $20.00
      currency: "usd",
      metadata: { test: "true" },
    });

    console.log("Payment Intent Created:", paymentIntent.id);
    return paymentIntent;
  } catch (error) {
    console.error("Payment Test Failed:", error);
  }
}
```

### 4.3 Test Subscription Creation

```typescript
// Test subscription creation
async function testSubscription() {
  try {
    // First create a customer
    const customer = await stripe.createCustomer({
      email: "test@example.com",
      name: "Test User",
    });

    // Then create a subscription (use test price ID)
    const subscription = await stripe.createSubscription({
      customer: customer.id,
      items: [{ price: "price_test_123" }], // Replace with actual test price
    });

    console.log("Subscription Created:", subscription.id);
    return subscription;
  } catch (error) {
    console.error("Subscription Test Failed:", error);
  }
}
```

**Expected Result**: Payment intent and subscription created successfully in Stripe test mode.

## Phase 5: Social Media Integration (10 minutes)

### 5.1 Ayrshare Configuration

Verify Ayrshare environment variables:

```bash
# Check Ayrshare configuration
echo $AYRSHARE_API_KEY
```

### 5.2 Test Social Media Connection

Test Ayrshare API connectivity:

```typescript
// Test Ayrshare client
import { ApiClientFactory } from "@packages/api-clients";

const ayrshare = ApiClientFactory.getAyrshareClient();

async function testAyrshare() {
  try {
    const profiles = await ayrshare.getProfiles();
    console.log("Connected Profiles:", profiles);
    return profiles;
  } catch (error) {
    console.error("Ayrshare Test Failed:", error);
  }
}
```

### 5.3 Test Social Media Posting

```typescript
// Test social media posting
async function testSocialPost() {
  try {
    const post = await ayrshare.createPost({
      post: "Test post from integration! 🚀",
      platforms: ["x"], // Start with X (Twitter) for testing
    });

    console.log("Post Created:", post);
    return post;
  } catch (error) {
    console.error("Social Post Test Failed:", error);
  }
}
```

**Expected Result**: Successfully connects to Ayrshare and can create test posts.

## Validation Checklist

After completing all phases, verify the following:

### Technical Validation

- [ ] TypeScript compilation passes with no errors
- [ ] All API clients can make successful requests
- [ ] Database schema deployed with all tables and indexes
- [ ] Webhook processing works for all services
- [ ] Real-time updates propagate to frontend
- [ ] Error handling works correctly
- [ ] Caching and retry logic functions properly

### Functional Validation

- [ ] User can sign up/sign in with multiple providers
- [ ] User profile management works
- [ ] Payment processing completes successfully
- [ ] Subscription management functions
- [ ] Social media accounts can be connected
- [ ] Posts can be created and published
- [ ] Analytics data is retrieved correctly

### Cross-Platform Validation

- [ ] Authentication works in both web and native apps
- [ ] UI components render correctly on both platforms
- [ ] Real-time updates work across platforms
- [ ] Error states are handled gracefully
- [ ] Performance meets requirements

## Troubleshooting

### Common Issues

**TypeScript Errors**:

```bash
# Clear TypeScript cache
yarn type-check --build --clean
yarn type-check
```

**API Client Failures**:

- Check environment variables are set correctly
- Verify API keys are valid and have proper permissions
- Check network connectivity and firewall settings

**Database Issues**:

- Verify Convex deployment succeeded
- Check schema validation in Convex dashboard
- Ensure proper indexing for query performance

**Webhook Processing**:

- Verify webhook URLs are accessible
- Check webhook signature verification
- Monitor Convex logs for processing errors

### Performance Issues

**Slow API Responses**:

- Check caching configuration
- Verify retry logic isn't causing delays
- Monitor external service response times

**Database Query Performance**:

- Review query patterns and indexing
- Check for N+1 query problems
- Monitor Convex performance metrics

## Next Steps

After successful quickstart completion:

1. **Run Full Test Suite**: Execute comprehensive tests for all integrations
2. **Performance Testing**: Load test with realistic data volumes
3. **Security Review**: Audit authentication and data handling
4. **Documentation**: Update API documentation and user guides
5. **Monitoring Setup**: Configure alerts and monitoring dashboards

## Support

If you encounter issues during quickstart:

1. Check the troubleshooting section above
2. Review the detailed specifications in the specs directory
3. Consult the API documentation in the contracts directory
4. Check external service documentation (Clerk, Stripe, Ayrshare)
5. Review Convex logs and error messages

## Success Criteria

The quickstart is successful when:

- [ ] All phases complete without errors
- [ ] Validation checklist items pass
- [ ] Basic user flows work end-to-end
- [ ] Performance meets baseline requirements
- [ ] Error handling works as expected

**Estimated Total Time**: 45 minutes for experienced developers, up to 90 minutes for first-time setup.

This quickstart provides a solid foundation for the comprehensive external service integration. The modular architecture allows for incremental testing and validation of each component.
