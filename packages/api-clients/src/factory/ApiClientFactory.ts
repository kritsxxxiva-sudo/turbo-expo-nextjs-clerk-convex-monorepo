/**
 * API Client Factory
 * Centralized factory for creating and managing API client instances
 */

import { StripeClient, StripeClientConfig } from '../stripe/StripeClient';
import {
  AyrshareClient,
  AyrshareClientConfig,
} from '../ayrshare/AyrshareClient';
import { BaseApiClient } from '../base/BaseApiClient';
import {
  EnvironmentConfig,
  ClerkEnvironment,
  StripeEnvironment,
  AyrshareEnvironment,
  validateClerkEnvironment,
  validateStripeEnvironment,
  validateAyrshareEnvironment,
} from '@packages/types';

export interface ApiClientFactoryConfig {
  environment: EnvironmentConfig &
    ClerkEnvironment &
    StripeEnvironment &
    AyrshareEnvironment;
  enableCaching?: boolean;
  enableRetries?: boolean;
  enableRateLimiting?: boolean;
}

export interface ClientInstances {
  stripe: StripeClient;
  ayrshare: AyrshareClient;
}

export class ApiClientFactory {
  private static instance: ApiClientFactory;
  private clients: Partial<ClientInstances> = {};
  private config: ApiClientFactoryConfig;

  private constructor(config: ApiClientFactoryConfig) {
    this.config = config;
    this.validateEnvironment();
  }

  public static getInstance(config?: ApiClientFactoryConfig): ApiClientFactory {
    if (!ApiClientFactory.instance) {
      if (!config) {
        throw new Error(
          'ApiClientFactory must be initialized with config on first use'
        );
      }
      ApiClientFactory.instance = new ApiClientFactory(config);
    }
    return ApiClientFactory.instance;
  }

  public static reset(): void {
    ApiClientFactory.instance = undefined as any;
  }

  // Client Getters
  public getStripeClient(): StripeClient {
    if (!this.clients.stripe) {
      this.clients.stripe = this.createStripeClient();
    }
    return this.clients.stripe;
  }

  public getAyrshareClient(): AyrshareClient {
    if (!this.clients.ayrshare) {
      this.clients.ayrshare = this.createAyrshareClient();
    }
    return this.clients.ayrshare;
  }

  public getAllClients(): ClientInstances {
    return {
      stripe: this.getStripeClient(),
      ayrshare: this.getAyrshareClient(),
    };
  }

  // Client Health Checks
  public async healthCheck(): Promise<{
    stripe: boolean;
    ayrshare: boolean;
    overall: boolean;
  }> {
    const results = {
      stripe: false,
      ayrshare: false,
      overall: false,
    };

    try {
      // Test Stripe connection
      const stripeClient = this.getStripeClient();
      results.stripe = stripeClient.validateConfig();
    } catch (error) {
      console.warn('Stripe health check failed:', error);
    }

    try {
      // Test Ayrshare connection
      const ayrshareClient = this.getAyrshareClient();
      results.ayrshare = ayrshareClient.validateConfig();
    } catch (error) {
      console.warn('Ayrshare health check failed:', error);
    }

    results.overall = results.stripe && results.ayrshare;
    return results;
  }

  // Cache Management
  public clearAllCaches(): void {
    Object.values(this.clients).forEach(client => {
      if (client && typeof client.clearCache === 'function') {
        client.clearCache();
      }
    });
  }

  public getCacheStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    Object.entries(this.clients).forEach(([name, client]) => {
      if (client && typeof client.getCacheStats === 'function') {
        stats[name] = client.getCacheStats();
      }
    });

