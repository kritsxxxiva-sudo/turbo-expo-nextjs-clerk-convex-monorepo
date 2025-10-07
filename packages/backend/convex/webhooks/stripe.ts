/**
 * Stripe Webhook Handlers
 * Processes Stripe payment events and syncs subscription data
 */

import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";
import { webhookMiddleware } from "../lib/webhookAuth";
import { withErrorHandling, globalErrorAggregator } from "../lib/errorHandling";

// Main Stripe webhook handler
export const stripeWebhook = httpAction(async (ctx, request) => {
  const handleWebhook = withErrorHandling(
    async () => {
      const payload = await request.text();
      const signature = request.headers.get("stripe-signature") || "";

      // Get webhook secret from environment
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new ConvexError("STRIPE_WEBHOOK_SECRET not configured");
      }

      // Verify webhook signature
      const middleware = webhookMiddleware.stripe(webhookSecret);
      const verification = middleware(payload, {
        "stripe-signature": signature,
        "content-type": "application/json",
      });

      // Parse webhook event
      const event = JSON.parse(payload);
      console.log("Stripe webhook event:", event.type);

      // Log webhook event for audit trail
      await ctx.runMutation(internal.webhookEvents.createWebhookEvent, {
        source: "stripe",
        eventType: event.type,
        eventId: event.id,
        payload: event,
        processed: false,
        retryCount: 0,
      });

      // Process the event based on type
      switch (event.type) {
        // Customer events
        case "customer.created":
          await handleCustomerCreated(ctx, event);
          break;

        case "customer.updated":
          await handleCustomerUpdated(ctx, event);
          break;

        case "customer.deleted":
          await handleCustomerDeleted(ctx, event);
          break;

        // Subscription events
        case "customer.subscription.created":
          await handleSubscriptionCreated(ctx, event);
          break;

        case "customer.subscription.updated":
          await handleSubscriptionUpdated(ctx, event);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(ctx, event);
          break;

        // Payment events
        case "payment_intent.succeeded":
          await handlePaymentSucceeded(ctx, event);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentFailed(ctx, event);
          break;

        // Invoice events
        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(ctx, event);
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(ctx, event);
          break;

        default:
          console.log(`Unhandled Stripe webhook event: ${event.type}`);
      }

      // Mark webhook as processed
      await ctx.runMutation(internal.webhookEvents.markWebhookProcessed, {
        source: "stripe",
        eventId: event.id,
      });

      return new Response("OK", { status: 200 });
    },
    {
      context: "stripe-webhook",
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
        jitter: true,
        retryableErrors: ["NETWORK_ERROR", "TIMEOUT", "SERVER_ERROR"],
      },
    },
  );

  try {
    return await handleWebhook();
  } catch (error) {
    console.error("Stripe webhook error:", error);

    // Log the error for debugging
    try {
      const payload = await request.text();
      const event = JSON.parse(payload);

      await ctx.runMutation(internal.webhookEvents.markWebhookError, {
        source: "stripe",
        eventId: event.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Failed to log webhook error:", logError);
    }

    return new Response("Internal Server Error", { status: 500 });
  }
});

// Handle customer.created event
async function handleCustomerCreated(ctx: any, event: any) {
  try {
    const customerData = event.data.object;

    // Find user by email (assuming customer email matches user email)
    const users = await ctx.runQuery(internal.users.searchUsers, {
      searchTerm: customerData.email,
      limit: 1,
    });

    if (users.length === 0) {
      console.warn(`No user found for customer email: ${customerData.email}`);
      return;
    }

    const user = users[0];

    // Create customer record
    await ctx.runMutation(internal.customers.createCustomer, {
      userId: user._id,
      stripeCustomerId: customerData.id,
      email: customerData.email,
      name: customerData.name,
      currency: customerData.currency || "usd",
      address: customerData.address
        ? {
            line1: customerData.address.line1 || "",
            line2: customerData.address.line2,
            city: customerData.address.city || "",
            state: customerData.address.state,
            postalCode: customerData.address.postal_code || "",
            country: customerData.address.country || "",
          }
        : undefined,
      metadata: customerData.metadata,
    });

    console.log(`Customer created: ${customerData.id} for user ${user._id}`);
  } catch (error) {
    console.error("Error handling customer.created:", error);
    throw error;
  }
}

// Handle customer.updated event
async function handleCustomerUpdated(ctx: any, event: any) {
  try {
    const customerData = event.data.object;

    await ctx.runMutation(internal.customers.updateCustomerFromStripe, {
      stripeCustomerId: customerData.id,
      email: customerData.email,
      name: customerData.name,
      currency: customerData.currency,
      address: customerData.address
        ? {
            line1: customerData.address.line1 || "",
            line2: customerData.address.line2,
            city: customerData.address.city || "",
            state: customerData.address.state,
            postalCode: customerData.address.postal_code || "",
            country: customerData.address.country || "",
          }
        : undefined,
      metadata: customerData.metadata,
    });

    console.log(`Customer updated: ${customerData.id}`);
  } catch (error) {
    console.error("Error handling customer.updated:", error);
    throw error;
  }
}

// Handle customer.deleted event
async function handleCustomerDeleted(ctx: any, event: any) {
  try {
    const customerData = event.data.object;

    // Find customer in our database
    const customer = await ctx.runQuery(
      internal.customers.getCustomerByStripeId,
      {
        stripeCustomerId: customerData.id,
      },
    );

    if (customer) {
      // Delete customer (this will check for active subscriptions)
      await ctx.runMutation(internal.customers.deleteCustomer, {
        customerId: customer._id,
      });
    }

    console.log(`Customer deleted: ${customerData.id}`);
  } catch (error) {
    console.error("Error handling customer.deleted:", error);
    throw error;
  }
}

