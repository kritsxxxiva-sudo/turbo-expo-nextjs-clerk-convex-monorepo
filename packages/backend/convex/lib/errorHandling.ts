/**
 * Error Handling and Retry Logic
 * Comprehensive error handling with intelligent retry strategies
 */

import { ConvexError } from "convex/values";

// Error types
export interface BaseError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
  retryable: boolean;
}

export interface NetworkError extends BaseError {
  statusCode?: number;
  retryAfter?: number;
}

export interface ValidationError extends BaseError {
  field: string;
  value: any;
  constraint: string;
}

export interface BusinessLogicError extends BaseError {
  operation: string;
  context?: Record<string, any>;
}

// Error classification
export function classifyError(error: any): {
  type: "network" | "validation" | "business" | "system" | "unknown";
  retryable: boolean;
  severity: "low" | "medium" | "high" | "critical";
} {
  if (error.code) {
    // Network errors
    if (error.statusCode) {
      const statusCode = error.statusCode;
      if (statusCode >= 500) {
        return { type: "network", retryable: true, severity: "high" };
      }
      if (statusCode === 429) {
        return { type: "network", retryable: true, severity: "medium" };
      }
      if (statusCode >= 400) {
        return { type: "network", retryable: false, severity: "medium" };
      }
    }

    // Validation errors
    if (error.field || error.constraint) {
      return { type: "validation", retryable: false, severity: "low" };
    }

    // Business logic errors
    if (error.operation) {
      return { type: "business", retryable: false, severity: "medium" };
    }
  }

  // System errors
  if (error.name === "ConvexError" || error.message?.includes("Convex")) {
    return { type: "system", retryable: false, severity: "high" };
  }

  // Unknown errors
  return { type: "unknown", retryable: false, severity: "medium" };
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryableErrors: string[];
}

// Default retry configurations
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  jitter: true,
  retryableErrors: ["NETWORK_ERROR", "TIMEOUT", "RATE_LIMIT", "SERVER_ERROR"],
};

export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelay: 500,
  maxDelay: 60000,
  backoffFactor: 1.5,
  jitter: true,
  retryableErrors: [
    "NETWORK_ERROR",
    "TIMEOUT",
    "RATE_LIMIT",
    "SERVER_ERROR",
    "TEMPORARY_FAILURE",
  ],
};

export const CONSERVATIVE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  baseDelay: 2000,
  maxDelay: 10000,
  backoffFactor: 3,
  jitter: false,
  retryableErrors: ["NETWORK_ERROR", "TIMEOUT"],
};

// Calculate retry delay with exponential backoff
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const exponentialDelay =
    config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

  if (config.jitter) {
    // Add random jitter to prevent thundering herd
    const jitterRange = cappedDelay * 0.1;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, cappedDelay + jitter);
  }

  return cappedDelay;
}

// Retry function with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: string,
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const classification = classifyError(error);

      // Don't retry if error is not retryable
      if (!classification.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateRetryDelay(attempt, config);
      console.log(
        `Retry attempt ${attempt}/${config.maxAttempts} for ${context || "operation"} in ${delay}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Circuit breaker implementation
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeout: number = 60000, // 1 minute
    private readonly successThreshold: number = 2,
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = "half-open";
      } else {
        throw new ConvexError("Circuit breaker is open");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = "open";
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Error aggregation and reporting
export class ErrorAggregator {
  private errors: Map<
    string,
    { count: number; lastSeen: number; samples: any[] }
  > = new Map();

  addError(error: any, context?: string): void {
    const key = this.getErrorKey(error, context);
    const existing = this.errors.get(key);

    if (existing) {
      existing.count++;
      existing.lastSeen = Date.now();
      if (existing.samples.length < 5) {
        existing.samples.push(error);
      }
    } else {
      this.errors.set(key, {
        count: 1,
        lastSeen: Date.now(),
        samples: [error],
      });
    }
  }

  private getErrorKey(error: any, context?: string): string {
    const errorType = error.constructor.name || "Unknown";
    const errorCode = error.code || "NO_CODE";
    const contextKey = context || "global";
    return `${contextKey}:${errorType}:${errorCode}`;
  }

  getErrorSummary(): Array<{
    key: string;
    count: number;
    lastSeen: number;
    sample: any;
  }> {
    return Array.from(this.errors.entries()).map(([key, data]) => ({
      key,
      count: data.count,
      lastSeen: data.lastSeen,
      sample: data.samples[0],
    }));
  }

  clearOldErrors(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [key, data] of this.errors.entries()) {
      if (data.lastSeen < cutoff) {
        this.errors.delete(key);
      }
    }
  }
}

// Global error aggregator instance
export const globalErrorAggregator = new ErrorAggregator();

// Error factory functions
export function createNetworkError(
  message: string,
  statusCode?: number,
  retryAfter?: number,
): NetworkError {
  return {
    code: "NETWORK_ERROR",
    message,
    statusCode,
    retryAfter,
    timestamp: Date.now(),
    retryable: statusCode ? statusCode >= 500 || statusCode === 429 : true,
  };
}

export function createValidationError(
  field: string,
  value: any,
  constraint: string,
  message?: string,
): ValidationError {
  return {
    code: "VALIDATION_ERROR",
    message: message || `Validation failed for field ${field}`,
    field,
    value,
    constraint,
    timestamp: Date.now(),
    retryable: false,
  };
}

export function createBusinessLogicError(
  operation: string,
  message: string,
  context?: Record<string, any>,
): BusinessLogicError {
  return {
    code: "BUSINESS_LOGIC_ERROR",
    message,
    operation,
    context,
    timestamp: Date.now(),
    retryable: false,
  };
}

// Error handling middleware
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  config?: {
    retry?: RetryConfig;
    circuitBreaker?: CircuitBreaker;
    context?: string;
  },
) {
  return async (...args: T): Promise<R> => {
    const operation = () => fn(...args);

    try {
      if (config?.circuitBreaker) {
        return await config.circuitBreaker.execute(operation);
      }

      if (config?.retry) {
        return await retryWithBackoff(operation, config.retry, config.context);
      }

      return await operation();
    } catch (error) {
      // Log error for aggregation
      globalErrorAggregator.addError(error, config?.context);

      // Re-throw the error
      throw error;
    }
  };
}

// Graceful degradation helper
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  condition?: (error: any) => boolean,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (condition && !condition(error)) {
      throw error;
    }

    console.warn("Primary operation failed, using fallback:", error.message);
    return await fallback();
  }
}

// Timeout wrapper
export function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string,
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new ConvexError(
            timeoutMessage || `Operation timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);
    }),
  ]);
}