    return stats;
  }

  // Configuration Management
  public updateConfig(newConfig: Partial<ApiClientFactoryConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Reset clients to force recreation with new config
    this.clients = {};
    this.validateEnvironment();
  }

  public getConfig(): ApiClientFactoryConfig {
    return { ...this.config };
  }

  // Private Factory Methods
  private createStripeClient(): StripeClient {
    const stripeConfig: StripeClientConfig = {
      secretKey: this.config.environment.STRIPE_SECRET_KEY,
      webhookSecret: this.config.environment.STRIPE_WEBHOOK_SECRET,
      apiVersion: this.config.environment.STRIPE_API_VERSION,
      timeout: 30000,
      retryConfig: this.config.enableRetries
        ? {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2,
          }
        : undefined,
      cacheConfig: this.config.enableCaching
        ? {
            ttl: 300000, // 5 minutes
            maxSize: 1000,
            strategy: 'lru',
          }
        : undefined,
      rateLimitConfig: this.config.enableRateLimiting
        ? {
            maxRequests: 100,
            windowMs: 60000, // 1 minute
          }
        : undefined,
    };

    return new StripeClient(stripeConfig);
  }

  private createAyrshareClient(): AyrshareClient {
    const ayrshareConfig: AyrshareClientConfig = {
      apiKey: this.config.environment.AYRSHARE_API_KEY,
      webhookSecret: this.config.environment.AYRSHARE_WEBHOOK_SECRET,
      baseURL: this.config.environment.AYRSHARE_BASE_URL,
      timeout: this.config.environment.AYRSHARE_TIMEOUT || 30000,
      retryConfig: this.config.enableRetries
        ? {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2,
          }
        : undefined,
      cacheConfig: this.config.enableCaching
        ? {
            ttl: 300000, // 5 minutes
            maxSize: 500,
            strategy: 'lru',
          }
        : undefined,
      rateLimitConfig: this.config.enableRateLimiting
        ? {
            maxRequests: 50, // Ayrshare has stricter limits
            windowMs: 60000, // 1 minute
          }
        : undefined,
    };

    return new AyrshareClient(ayrshareConfig);
  }

  // Environment Validation
  private validateEnvironment(): void {
    const env = this.config.environment;

    if (!validateStripeEnvironment(env)) {
      throw new Error('Invalid Stripe environment configuration');
    }

    if (!validateAyrshareEnvironment(env)) {
      throw new Error('Invalid Ayrshare environment configuration');
    }

    // Additional validation
    if (env.NODE_ENV === 'production') {
      this.validateProductionEnvironment();
    }
  }

  private validateProductionEnvironment(): void {
    const env = this.config.environment;

    // Ensure all required production variables are set
    const requiredProdVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'AYRSHARE_API_KEY',
      'AYRSHARE_WEBHOOK_SECRET',
    ];

    const missing = requiredProdVars.filter(
      varName => !env[varName as keyof typeof env]
    );

    if (missing.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missing.join(', ')}`
      );
    }

    // Validate key formats
    if (!env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      throw new Error('Invalid Stripe secret key format');
    }

    if (!env.AYRSHARE_API_KEY || env.AYRSHARE_API_KEY.length < 10) {
      throw new Error('Invalid Ayrshare API key format');
    }
  }

  // Utility Methods
  public static createFromEnvironment(
    environment: EnvironmentConfig &
      ClerkEnvironment &
      StripeEnvironment &
      AyrshareEnvironment,
    options: {
      enableCaching?: boolean;
      enableRetries?: boolean;
      enableRateLimiting?: boolean;
    } = {}
  ): ApiClientFactory {
    const config: ApiClientFactoryConfig = {
      environment,
      enableCaching: options.enableCaching ?? true,
      enableRetries: options.enableRetries ?? true,
      enableRateLimiting: options.enableRateLimiting ?? true,
    };

    return new ApiClientFactory(config);
  }

  public static createForTesting(
    overrides: Partial<
      EnvironmentConfig &
        ClerkEnvironment &
        StripeEnvironment &
        AyrshareEnvironment
    > = {}
  ): ApiClientFactory {
    const testEnvironment = {
      NODE_ENV: 'test' as const,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_test',
      CLERK_SECRET_KEY: 'sk_test_test',
      CLERK_WEBHOOK_SECRET: 'whsec_test',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_test',
      STRIPE_SECRET_KEY: 'sk_test_test',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      AYRSHARE_API_KEY: 'test_api_key',
      AYRSHARE_WEBHOOK_SECRET: 'test_webhook_secret',
      NEXT_PUBLIC_CONVEX_URL: 'https://test.convex.cloud',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      ...overrides,
    };

    return ApiClientFactory.createFromEnvironment(testEnvironment, {
      enableCaching: false,
      enableRetries: false,
      enableRateLimiting: false,
    });
  }
}
