/**
 * Native Payment Provider Component
 * React Native Stripe payment integration with mobile-specific features
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { useNativeAuth } from "../auth/AuthProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import Stripe React Native
import {
  StripeProvider,
  useStripe,
  useConfirmPayment,
  useConfirmSetupIntent,
  CardField,
  ApplePayButton,
  GooglePayButton,
  useApplePay,
  useGooglePay,
} from "@stripe/stripe-react-native";

// Native payment context types
interface NativePaymentContextType {
  // Stripe instance
  stripe: any;

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
  createSubscription: (priceId: string) => Promise<string>;
  cancelSubscription: (
    subscriptionId: string,
    cancelAtPeriodEnd?: boolean,
  ) => Promise<void>;
  processPayment: (amount: number, currency: string) => Promise<boolean>;

  // Mobile-specific features
  mobilePayments: {
    applePayAvailable: boolean;
    googlePayAvailable: boolean;
    processApplePay: (amount: number, currency: string) => Promise<boolean>;
    processGooglePay: (amount: number, currency: string) => Promise<boolean>;
  };

  // Offline support
  isOffline: boolean;
  queuePayment: (paymentData: any) => Promise<void>;
  processQueuedPayments: () => Promise<void>;

  // Currency utilities
  supportedCurrencies: string[];
  formatAmount: (amount: number, currency: string) => string;
  convertAmount: (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ) => Promise<number>;
}

const NativePaymentContext = createContext<
  NativePaymentContextType | undefined
>(undefined);

// Native payment provider component
export function NativePaymentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isSignedIn } = useNativeAuth();
  const stripe = useStripe();
  const { confirmPayment } = useConfirmPayment();
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const { isApplePaySupported, presentApplePay } = useApplePay();
  const { isGooglePaySupported, initGooglePay, presentGooglePay } =
    useGooglePay();

  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [isLoadingSubscriptions, setIsLoadingSubscriptions] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

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

  // Initialize mobile payment methods
  useEffect(() => {
    checkMobilePaymentAvailability();
  }, []);

  // Check mobile payment availability
  const checkMobilePaymentAvailability = async () => {
    try {
      if (Platform.OS === "ios") {
        const applePaySupported = await isApplePaySupported();
        setApplePayAvailable(applePaySupported);
      } else if (Platform.OS === "android") {
        const googlePaySupported = await isGooglePaySupported();
        setGooglePayAvailable(googlePaySupported);

        if (googlePaySupported) {
          await initGooglePay({
            testEnv: __DEV__,
            merchantName: "Your App Name",
            countryCode: "US",
            billingAddressConfig: {
              format: "FULL",
              isRequired: true,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error checking mobile payment availability:", error);
    }
  };

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
      if (isOffline) {
        await queuePayment({ action: "createCustomer", currency });
      }
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
      if (isOffline) {
        await queuePayment({ action: "createSubscription", priceId });
      }
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

  // Process payment with card
  const processPayment = async (
    amount: number,
    currency: string,
  ): Promise<boolean> => {
    if (!customer || !stripe) {
      throw new Error("Payment system not ready");
    }

    try {
      // Create payment intent
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

      // Confirm payment
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        console.error("Payment confirmation error:", error);
        Alert.alert("Payment Failed", error.message);
        return false;
      }

      if (paymentIntent?.status === "Succeeded") {
        Alert.alert(
          "Payment Successful",
          "Your payment has been processed successfully.",
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error processing payment:", error);
      Alert.alert(
        "Payment Error",
        "An error occurred while processing your payment.",
      );
      return false;
    }
  };

  // Process Apple Pay
  const processApplePay = async (
    amount: number,
    currency: string,
  ): Promise<boolean> => {
    if (!applePayAvailable || !customer) return false;

    try {
      // Create payment intent
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

      const { clientSecret } = await response.json();

      // Present Apple Pay
      const { error } = await presentApplePay({
        clientSecret,
        cartItems: [
          {
            label: "Subscription",
            amount: (amount / 100).toFixed(2),
            paymentType: "Immediate",
          },
        ],
        merchantCountryCode: "US",
        currencyCode: currency.toUpperCase(),
        requiredShippingAddressFields: [],
        requiredBillingContactFields: ["emailAddress", "name"],
      });

      if (error) {
        console.error("Apple Pay error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error processing Apple Pay:", error);
      return false;
    }
  };

  // Process Google Pay
  const processGooglePay = async (
    amount: number,
    currency: string,
  ): Promise<boolean> => {
    if (!googlePayAvailable || !customer) return false;

    try {
      // Create payment intent
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

      const { clientSecret } = await response.json();

      // Present Google Pay
      const { error } = await presentGooglePay({
        clientSecret,
        forSetupIntent: false,
        currencyCode: currency.toUpperCase(),
      });

      if (error) {
        console.error("Google Pay error:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error processing Google Pay:", error);
      return false;
    }
  };

  // Queue payment for offline processing
  const queuePayment = async (paymentData: any) => {
    try {
      const queuedPayments = await AsyncStorage.getItem("queued_payments");
      const payments = queuedPayments ? JSON.parse(queuedPayments) : [];
      payments.push({ ...paymentData, timestamp: Date.now() });
      await AsyncStorage.setItem("queued_payments", JSON.stringify(payments));
    } catch (error) {
      console.error("Error queuing payment:", error);
    }
  };

  // Process queued payments when online
  const processQueuedPayments = async () => {
    try {
      const queuedPayments = await AsyncStorage.getItem("queued_payments");
      if (!queuedPayments) return;

      const payments = JSON.parse(queuedPayments);
      for (const payment of payments) {
        try {
          switch (payment.action) {
            case "createCustomer":
              await createCustomer(payment.currency);
              break;
            case "createSubscription":
              await createSubscription(payment.priceId);
              break;
            // Add more payment actions as needed
          }
        } catch (error) {
          console.error(
            `Error processing queued payment ${payment.action}:`,
            error,
          );
        }
      }

      // Clear processed payments
      await AsyncStorage.removeItem("queued_payments");
    } catch (error) {
      console.error("Error processing queued payments:", error);
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
  const contextValue: NativePaymentContextType = {
    stripe,
    customer: customer || undefined,
    subscriptions,
    isLoadingCustomer,
    isLoadingSubscriptions,
    createCustomer,
    createSubscription,
    cancelSubscription,
    processPayment,
    mobilePayments: {
      applePayAvailable,
      googlePayAvailable,
      processApplePay,
      processGooglePay,
    },
    isOffline,
    queuePayment,
    processQueuedPayments,
    supportedCurrencies,
    formatAmount,
    convertAmount,
  };

  return (
    <NativePaymentContext.Provider value={contextValue}>
      {children}
    </NativePaymentContext.Provider>
  );
}

// Hook to use native payment context
export function useNativePayment(): NativePaymentContextType {
  const context = useContext(NativePaymentContext);
  if (context === undefined) {
    throw new Error(
      "useNativePayment must be used within a NativePaymentProvider",
    );
  }
  return context;
}

// Wrapper component with Stripe provider
export function NativePaymentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.error("Stripe publishable key not found");
    return <>{children}</>;
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <NativePaymentProvider>{children}</NativePaymentProvider>
    </StripeProvider>
  );
}
