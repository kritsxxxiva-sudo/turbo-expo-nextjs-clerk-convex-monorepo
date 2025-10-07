/**
 * Subscription Management Page
 * Comprehensive billing and subscription management interface
 */

"use client";

import React, { useState, useEffect } from "react";
import { useAuthContext } from "../../components/auth/AuthProvider";
import { useStripe } from "../../components/payments/StripeProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
  stripePriceId: string;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: 0,
    currency: "usd",
    interval: "month",
    stripePriceId: "",
    features: [
      "5 social media accounts",
      "10 posts per month",
      "Basic analytics",
      "Community support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description: "For growing businesses",
    price: 2999, // $29.99 in cents
    currency: "usd",
    interval: "month",
    stripePriceId: "price_premium_monthly",
    popular: true,
    features: [
      "Unlimited social media accounts",
      "Unlimited posts",
      "Advanced analytics",
      "Content scheduling",
      "Priority support",
      "Team collaboration",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    price: 9999, // $99.99 in cents
    currency: "usd",
    interval: "month",
    stripePriceId: "price_enterprise_monthly",
    features: [
      "Everything in Premium",
      "Custom integrations",
      "Advanced security",
      "Dedicated support",
      "SLA guarantee",
      "Custom reporting",
    ],
  },
];

export default function BillingPage() {
  const { user, hasRole } = useAuthContext();
  const {
    customer,
    subscriptions,
    createCustomer,
    createSubscription,
    cancelSubscription,
    formatAmount,
    isLoadingCustomer,
  } = useStripe();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(
    null,
  );

  // Get current subscription
  const currentSubscription = subscriptions.find(
    (sub) => sub.status === "active",
  );
  const currentPlan = currentSubscription
    ? PRICING_PLANS.find(
        (plan) => plan.stripePriceId === currentSubscription.stripePriceId,
      )
    : PRICING_PLANS[0]; // Default to free plan

  // Create customer if needed
  useEffect(() => {
    if (user && !customer && !isLoadingCustomer) {
      createCustomer().catch(console.error);
    }
  }, [user, customer, isLoadingCustomer, createCustomer]);

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!user || !customer || plan.price === 0) return;

    setIsProcessing(true);
    setSelectedPlan(plan.id);

    try {
      const clientSecret = await createSubscription(plan.stripePriceId);

      // In a real implementation, you would redirect to Stripe Checkout
      // or handle the payment confirmation flow here
      console.log("Subscription created with client secret:", clientSecret);

      alert(`Successfully subscribed to ${plan.name}!`);
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to create subscription. Please try again.");
    } finally {
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    setIsProcessing(true);

    try {
      await cancelSubscription(subscriptionId, true); // Cancel at period end
      setShowCancelConfirm(null);
      alert(
        "Subscription will be canceled at the end of the current billing period.",
      );
    } catch (error) {
      console.error("Cancellation error:", error);
      alert("Failed to cancel subscription. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Sign In Required
          </h1>
          <p className="text-gray-600">
            Please sign in to manage your subscription.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Billing & Subscription
          </h1>
          <p className="text-xl text-gray-600">
            Manage your subscription and billing information
          </p>
        </div>

        {/* Current Subscription Status */}
        {currentSubscription && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Current Subscription
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {currentPlan?.name}
                </h3>
                <p className="text-gray-600">{currentPlan?.description}</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {currentPlan && currentPlan.price > 0
                    ? `${formatAmount(currentPlan.price, currentPlan.currency)}/month`
                    : "Free"}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Status</h4>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    currentSubscription.status === "active"
                      ? "bg-green-100 text-green-800"
                      : currentSubscription.status === "canceled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {currentSubscription.status.charAt(0).toUpperCase() +
                    currentSubscription.status.slice(1)}
                </span>
                {currentSubscription.cancelAtPeriodEnd && (
                  <p className="text-sm text-red-600 mt-1">
                    Cancels on{" "}
                    {new Date(
                      currentSubscription.currentPeriodEnd,
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Next Billing</h4>
                <p className="text-gray-600">
                  {new Date(
                    currentSubscription.currentPeriodEnd,
                  ).toLocaleDateString()}
                </p>
                {!currentSubscription.cancelAtPeriodEnd && (
                  <button
                    onClick={() =>
                      setShowCancelConfirm(currentSubscription._id)
                    }
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden ${
                plan.popular ? "ring-2 ring-blue-500" : ""
              }`}
            >
              {plan.popular && (
                <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {plan.price === 0
                      ? "Free"
                      : formatAmount(plan.price, plan.currency)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600">/{plan.interval}</span>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg
                        className="h-5 w-5 text-green-500 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={
                    isProcessing ||
                    (currentPlan?.id === plan.id &&
                      currentSubscription?.status === "active") ||
                    (plan.price === 0 && !currentSubscription)
                  }
                  className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${
                    currentPlan?.id === plan.id &&
                    currentSubscription?.status === "active"
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : plan.popular
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                  } disabled:opacity-50`}
                >
                  {isProcessing && selectedPlan === plan.id
                    ? "Processing..."
                    : currentPlan?.id === plan.id &&
                        currentSubscription?.status === "active"
                      ? "Current Plan"
                      : plan.price === 0
                        ? "Free Plan"
                        : `Subscribe to ${plan.name}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Billing History */}
        {customer && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Billing History
            </h2>
            <div className="text-gray-600">
              <p>Billing history will be displayed here.</p>
              <p className="text-sm mt-2">
                Customer ID:{" "}
                <span className="font-mono">{customer.stripeCustomerId}</span>
              </p>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Cancel Subscription
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your subscription? You'll
                continue to have access until the end of your current billing
                period.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCancelConfirm(null)}
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={() => handleCancelSubscription(showCancelConfirm)}
                  disabled={isProcessing}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isProcessing ? "Canceling..." : "Cancel Subscription"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
