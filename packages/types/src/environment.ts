/**
 * Environment Variable Type Definitions
 * Comprehensive types for all environment configurations
 */

// Core Environment Configuration
export interface EnvironmentConfig {
  readonly NODE_ENV: 'development' | 'production' | 'test';
  readonly PORT?: number;
  readonly HOST?: string;
  readonly DATABASE_URL?: string;
  readonly REDIS_URL?: string;
}

// Clerk Environment Variables
export interface ClerkEnvironment {
  readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  readonly CLERK_WEBHOOK_SECRET: string;
  readonly CLERK_JWT_TEMPLATE?: string;
  readonly CLERK_API_URL?: string;
  readonly CLERK_API_VERSION?: string;
}

// Stripe Environment Variables
export interface StripeEnvironment {
  readonly NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly STRIPE_API_VERSION?: string;
  readonly STRIPE_CONNECT_WEBHOOK_SECRET?: string;
}

// Ayrshare Environment Variables
export interface AyrshareEnvironment {
  readonly AYRSHARE_API_KEY: string;
  readonly AYRSHARE_WEBHOOK_SECRET: string;
  readonly AYRSHARE_BASE_URL?: string;
  readonly AYRSHARE_TIMEOUT?: number;
}

// Convex Environment Variables
export interface ConvexEnvironment {
  readonly NEXT_PUBLIC_CONVEX_URL: string;
  readonly CONVEX_DEPLOY_KEY?: string;
  readonly CONVEX_SITE_URL?: string;
}

// Application URLs
export interface ApplicationUrls {
  readonly NEXT_PUBLIC_APP_URL: string;
  readonly NEXT_PUBLIC_API_URL?: string;
  readonly WEBHOOK_BASE_URL?: string;
}

// Security Configuration
export interface SecurityEnvironment {
  readonly JWT_SECRET?: string;
  readonly ENCRYPTION_KEY?: string;
  readonly CORS_ORIGIN?: string;
  readonly RATE_LIMIT_MAX?: number;
  readonly RATE_LIMIT_WINDOW?: number;
}

// Monitoring and Logging
export interface MonitoringEnvironment {
  readonly SENTRY_DSN?: string;
  readonly LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug';
  readonly ANALYTICS_ID?: string;
  readonly MONITORING_ENABLED?: boolean;
}

// Complete Environment Interface
export interface CompleteEnvironment
  extends EnvironmentConfig,
    ClerkEnvironment,
    StripeEnvironment,
    AyrshareEnvironment,
    ConvexEnvironment,
    ApplicationUrls,
    SecurityEnvironment,
    MonitoringEnvironment {}

// Environment Validation
export interface EnvironmentValidation {
  readonly isValid: boolean;
  readonly missingVariables: string[];
  readonly invalidVariables: string[];
  readonly warnings: string[];
}

// Type Guards and Validators
export const validateClerkEnvironment = (
  env: Partial<ClerkEnvironment>
): env is ClerkEnvironment => {
  return !!(
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    env.CLERK_SECRET_KEY &&
    env.CLERK_WEBHOOK_SECRET
  );
};

export const validateStripeEnvironment = (
  env: Partial<StripeEnvironment>
): env is StripeEnvironment => {
  return !!(
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    env.STRIPE_SECRET_KEY &&
    env.STRIPE_WEBHOOK_SECRET
  );
};

export const validateAyrshareEnvironment = (
  env: Partial<AyrshareEnvironment>
): env is AyrshareEnvironment => {
  return !!(env.AYRSHARE_API_KEY && env.AYRSHARE_WEBHOOK_SECRET);
};

export const validateConvexEnvironment = (
  env: Partial<ConvexEnvironment>
): env is ConvexEnvironment => {
  return !!env.NEXT_PUBLIC_CONVEX_URL;
};

// Required Environment Variables
export const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'CLERK_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'AYRSHARE_API_KEY',
  'AYRSHARE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_CONVEX_URL',
  'NEXT_PUBLIC_APP_URL',
] as const;

// Optional Environment Variables with Defaults
export const DEFAULT_ENV_VALUES = {
  PORT: 3000,
  HOST: '0.0.0.0',
  LOG_LEVEL: 'info',
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_WINDOW: 900000, // 15 minutes
  MONITORING_ENABLED: false,
  AYRSHARE_TIMEOUT: 30000, // 30 seconds
} as const;

// Environment-specific configurations
export const DEVELOPMENT_DEFAULTS = {
  LOG_LEVEL: 'debug',
  MONITORING_ENABLED: false,
} as const;

export const PRODUCTION_DEFAULTS = {
  LOG_LEVEL: 'warn',
  MONITORING_ENABLED: true,
} as const;

export const TEST_DEFAULTS = {
  LOG_LEVEL: 'error',
  MONITORING_ENABLED: false,
} as const;
