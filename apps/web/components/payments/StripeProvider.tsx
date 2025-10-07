/**
 * Stripe Payment Provider Component
 * Integrates Stripe payments with multi-currency support
 */

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { loadStripe, Stripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useAuthContext } from "../auth/AuthProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// Stripe context types
interface StripeContextType {
  // Stripe instance
  stripe: Stripe | null;

  // Customer data
  customer?: {
    _id: string;
    stripeCustomerId: string;
    email: string;
    name?: string;
    currency: string;
    defaultPaymentMethodId?: string;
  };

  // Subscriptions
  subscriptions: Array<{
    _id: string;
    stripeSubscriptionId: string;
    status: string;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    stripePriceId: string;
    cancelAtPeriodEnd: boolean;
  }>;

  // Loading states
  isLoadingCustomer: boolean;
  isLoadingSubscriptions: boolean;

  // Actions
  createCustomer: (currency?: string) => Promise<void>;
  createSubscription: (priceId: string) => Promise<string>; // Returns client secret
  cancelSubscription: (
    subscriptionId: string,
    cancelAtPeriodEnd?: boolean,
  ) => Promise<void>;
  createPaymentIntent: (amount: number, currency: string) => Promise<string>; // Returns client secret

  // Currency utilities
  supportedCurrencies: string[];
  formatAmount: (amount: number, currency: string) => string;
  convertAmount: (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ) => Promise<number>;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

// Stripe provider component
export function StripeProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useAuthContext();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);

  // Convex mutations and queries
  const createCustomerMutation = useMutation(api.customers.createCustomer);
  const createSubscriptionMutation = useMutation(
    api.subscriptions.createSubscription,
  );
  const cancelSubscriptionMutation = useMutation(
    api.subscriptions.cancelSubscription,
  );

  const customer = useQuery(
    api.customers.getCustomerByUserId,
    user ? { userId: user._id } : "skip",
  );

  const subscriptions =
    useQuery(
      api.subscriptions.getUserSubscriptions,
      user ? { userId: user._id } : "skip",
    ) || [];

  // Initialize Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        console.error("Stripe publishable key not found");
        return;
      }

      const stripeInstance = await loadStripe(publishableKey);
      setStripe(stripeInstance);
    };

    initializeStripe();
  }, []);

  // Create customer
  const createCustomer = async (currency: string = "usd") => {
    if (!user) throw new Error("User not authenticated");

    setIsLoadingCustomer(true);
    try {
      // Call backend API to create Stripe customer
      const response = await fetch("/api/stripe/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          currency,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create customer");
      }

      const { customer: stripeCustomer } = await response.json();

      // Create customer record in Convex
      await createCustomerMutation({
        userId: user._id,
        stripeCustomerId: stripeCustomer.id,
        email: stripeCustomer.email,
        name: stripeCustomer.name,
        currency: stripeCustomer.currency || currency,
      });
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    } finally {
      setIsLoadingCustomer(false);
    }
  };

  // Create subscription
  const createSubscription = async (priceId: string): Promise<string> => {
    if (!customer) {
      throw new Error("Customer not found. Please create a customer first.");
    }

    try {
      // Call backend API to create subscription
      const response = await fetch("/api/stripe/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.stripeCustomerId,
          priceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create subscription");
      }

      const { subscription, clientSecret } = await response.json();

      // Create subscription record in Convex
      await createSubscriptionMutation({
        userId: user!._id,
        customerId: customer._id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start * 1000,
        currentPeriodEnd: subscription.current_period_end * 1000,
        quantity: subscription.quantity || 1,
      });

      return clientSecret;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  };

  // Cancel subscription
  const cancelSubscription = async (
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ) => {
    try {
      // Call backend API to cancel subscription
      const response = await fetch(
        `/api/stripe/subscriptions/${subscriptionId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cancelAtPeriodEnd,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      // Update subscription in Convex
      const subscription = subscriptions.find(
        (s) => s.stripeSubscriptionId === subscriptionId,
      );
      if (subscription) {
        await cancelSubscriptionMutation({
          subscriptionId: subscription._id,
          cancelAtPeriodEnd,
        });
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      throw error;
    }
  };

  // Create payment intent
  const createPaymentIntent = async (
    amount: number,
    currency: string,
  ): Promise<string> => {
    if (!customer) {
      throw new Error("Customer not found. Please create a customer first.");
    }

    try {
      // Call backend API to create payment intent
      const response = await fetch("/api/stripe/payment-intents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          customerId: customer.stripeCustomerId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment intent");
      }

      const { clientSecret } = await response.json();
      return clientSecret;
    } catch (error) {
      console.error("Error creating payment intent:", error);
      throw error;
    }
  };

  // Currency utilities
  const supportedCurrencies = [
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

  const formatAmount = (amount: number, currency: string): string => {
    const currencyInfo: Record<string, { symbol: string; decimals: number }> = {
      usd: { symbol: "$", decimals: 2 },
      eur: { symbol: "€", decimals: 2 },
      gbp: { symbol: "£", decimals: 2 },
      jpy: { symbol: "¥", decimals: 0 },
      // Add more currencies as needed
    };

    const info = currencyInfo[currency.toLowerCase()] || {
      symbol: currency.toUpperCase(),
      decimals: 2,
    };
    const displayAmount = info.decimals === 0 ? amount : amount / 100;

    return `${info.symbol}${displayAmount.toFixed(info.decimals)}`;
  };

  const convertAmount = async (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> => {
    if (fromCurrency === toCurrency) return amount;

    try {
      // Call currency conversion API
      const response = await fetch(`/api/currency/convert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          from: fromCurrency,
          to: toCurrency,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to convert currency");
      }

      const { convertedAmount } = await response.json();
      return convertedAmount;
    } catch (error) {
      console.error("Error converting currency:", error);
      throw error;
    }
  };

  // Context value
  const contextValue: StripeContextType = {
    stripe,
    customer: customer || undefined,
    subscriptions,
    isLoadingCustomer,
    isLoadingSubscriptions,
    createCustomer,
    createSubscription,
    cancelSubscription,
    createPaymentIntent,
    supportedCurrencies,
    formatAmount,
    convertAmount,
  };

  return (
    <StripeContext.Provider value={contextValue}>
      {children}
    </StripeContext.Provider>
  );
}

// Hook to use Stripe context
export function useStripe(): StripeContextType {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error("useStripe must be used within a StripeProvider");
  }
  return context;
}

// Stripe Elements wrapper with theme
export function StripeElementsWrapper({
  children,
  clientSecret,
  currency = "usd",
}: {
  children: React.ReactNode;
  clientSecret?: string;
  currency?: string;
}) {
  const { stripe } = useStripe();

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#0570de",
        colorBackground: "#ffffff",
        colorText: "#30313d",
        colorDanger: "#df1b41",
        fontFamily: "Inter, system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "8px",
      },
    },
    loader: "auto",
  };

  if (!stripe) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Elements stripe={stripe} options={options}>
      {children}
    </Elements>
  );
}
