/**
 * Customer Management Functions
 * Handles Stripe customer data synchronization
 */

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { validateCustomerData } from "../lib/validation";

// Address Schema for validation
const addressValidator = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  state: v.optional(v.string()),
  postalCode: v.string(),
  country: v.string(),
});

// Tax ID Schema for validation
const taxIdValidator = v.object({
  type: v.string(),
  value: v.string(),
});

// Create Customer
export const createCustomer = mutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    defaultPaymentMethodId: v.optional(v.string()),
    currency: v.string(),
    taxIds: v.optional(v.array(taxIdValidator)),
    address: v.optional(addressValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Validate input data
    const validation = validateCustomerData(args);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Check if user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check for unique Stripe customer ID
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId),
      )
      .first();

    if (existingCustomer) {
      throw new Error("Customer with this Stripe ID already exists");
    }

    const now = Date.now();
    const customerId = await ctx.db.insert("customers", {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      email: args.email,
      name: args.name,
      defaultPaymentMethodId: args.defaultPaymentMethodId,
      currency: args.currency,
      taxIds: args.taxIds,
      address: args.address,
      metadata: args.metadata || {},
      createdAt: now,
      updatedAt: now,
    });

    return customerId;
  },
});

// Get Customer by User ID
export const getCustomerByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    return customer;
  },
});

// Get Customer by Stripe ID
export const getCustomerByStripeId = query({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId),
      )
      .first();

    return customer;
  },
});

// Update Customer
export const updateCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    defaultPaymentMethodId: v.optional(v.string()),
    currency: v.optional(v.string()),
    taxIds: v.optional(v.array(taxIdValidator)),
    address: v.optional(addressValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { customerId, ...updates } = args;

    const existingCustomer = await ctx.db.get(customerId);
    if (!existingCustomer) {
      throw new Error("Customer not found");
    }

    // Validate updated data if provided
    if (updates.email || updates.currency) {
      const updatedData = { ...existingCustomer, ...updates };
      const validation = validateCustomerData(updatedData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }
    }

    await ctx.db.patch(customerId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return customerId;
  },
});

// Update Customer from Stripe Webhook
export const updateCustomerFromStripe = mutation({
  args: {
    stripeCustomerId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    defaultPaymentMethodId: v.optional(v.string()),
    currency: v.optional(v.string()),
    address: v.optional(addressValidator),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { stripeCustomerId, ...updates } = args;

    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_stripe_customer_id", (q) =>
        q.eq("stripeCustomerId", stripeCustomerId),
      )
      .first();

    if (!existingCustomer) {
      throw new Error("Customer not found");
    }

    await ctx.db.patch(existingCustomer._id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return existingCustomer._id;
  },
});

// Delete Customer
export const deleteCustomer = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const existingCustomer = await ctx.db.get(args.customerId);
    if (!existingCustomer) {
      throw new Error("Customer not found");
    }

    // Check for active subscriptions
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_subscription_status", (q) =>
        q.eq("userId", existingCustomer.userId).eq("status", "active"),
      )
      .collect();

    if (activeSubscriptions.length > 0) {
      throw new Error("Cannot delete customer with active subscriptions");
    }

    await ctx.db.delete(args.customerId);
    return args.customerId;
  },
});

// Get Customers by Currency
export const getCustomersByCurrency = query({
  args: {
    currency: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const customers = await ctx.db
      .query("customers")
      .filter((q) => q.eq(q.field("currency"), args.currency))
      .take(args.limit || 50);

    return customers;
  },
});

// Search Customers
export const searchCustomers = query({
  args: {
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const customers = await ctx.db
      .query("customers")
      .filter((q) =>
        q.or(
          q.eq(q.field("email"), args.searchTerm),
          q.eq(q.field("name"), args.searchTerm),
          q.eq(q.field("stripeCustomerId"), args.searchTerm),
        ),
      )
      .take(args.limit || 20);

    return customers;
  },
});

// Get Customer Statistics
export const getCustomerStatistics = query({
  args: {},
  handler: async (ctx) => {
    const allCustomers = await ctx.db.query("customers").collect();

    const currencyCounts: Record<string, number> = {};
    allCustomers.forEach((customer) => {
      currencyCounts[customer.currency] =
        (currencyCounts[customer.currency] || 0) + 1;
    });

    const stats = {
      total: allCustomers.length,
      currencyCounts,
      withPaymentMethods: allCustomers.filter((c) => c.defaultPaymentMethodId)
        .length,
      withAddresses: allCustomers.filter((c) => c.address).length,
      withTaxIds: allCustomers.filter((c) => c.taxIds && c.taxIds.length > 0)
        .length,
      recentCustomers: allCustomers.filter(
        (c) => c.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).length,
    };

    return stats;
  },
});

// Sync Customer with Stripe
export const syncCustomerWithStripe = mutation({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    // TODO: Implement actual Stripe API call to sync customer data
    // This would typically involve:
    // 1. Fetching customer data from Stripe
    // 2. Updating local customer record
    // 3. Handling any discrepancies

    await ctx.db.patch(args.customerId, {
      updatedAt: Date.now(),
    });

    return args.customerId;
  },
});

// Get Customer with User Details
export const getCustomerWithUser = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) {
      return null;
    }

    const user = await ctx.db.get(customer.userId);
    if (!user) {
      return customer;
    }

    return {
      ...customer,
      user: {
        _id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    };
  },
});

// Bulk Update Customers
export const bulkUpdateCustomers = mutation({
  args: {
    customerIds: v.array(v.id("customers")),
    updates: v.object({
      currency: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const customerId of args.customerIds) {
      try {
        const customer = await ctx.db.get(customerId);
        if (customer) {
          await ctx.db.patch(customerId, {
            ...args.updates,
            updatedAt: Date.now(),
          });
          results.push({ customerId, success: true });
        } else {
          results.push({
            customerId,
            success: false,
            error: "Customer not found",
          });
        }
      } catch (error) {
        results.push({
          customerId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  },
});
