/**
 * Stripe Payment Type Definitions
 * Comprehensive types for Stripe integration with multi-currency support
 */

// Core Customer Types
export interface StripeCustomer {
  readonly id: string;
  readonly email: string;
  readonly name?: string;
  readonly description?: string;
  readonly currency: StripeCurrency;
  readonly defaultSource?: string;
  readonly created: number;
  readonly updated: number;
  readonly metadata: Record<string, string>;
  readonly address?: StripeAddress;
  readonly phone?: string;
  readonly shipping?: StripeShipping;
}

export interface StripeAddress {
  readonly line1?: string;
  readonly line2?: string;
  readonly city?: string;
  readonly state?: string;
  readonly postalCode?: string;
  readonly country?: string;
}

export interface StripeShipping {
  readonly address: StripeAddress;
  readonly name: string;
  readonly carrier?: string;
  readonly phone?: string;
  readonly trackingNumber?: string;
}

// Subscription Types
export interface StripeSubscription {
  readonly id: string;
  readonly customerId: string;
  readonly status: StripeSubscriptionStatus;
  readonly currentPeriodStart: number;
  readonly currentPeriodEnd: number;
  readonly priceId: string;
  readonly currency: StripeCurrency;
  readonly amount: number;
  readonly interval: StripeInterval;
  readonly intervalCount: number;
  readonly trialStart?: number;
  readonly trialEnd?: number;
  readonly canceledAt?: number;
  readonly cancelAtPeriodEnd: boolean;
  readonly created: number;
  readonly metadata: Record<string, string>;
}

export type StripeSubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

export type StripeInterval = 'day' | 'week' | 'month' | 'year';

// Payment Intent Types
export interface StripePaymentIntent {
  readonly id: string;
  readonly amount: number;
  readonly currency: StripeCurrency;
  readonly status: StripePaymentIntentStatus;
  readonly clientSecret: string;
  readonly customerId?: string;
  readonly description?: string;
  readonly receiptEmail?: string;
  readonly setupFutureUsage?: 'on_session' | 'off_session';
  readonly paymentMethod?: string;
  readonly created: number;
  readonly metadata: Record<string, string>;
}

export type StripePaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

// Currency and Pricing Types
export type StripeCurrency =
  | 'usd'
  | 'eur'
  | 'gbp'
  | 'cad'
  | 'aud'
  | 'jpy'
  | 'chf'
  | 'sek'
  | 'nok'
  | 'dkk'
  | 'pln'
  | 'czk'
  | 'huf'
  | 'bgn'
  | 'ron'
  | 'hrk'
  | 'rub'
  | 'try'
  | 'brl'
  | 'cny'
  | 'inr'
  | 'krw'
  | 'sgd'
  | 'hkd'
  | 'mxn';

export interface StripeCurrencyInfo {
  readonly code: StripeCurrency;
  readonly symbol: string;
  readonly name: string;
  readonly decimalPlaces: number;
  readonly zeroDecimalCurrency: boolean;
}

export interface StripePrice {
  readonly id: string;
  readonly currency: StripeCurrency;
  readonly unitAmount: number;
  readonly interval?: StripeInterval;
  readonly intervalCount?: number;
  readonly productId: string;
  readonly active: boolean;
  readonly metadata: Record<string, string>;
}

// Webhook Types
export interface StripeWebhookEvent {
  readonly id: string;
  readonly type: StripeWebhookEventType;
  readonly data: {
    readonly object: any;
    readonly previousAttributes?: any;
  };
  readonly created: number;
  readonly livemode: boolean;
  readonly pendingWebhooks: number;
  readonly request?: {
    readonly id: string;
    readonly idempotencyKey?: string;
  };
}

export type StripeWebhookEventType =
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.created'
  | 'invoice.finalized'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'payment_intent.created'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'payment_method.attached'
  | 'setup_intent.succeeded';

// Configuration Types
export interface StripeConfig {
  readonly secretKey: string;
  readonly publishableKey: string;
  readonly webhookSecret: string;
  readonly apiVersion?: string;
  readonly maxNetworkRetries?: number;
  readonly timeout?: number;
  readonly telemetry?: boolean;
}

export interface StripeMultiCurrencyConfig {
  readonly defaultCurrency: StripeCurrency;
  readonly supportedCurrencies: StripeCurrency[];
  readonly automaticTaxCalculation: boolean;
  readonly currencyConversion: boolean;
}

// Error Types
export interface StripeError {
  readonly type: StripeErrorType;
  readonly code?: string;
  readonly message: string;
  readonly param?: string;
  readonly statusCode?: number;
  readonly requestId?: string;
}

export type StripeErrorType =
  | 'api_error'
  | 'card_error'
  | 'idempotency_error'
  | 'invalid_request_error'
  | 'rate_limit_error'
  | 'authentication_error'
  | 'permission_error';

// Utility Types
export type StripeCustomerId = string;
export type StripeSubscriptionId = string;
export type StripePaymentIntentId = string;
export type StripePriceId = string;

// Type Guards
export const isStripeCustomer = (obj: any): obj is StripeCustomer => {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
};

export const isStripeSubscription = (obj: any): obj is StripeSubscription => {
  return (
    obj && typeof obj.id === 'string' && typeof obj.customerId === 'string'
  );
};

export const isStripeWebhookEvent = (obj: any): obj is StripeWebhookEvent => {
  return (
    obj &&
    typeof obj.type === 'string' &&
    obj.data &&
    typeof obj.created === 'number'
  );
};

export const isSupportedCurrency = (
  currency: string
): currency is StripeCurrency => {
  return SUPPORTED_CURRENCIES.includes(currency as StripeCurrency);
};

// Constants
export const SUPPORTED_CURRENCIES: StripeCurrency[] = [
  'usd',
  'eur',
  'gbp',
  'cad',
  'aud',
  'jpy',
  'chf',
  'sek',
  'nok',
  'dkk',
  'pln',
  'czk',
  'huf',
  'bgn',
  'ron',
  'hrk',
  'rub',
  'try',
  'brl',
  'cny',
  'inr',
  'krw',
  'sgd',
  'hkd',
  'mxn',
];

export const ZERO_DECIMAL_CURRENCIES: StripeCurrency[] = ['jpy', 'krw'];

export const CURRENCY_INFO: Record<StripeCurrency, StripeCurrencyInfo> = {
  usd: {
    code: 'usd',
    symbol: '$',
    name: 'US Dollar',
    decimalPlaces: 2,
    zeroDecimalCurrency: false,
  },
  eur: {
    code: 'eur',
    symbol: '€',
    name: 'Euro',
    decimalPlaces: 2,
    zeroDecimalCurrency: false,
  },
  gbp: {
    code: 'gbp',
    symbol: '£',
    name: 'British Pound',
    decimalPlaces: 2,
    zeroDecimalCurrency: false,
  },
  cad: {
    code: 'cad',
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimalPlaces: 2,
    zeroDecimalCurrency: false,
  },
  aud: {
    code: 'aud',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimalPlaces: 2,
    zeroDecimalCurrency: false,
  },
  jpy: {
    code: 'jpy',
    symbol: '¥',
    name: 'Japanese Yen',
    decimalPlaces: 0,
    zeroDecimalCurrency: true,
  },
  // Add more as needed...
} as const;
