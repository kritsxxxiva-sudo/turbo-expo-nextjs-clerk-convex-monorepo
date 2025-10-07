/**
 * Stripe API Client
 * Handles all Stripe payment operations with multi-currency support
 */

import Stripe from 'stripe';
import { BaseApiClient, ApiClientConfig } from '../base/BaseApiClient';
import {
  StripeCustomer,
  StripeSubscription,
  StripePaymentIntent,
  StripeConfig,
  StripeCurrency,
  StripeError,
  isSupportedCurrency,
  CURRENCY_INFO,
} from '@packages/types';

export interface StripeClientConfig extends Omit<ApiClientConfig, 'baseURL'> {
  secretKey: string;
  webhookSecret: string;
  apiVersion?: string;
}

export class StripeClient extends BaseApiClient {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(config: StripeClientConfig) {
    super({
      ...config,
      baseURL: 'https://api.stripe.com',
      defaultHeaders: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.stripe = new Stripe(config.secretKey, {
      apiVersion: (config.apiVersion as any) || '2023-10-16',
      timeout: config.timeout || 30000,
      maxNetworkRetries: config.retryConfig?.maxAttempts || 3,
    });

    this.webhookSecret = config.webhookSecret;
  }

  public validateConfig(): boolean {
    return !!(this.stripe && this.webhookSecret);
  }

  // Customer Management
  public async createCustomer(params: {
    email: string;
    name?: string;
    currency?: StripeCurrency;
    metadata?: Record<string, string>;
  }): Promise<StripeCustomer> {
    try {
      const customer = await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        preferred_locales: params.currency
          ? [this.getCurrencyLocale(params.currency)]
          : undefined,
        metadata: params.metadata || {},
      });

      return this.transformCustomer(customer);
    } catch (error) {
      throw this.transformStripeError(error);
    }
  }

