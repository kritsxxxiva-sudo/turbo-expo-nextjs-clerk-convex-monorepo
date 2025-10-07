/**
 * Base API Client with Caching
 * Provides common functionality for all external service API clients
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import NodeCache from 'node-cache';
import { RetryConfig, CacheConfig, RateLimitConfig } from '@packages/types';

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  retryConfig?: RetryConfig;
  cacheConfig?: CacheConfig;
  rateLimitConfig?: RateLimitConfig;
  defaultHeaders?: Record<string, string>;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RequestOptions extends AxiosRequestConfig {
  cache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  retries?: number;
  skipRateLimit?: boolean;
}

export abstract class BaseApiClient {
  protected readonly httpClient: AxiosInstance;
  private readonly cache: NodeCache;
  private readonly config: Required<ApiClientConfig>;
  private readonly requestCounts: Map<
    string,
    { count: number; resetTime: number }
  > = new Map();

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 30000,
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2,
      },
      cacheConfig: {
        ttl: 300000, // 5 minutes
        maxSize: 1000,
        strategy: 'lru',
      },
      rateLimitConfig: {
        maxRequests: 100,
        windowMs: 60000, // 1 minute
      },
      defaultHeaders: {},
      ...config,
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.defaultHeaders,
    });

    this.cache = new NodeCache({
      stdTTL: this.config.cacheConfig.ttl / 1000,
      maxKeys: this.config.cacheConfig.maxSize,
      useClones: false,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting and retry logic
    this.httpClient.interceptors.request.use(
      async config => {
        await this.checkRateLimit();
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor for error handling and caching
    this.httpClient.interceptors.response.use(
      response => response,
      async error => {
        if (this.shouldRetry(error)) {
          return this.retryRequest(error.config);
        }
        return Promise.reject(this.transformError(error));
      }
    );
  }

  protected async get<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const cacheKey =
      options.cacheKey || `GET:${url}:${JSON.stringify(options.params)}`;

    // Check cache first
    if (options.cache !== false) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const response = await this.httpClient.get<T>(url, options);

    // Cache successful responses
    if (options.cache !== false && response.status === 200) {
      this.setCache(cacheKey, response.data, options.cacheTTL);
    }

    return response.data;
  }

  protected async post<T>(
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const response = await this.httpClient.post<T>(url, data, options);
    return response.data;
  }

  protected async put<T>(
    url: string,
    data?: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const response = await this.httpClient.put<T>(url, data, options);
    return response.data;
  }

  protected async delete<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const response = await this.httpClient.delete<T>(url, options);
    return response.data;
  }

  private getFromCache<T>(key: string): T | null {
    try {
      return this.cache.get<T>(key) || null;
    } catch (error) {
      console.warn('Cache retrieval error:', error);
      return null;
    }
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    try {
      if (ttl) {
        this.cache.set(key, data, ttl / 1000);
      } else {
        this.cache.set(key, data);
      }
    } catch (error) {
      console.warn('Cache storage error:', error);
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowKey = Math.floor(
      now / this.config.rateLimitConfig.windowMs
    ).toString();

    const current = this.requestCounts.get(windowKey) || {
      count: 0,
      resetTime: now + this.config.rateLimitConfig.windowMs,
    };

    if (current.count >= this.config.rateLimitConfig.maxRequests) {
      const waitTime = current.resetTime - now;
      if (waitTime > 0) {
        await this.delay(waitTime);
      }
    }

    current.count++;
    this.requestCounts.set(windowKey, current);

    // Clean up old entries
    for (const [key, entry] of this.requestCounts.entries()) {
      if (entry.resetTime < now) {
        this.requestCounts.delete(key);
      }
    }
  }

  private shouldRetry(error: any): boolean {
    if (
      !error.config ||
      error.config.__retryCount >= this.config.retryConfig.maxAttempts
    ) {
      return false;
    }

    // Retry on network errors or 5xx status codes
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  }

  private async retryRequest(config: any): Promise<AxiosResponse> {
    config.__retryCount = (config.__retryCount || 0) + 1;

    const delay = Math.min(
      this.config.retryConfig.baseDelay *
        Math.pow(
          this.config.retryConfig.backoffFactor,
          config.__retryCount - 1
        ),
      this.config.retryConfig.maxDelay
    );

    await this.delay(delay);
    return this.httpClient.request(config);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private transformError(error: any): Error {
    if (error.response) {
      return new Error(
        `API Error: ${error.response.status} - ${error.response.data?.message || error.message}`
      );
    } else if (error.request) {
      return new Error(`Network Error: ${error.message}`);
    } else {
      return new Error(`Request Error: ${error.message}`);
    }
  }

  public clearCache(): void {
    this.cache.flushAll();
  }

  public getCacheStats(): { keys: number; hits: number; misses: number } {
    return this.cache.getStats();
  }

  public abstract validateConfig(): boolean;
}