// Handle subscription.created event
async function handleSubscriptionCreated(ctx: any, event: any) {
  try {
    const subscriptionData = event.data.object;

    // Find customer
    const customer = await ctx.runQuery(
      internal.customers.getCustomerByStripeId,
      {
        stripeCustomerId: subscriptionData.customer,
      },
    );

    if (!customer) {
      console.warn(
        `Customer not found for subscription: ${subscriptionData.id}`,
      );
      return;
    }

    // Create subscription record
    await ctx.runMutation(internal.subscriptions.createSubscription, {
      userId: customer.userId,
      customerId: customer._id,
      stripeSubscriptionId: subscriptionData.id,
      stripePriceId: subscriptionData.items.data[0]?.price?.id || "",
      status: subscriptionData.status,
      currentPeriodStart: subscriptionData.current_period_start * 1000,
      currentPeriodEnd: subscriptionData.current_period_end * 1000,
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
      trialStart: subscriptionData.trial_start
        ? subscriptionData.trial_start * 1000
        : undefined,
      trialEnd: subscriptionData.trial_end
        ? subscriptionData.trial_end * 1000
        : undefined,
      quantity: subscriptionData.quantity || 1,
      metadata: subscriptionData.metadata,
    });

    console.log(
      `Subscription created: ${subscriptionData.id} for customer ${customer._id}`,
    );
  } catch (error) {
    console.error("Error handling subscription.created:", error);
    throw error;
  }
}

// Handle subscription.updated event
async function handleSubscriptionUpdated(ctx: any, event: any) {
  try {
    const subscriptionData = event.data.object;

    await ctx.runMutation(internal.subscriptions.updateSubscriptionFromStripe, {
      stripeSubscriptionId: subscriptionData.id,
      status: subscriptionData.status,
      currentPeriodStart: subscriptionData.current_period_start * 1000,
      currentPeriodEnd: subscriptionData.current_period_end * 1000,
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
      canceledAt: subscriptionData.canceled_at
        ? subscriptionData.canceled_at * 1000
        : undefined,
      trialStart: subscriptionData.trial_start
        ? subscriptionData.trial_start * 1000
        : undefined,
      trialEnd: subscriptionData.trial_end
        ? subscriptionData.trial_end * 1000
        : undefined,
      quantity: subscriptionData.quantity,
      metadata: subscriptionData.metadata,
    });

    console.log(`Subscription updated: ${subscriptionData.id}`);
  } catch (error) {
    console.error("Error handling subscription.updated:", error);
    throw error;
  }
}

// Handle subscription.deleted event
async function handleSubscriptionDeleted(ctx: any, event: any) {
  try {
    const subscriptionData = event.data.object;

    await ctx.runMutation(internal.subscriptions.updateSubscriptionFromStripe, {
      stripeSubscriptionId: subscriptionData.id,
      status: "canceled",
      canceledAt: Date.now(),
    });

    console.log(`Subscription deleted: ${subscriptionData.id}`);
  } catch (error) {
    console.error("Error handling subscription.deleted:", error);
    throw error;
  }
}

// Handle payment_intent.succeeded event
async function handlePaymentSucceeded(ctx: any, event: any) {
  try {
    const paymentData = event.data.object;

    console.log(
      `Payment succeeded: ${paymentData.id} for ${paymentData.amount} ${paymentData.currency}`,
    );

    // TODO: Update payment records, send confirmation emails, etc.
  } catch (error) {
    console.error("Error handling payment_intent.succeeded:", error);
    throw error;
  }
}

// Handle payment_intent.payment_failed event
async function handlePaymentFailed(ctx: any, event: any) {
  try {
    const paymentData = event.data.object;

    console.log(
      `Payment failed: ${paymentData.id} - ${paymentData.last_payment_error?.message}`,
    );

    // TODO: Handle failed payments, notify users, etc.
  } catch (error) {
    console.error("Error handling payment_intent.payment_failed:", error);
    throw error;
  }
}

// Handle invoice.payment_succeeded event
async function handleInvoicePaymentSucceeded(ctx: any, event: any) {
  try {
    const invoiceData = event.data.object;

    console.log(
      `Invoice payment succeeded: ${invoiceData.id} for subscription ${invoiceData.subscription}`,
    );

    // TODO: Update subscription status, send receipts, etc.
  } catch (error) {
    console.error("Error handling invoice.payment_succeeded:", error);
    throw error;
  }
}

// Handle invoice.payment_failed event
async function handleInvoicePaymentFailed(ctx: any, event: any) {
  try {
    const invoiceData = event.data.object;

    console.log(
      `Invoice payment failed: ${invoiceData.id} for subscription ${invoiceData.subscription}`,
    );

    // TODO: Handle failed invoice payments, update subscription status, etc.
  } catch (error) {
    console.error("Error handling invoice.payment_failed:", error);
    throw error;
  }
}

// Health check endpoint for Stripe webhooks
export const stripeWebhookHealth = httpAction(async (ctx, request) => {
  return new Response(
    JSON.stringify({
      status: "healthy",
      service: "stripe-webhooks",
      timestamp: new Date().toISOString(),
      errorSummary: globalErrorAggregator.getErrorSummary().slice(0, 5),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
});