  public async getCustomer(customerId: string): Promise<StripeCustomer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        throw new Error('Customer has been deleted');
      }
      return this.transformCustomer(customer as Stripe.Customer);
    } catch (error) {
      throw this.transformStripeError(error);
    }
  }

  public async updateCustomer(
    customerId: string,
    updates: Partial<Pick<StripeCustomer, 'email' | 'name' | 'metadata'>>
  ): Promise<StripeCustomer> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        email: updates.email,
        name: updates.name,
        metadata: updates.metadata,
      });

      return this.transformCustomer(customer);
    } catch (error) {
      throw this.transformStripeError(error);
    }
  }

  // Subscription Management
  public async createSubscription(params: {
    customerId: string;
    priceId: string;
    currency?: StripeCurrency;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }): Promise<StripeSubscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        trial_period_days: params.trialPeriodDays,
        metadata: params.metadata || {},
        expand: ['latest_invoice.payment_intent'],
      });

      return this.transformSubscription(subscription);
    } catch (error) {
      throw this.transformStripeError(error);
    }
  }

  public async getSubscription(
    subscriptionId: string
  ): Promise<StripeSubscription> {
    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);
      return this.transformSubscription(subscription);
    } catch (error) {
      throw this.transformStripeError(error);
    }
  }

  public async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = false
  ): Promise<StripeSubscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: cancelAtPeriodEnd,
        }
      );

      return this.transformSubscription(subscription);
    } catch (error) {
      throw this.transformStripeError(error);
    }
  }

  // Payment Intent Management
  public async createPaymentIntent(params: {
    amount: number;
    currency: StripeCurrency;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<StripePaymentIntent> {
    try {
      if (!isSupportedCurrency(params.currency)) {
        throw new Error(`Unsupported currency: ${params.currency}`);
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: this.convertAmountForCurrency(params.amount, params.currency),
        currency: params.currency,
        customer: params.customerId,
        description: params.description,
        metadata: params.metadata || {},
        automatic_payment_methods: { enabled: true },
      });

      return this.transformPaymentIntent(paymentIntent);
    } catch (error) {
      throw this.transformStripeError(error);
    }
  }

  public async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<StripePaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        {
          payment_method: paymentMethodId,
        }
      );

      return this.transformPaymentIntent(paymentIntent);
    } catch (error) {
      throw this.transformStripeError(error);
    }
  }

  // Webhook Processing
  public verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  public parseWebhookEvent(payload: string, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (error) {
      throw new Error(
        `Webhook signature verification failed: ${error.message}`
      );
    }
  }

  // Multi-Currency Support
  public getSupportedCurrencies(): StripeCurrency[] {
    return Object.keys(CURRENCY_INFO) as StripeCurrency[];
  }

  public convertAmountForCurrency(
    amount: number,
    currency: StripeCurrency
  ): number {
    const currencyInfo = CURRENCY_INFO[currency];
    if (!currencyInfo) {
      throw new Error(`Currency info not found for: ${currency}`);
    }

    // For zero-decimal currencies, return amount as-is
    if (currencyInfo.zeroDecimalCurrency) {
      return amount;
    }

    // For other currencies, amount should be in smallest unit (cents)
    return Math.round(amount);
  }

  public formatAmountForDisplay(
    amount: number,
    currency: StripeCurrency
  ): string {
    const currencyInfo = CURRENCY_INFO[currency];
    if (!currencyInfo) {
      return `${amount} ${currency.toUpperCase()}`;
    }

    const displayAmount = currencyInfo.zeroDecimalCurrency
      ? amount
      : amount / Math.pow(10, currencyInfo.decimalPlaces);

    return `${currencyInfo.symbol}${displayAmount.toFixed(currencyInfo.decimalPlaces)}`;
  }

  // Private Helper Methods
  private transformCustomer(customer: Stripe.Customer): StripeCustomer {
    return {
      id: customer.id,
      email: customer.email || '',
      name: customer.name || undefined,
      currency: (customer.currency as StripeCurrency) || 'usd',
      created: customer.created * 1000,
      updated: customer.created * 1000, // Stripe doesn't provide updated timestamp
      metadata: customer.metadata,
      address: customer.address
        ? {
            line1: customer.address.line1 || undefined,
            line2: customer.address.line2 || undefined,
            city: customer.address.city || undefined,
            state: customer.address.state || undefined,
            postalCode: customer.address.postal_code || undefined,
            country: customer.address.country || undefined,
          }
        : undefined,
    };
  }

  private transformSubscription(
    subscription: Stripe.Subscription
  ): StripeSubscription {
    const price = subscription.items.data[0]?.price;

    return {
      id: subscription.id,
      customerId: subscription.customer as string,
      status: subscription.status as any,
      currentPeriodStart: subscription.current_period_start * 1000,
      currentPeriodEnd: subscription.current_period_end * 1000,
      priceId: price?.id || '',
      currency: (price?.currency as StripeCurrency) || 'usd',
      amount: price?.unit_amount || 0,
      interval: (price?.recurring?.interval as any) || 'month',
      intervalCount: price?.recurring?.interval_count || 1,
      trialStart: subscription.trial_start
        ? subscription.trial_start * 1000
        : undefined,
      trialEnd: subscription.trial_end
        ? subscription.trial_end * 1000
        : undefined,
      canceledAt: subscription.canceled_at
        ? subscription.canceled_at * 1000
        : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      created: subscription.created * 1000,
      metadata: subscription.metadata,
    };
  }

  private transformPaymentIntent(
    paymentIntent: Stripe.PaymentIntent
  ): StripePaymentIntent {
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency as StripeCurrency,
      status: paymentIntent.status as any,
      clientSecret: paymentIntent.client_secret || '',
      customerId: (paymentIntent.customer as string) || undefined,
      description: paymentIntent.description || undefined,
      created: paymentIntent.created * 1000,
      metadata: paymentIntent.metadata,
    };
  }

  private transformStripeError(error: any): Error {
    if (error.type === 'StripeError') {
      return new Error(`Stripe Error [${error.code}]: ${error.message}`);
    }
    return error;
  }

  private getCurrencyLocale(currency: StripeCurrency): string {
    const localeMap: Record<string, string> = {
      usd: 'en-US',
      eur: 'en-GB',
      gbp: 'en-GB',
      cad: 'en-CA',
      aud: 'en-AU',
      jpy: 'ja-JP',
    };
    return localeMap[currency] || 'en-US';
  }
}
