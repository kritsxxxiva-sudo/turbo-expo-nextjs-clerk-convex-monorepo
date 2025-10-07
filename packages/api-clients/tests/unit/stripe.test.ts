/**
 * Unit Tests for Stripe API Client
 * Comprehensive testing of Stripe integration functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StripeApiClient } from '../../src/stripe';

// Mock fetch globally
global.fetch = vi.fn();

describe('StripeApiClient', () => {
  let stripeClient: StripeApiClient;
  const mockApiKey = 'sk_test_mock_key';
  const mockFetch = fetch as vi.MockedFunction<typeof fetch>;

  beforeEach(() => {
    stripeClient = new StripeApiClient(mockApiKey);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(stripeClient).toBeInstanceOf(StripeApiClient);
    });

    it('should throw error with invalid API key', () => {
      expect(() => new StripeApiClient('')).toThrow(
        'Stripe API key is required'
      );
    });
  });

  describe('createCustomer', () => {
    it('should create customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCustomer,
      } as Response);

      const result = await stripeClient.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(result).toEqual(mockCustomer);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/customers',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Invalid email address',
            type: 'invalid_request_error',
          },
        }),
      } as Response);

      await expect(
        stripeClient.createCustomer({ email: 'invalid-email' })
      ).rejects.toThrow('Invalid email address');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        stripeClient.createCustomer({ email: 'test@example.com' })
      ).rejects.toThrow('Network error');
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        amount: 2000,
        currency: 'usd',
        status: 'requires_payment_method',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentIntent,
      } as Response);

      const result = await stripeClient.createPaymentIntent({
        amount: 2000,
        currency: 'usd',
        customer: 'cus_test123',
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/payment_intents',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
          }),
        })
      );
    });

    it('should validate amount parameter', async () => {
      await expect(
        stripeClient.createPaymentIntent({
          amount: -100,
          currency: 'usd',
        })
      ).rejects.toThrow('Amount must be positive');
    });

    it('should validate currency parameter', async () => {
      await expect(
        stripeClient.createPaymentIntent({
          amount: 2000,
          currency: 'invalid',
        })
      ).rejects.toThrow('Invalid currency code');
    });
  });

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
        current_period_start: 1640995200,
        current_period_end: 1643673600,
        items: {
          data: [
            {
              price: {
                id: 'price_test123',
                unit_amount: 2000,
                currency: 'usd',
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscription,
      } as Response);

      const result = await stripeClient.createSubscription({
        customer: 'cus_test123',
        items: [{ price: 'price_test123' }],
      });

      expect(result).toEqual(mockSubscription);
    });

    it('should handle subscription creation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({
          error: {
            message: 'Your card was declined.',
            type: 'card_error',
            code: 'card_declined',
          },
        }),
      } as Response);

      await expect(
        stripeClient.createSubscription({
          customer: 'cus_test123',
          items: [{ price: 'price_test123' }],
        })
      ).rejects.toThrow('Your card was declined.');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const mockCanceledSubscription = {
        id: 'sub_test123',
        status: 'canceled',
        canceled_at: 1640995200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCanceledSubscription,
      } as Response);

      const result = await stripeClient.cancelSubscription(
        'sub_test123',
        false
      );

      expect(result).toEqual(mockCanceledSubscription);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/subscriptions/sub_test123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should cancel subscription at period end', async () => {
      const mockSubscription = {
        id: 'sub_test123',
        status: 'active',
        cancel_at_period_end: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscription,
      } as Response);

      const result = await stripeClient.cancelSubscription('sub_test123', true);

      expect(result).toEqual(mockSubscription);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/subscriptions/sub_test123',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('cancel_at_period_end=true'),
        })
      );
    });
  });

  describe('retrieveCustomer', () => {
    it('should retrieve customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: 'test@example.com',
        name: 'Test User',
        created: 1640995200,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCustomer,
      } as Response);

      const result = await stripeClient.retrieveCustomer('cus_test123');

      expect(result).toEqual(mockCustomer);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/customers/cus_test123',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle customer not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            message: 'No such customer: cus_invalid',
            type: 'invalid_request_error',
          },
        }),
      } as Response);

      await expect(
        stripeClient.retrieveCustomer('cus_invalid')
      ).rejects.toThrow('No such customer: cus_invalid');
    });
  });

  describe('listSubscriptions', () => {
    it('should list customer subscriptions', async () => {
      const mockSubscriptions = {
        object: 'list',
        data: [
          {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
          },
          {
            id: 'sub_test456',
            customer: 'cus_test123',
            status: 'canceled',
          },
        ],
        has_more: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      } as Response);

      const result = await stripeClient.listSubscriptions('cus_test123');

      expect(result).toEqual(mockSubscriptions);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/subscriptions?customer=cus_test123',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle pagination parameters', async () => {
      const mockSubscriptions = {
        object: 'list',
        data: [],
        has_more: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubscriptions,
      } as Response);

      await stripeClient.listSubscriptions('cus_test123', {
        limit: 10,
        starting_after: 'sub_test123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.stripe.com/v1/subscriptions?customer=cus_test123&limit=10&starting_after=sub_test123',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          'Retry-After': '5',
        }),
        json: async () => ({
          error: {
            message: 'Too many requests',
            type: 'rate_limit_error',
          },
        }),
      } as Response);

      await expect(
        stripeClient.createCustomer({ email: 'test@example.com' })
      ).rejects.toThrow('Too many requests');
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid API key provided',
            type: 'authentication_error',
          },
        }),
      } as Response);

      await expect(
        stripeClient.createCustomer({ email: 'test@example.com' })
      ).rejects.toThrow('Invalid API key provided');
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            message: 'Internal server error',
            type: 'api_error',
          },
        }),
      } as Response);

      await expect(
        stripeClient.createCustomer({ email: 'test@example.com' })
      ).rejects.toThrow('Internal server error');
    });
  });

  describe('request formatting', () => {
    it('should format form data correctly', () => {
      const data = {
        email: 'test@example.com',
        name: 'Test User',
        metadata: {
          userId: '123',
          plan: 'premium',
        },
      };

      const formData = stripeClient.formatFormData(data);

      expect(formData).toContain('email=test%40example.com');
      expect(formData).toContain('name=Test%20User');
      expect(formData).toContain('metadata[userId]=123');
      expect(formData).toContain('metadata[plan]=premium');
    });

    it('should handle nested objects', () => {
      const data = {
        billing_details: {
          address: {
            line1: '123 Main St',
            city: 'New York',
            state: 'NY',
            postal_code: '10001',
          },
        },
      };

      const formData = stripeClient.formatFormData(data);

      expect(formData).toContain(
        'billing_details[address][line1]=123%20Main%20St'
      );
      expect(formData).toContain('billing_details[address][city]=New%20York');
    });

    it('should handle arrays', () => {
      const data = {
        items: [
          { price: 'price_1', quantity: 1 },
          { price: 'price_2', quantity: 2 },
        ],
      };

      const formData = stripeClient.formatFormData(data);

      expect(formData).toContain('items[0][price]=price_1');
      expect(formData).toContain('items[0][quantity]=1');
      expect(formData).toContain('items[1][price]=price_2');
      expect(formData).toContain('items[1][quantity]=2');
    });
  });
});
