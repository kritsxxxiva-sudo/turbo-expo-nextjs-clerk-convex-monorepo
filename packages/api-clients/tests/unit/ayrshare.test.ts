/**
 * Unit Tests for Ayrshare API Client
 * Comprehensive testing of social media integration functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AyrshareApiClient } from '../../src/ayrshare';

// Mock fetch globally
global.fetch = vi.fn();

describe('AyrshareApiClient', () => {
  let ayrshareClient: AyrshareApiClient;
  const mockApiKey = 'test_api_key';
  const mockFetch = fetch as vi.MockedFunction<typeof fetch>;

  beforeEach(() => {
    ayrshareClient = new AyrshareApiClient(mockApiKey);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(ayrshareClient).toBeInstanceOf(AyrshareApiClient);
    });

    it('should throw error with invalid API key', () => {
      expect(() => new AyrshareApiClient('')).toThrow(
        'Ayrshare API key is required'
      );
    });
  });

  describe('createPost', () => {
    it('should create post successfully', async () => {
      const mockResponse = {
        status: 'success',
        id: 'post_123',
        postIds: {
          facebook: 'fb_123',
          twitter: 'tw_123',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const postData = {
        post: 'Test post content',
        platforms: ['facebook', 'twitter'],
      };

      const result = await ayrshareClient.createPost(postData);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.ayrshare.com/api/post',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(postData),
        })
      );
    });

    it('should handle scheduled posts', async () => {
      const mockResponse = {
        status: 'success',
        id: 'scheduled_123',
        scheduleDate: '2024-01-01T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const postData = {
        post: 'Scheduled post content',
        platforms: ['facebook'],
        scheduleDate: '2024-01-01T12:00:00Z',
      };

      const result = await ayrshareClient.createPost(postData);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.ayrshare.com/api/post',
        expect.objectContaining({
          body: JSON.stringify(postData),
        })
      );
    });

    it('should handle posts with media', async () => {
      const mockResponse = {
        status: 'success',
        id: 'media_post_123',
        postIds: {
          instagram: 'ig_123',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const postData = {
        post: 'Post with image',
        platforms: ['instagram'],
        mediaUrls: ['https://example.com/image.jpg'],
      };

      const result = await ayrshareClient.createPost(postData);

      expect(result).toEqual(mockResponse);
    });

    it('should validate post content', async () => {
      await expect(
        ayrshareClient.createPost({
          post: '',
          platforms: ['facebook'],
        })
      ).rejects.toThrow('Post content is required');
    });

    it('should validate platforms', async () => {
      await expect(
        ayrshareClient.createPost({
          post: 'Test content',
          platforms: [],
        })
      ).rejects.toThrow('At least one platform is required');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          status: 'error',
          message: 'Invalid platform specified',
        }),
      } as Response);

      await expect(
        ayrshareClient.createPost({
          post: 'Test content',
          platforms: ['invalid_platform'],
        })
      ).rejects.toThrow('Invalid platform specified');
    });
  });

  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const mockResponse = {
        status: 'success',
        message: 'Post deleted successfully',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await ayrshareClient.deletePost('post_123');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.ayrshare.com/api/delete',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
          }),
          body: JSON.stringify({ id: 'post_123' }),
        })
      );
    });

    it('should handle post not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          status: 'error',
          message: 'Post not found',
        }),
      } as Response);

      await expect(
        ayrshareClient.deletePost('invalid_post_id')
      ).rejects.toThrow('Post not found');
    });
  });

  describe('getPost', () => {
    it('should retrieve post successfully', async () => {
      const mockPost = {
        id: 'post_123',
        post: 'Test post content',
        platforms: ['facebook', 'twitter'],
        status: 'published',
        publishedAt: '2024-01-01T12:00:00Z',
        analytics: {
          facebook: { likes: 10, shares: 5 },
          twitter: { likes: 15, retweets: 3 },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost,
      } as Response);

      const result = await ayrshareClient.getPost('post_123');

      expect(result).toEqual(mockPost);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.ayrshare.com/api/post/post_123',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
          }),
        })
      );
    });
  });

  describe('getAnalytics', () => {
    it('should retrieve analytics successfully', async () => {
      const mockAnalytics = {
        status: 'success',
        data: {
          facebook: {
            totalPosts: 50,
            totalLikes: 500,
            totalShares: 100,
            totalComments: 75,
          },
          twitter: {
            totalPosts: 30,
            totalLikes: 300,
            totalRetweets: 50,
            totalReplies: 25,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalytics,
      } as Response);

      const result = await ayrshareClient.getAnalytics({
        platforms: ['facebook', 'twitter'],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toEqual(mockAnalytics);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.ayrshare.com/api/analytics?platforms=facebook,twitter&startDate=2024-01-01&endDate=2024-01-31',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle date validation', async () => {
      await expect(
        ayrshareClient.getAnalytics({
          platforms: ['facebook'],
          startDate: '2024-01-31',
          endDate: '2024-01-01',
        })
      ).rejects.toThrow('Start date must be before end date');
    });
  });

  describe('getSocialAccounts', () => {
    it('should retrieve social accounts successfully', async () => {
      const mockAccounts = {
        status: 'success',
        accounts: [
          {
            platform: 'facebook',
            accountId: 'fb_account_123',
            accountName: 'Test Facebook Page',
            isActive: true,
            connectedAt: '2024-01-01T00:00:00Z',
          },
          {
            platform: 'twitter',
            accountId: 'tw_account_456',
            accountName: '@testaccount',
            isActive: true,
            connectedAt: '2024-01-01T00:00:00Z',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccounts,
      } as Response);

      const result = await ayrshareClient.getSocialAccounts();

      expect(result).toEqual(mockAccounts);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.ayrshare.com/api/profiles',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('validateContent', () => {
    it('should validate content for different platforms', () => {
      // Twitter validation
      const twitterResult = ayrshareClient.validateContent(
        'This is a test tweet that is within the character limit.',
        ['twitter']
      );
      expect(twitterResult.isValid).toBe(true);
      expect(twitterResult.errors).toHaveLength(0);

      // Twitter too long
      const longTweet = 'a'.repeat(281);
      const twitterLongResult = ayrshareClient.validateContent(longTweet, [
        'twitter',
      ]);
      expect(twitterLongResult.isValid).toBe(false);
      expect(twitterLongResult.errors).toContain(
        'Content exceeds Twitter character limit of 280'
      );

      // LinkedIn validation
      const linkedinResult = ayrshareClient.validateContent(
        'This is a professional LinkedIn post with appropriate content.',
        ['linkedin']
      );
      expect(linkedinResult.isValid).toBe(true);

      // Multiple platforms
      const multiResult = ayrshareClient.validateContent(
        'This content works for multiple platforms.',
        ['facebook', 'twitter', 'linkedin']
      );
      expect(multiResult.isValid).toBe(true);
    });

    it('should validate hashtags and mentions', () => {
      const contentWithManyHashtags =
        '#tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8 #tag9 #tag10 #tag11 Content';
      const result = ayrshareClient.validateContent(contentWithManyHashtags, [
        'twitter',
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Too many hashtags for Twitter. Maximum: 10'
      );
    });

    it('should validate mentions', () => {
      const contentWithManyMentions =
        '@user1 @user2 @user3 @user4 @user5 @user6 @user7 @user8 @user9 @user10 @user11 Content';
      const result = ayrshareClient.validateContent(contentWithManyMentions, [
        'twitter',
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Too many mentions for Twitter. Maximum: 10'
      );
    });
  });

  describe('getPlatformConstraints', () => {
    it('should return correct constraints for each platform', () => {
      const twitterConstraints =
        ayrshareClient.getPlatformConstraints('twitter');
      expect(twitterConstraints.maxLength).toBe(280);
      expect(twitterConstraints.maxHashtags).toBe(10);
      expect(twitterConstraints.maxMentions).toBe(10);

      const linkedinConstraints =
        ayrshareClient.getPlatformConstraints('linkedin');
      expect(linkedinConstraints.maxLength).toBe(3000);
      expect(linkedinConstraints.maxHashtags).toBe(30);

      const facebookConstraints =
        ayrshareClient.getPlatformConstraints('facebook');
      expect(facebookConstraints.maxLength).toBe(63206);
      expect(facebookConstraints.supportedMedia).toContain('image');
      expect(facebookConstraints.supportedMedia).toContain('video');
    });

    it('should return default constraints for unknown platforms', () => {
      const unknownConstraints =
        ayrshareClient.getPlatformConstraints('unknown_platform');
      expect(unknownConstraints.maxLength).toBe(1000);
      expect(unknownConstraints.maxHashtags).toBe(10);
      expect(unknownConstraints.supportedMedia).toEqual(['image']);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        ayrshareClient.createPost({
          post: 'Test content',
          platforms: ['facebook'],
        })
      ).rejects.toThrow('Network error');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          status: 'error',
          message: 'Rate limit exceeded',
        }),
      } as Response);

      await expect(
        ayrshareClient.createPost({
          post: 'Test content',
          platforms: ['facebook'],
        })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          status: 'error',
          message: 'Invalid API key',
        }),
      } as Response);

      await expect(
        ayrshareClient.createPost({
          post: 'Test content',
          platforms: ['facebook'],
        })
      ).rejects.toThrow('Invalid API key');
    });
  });

  describe('request formatting', () => {
    it('should format query parameters correctly', () => {
      const params = {
        platforms: ['facebook', 'twitter'],
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: 10,
      };

      const queryString = ayrshareClient.formatQueryParams(params);

      expect(queryString).toBe(
        'platforms=facebook,twitter&startDate=2024-01-01&endDate=2024-01-31&limit=10'
      );
    });

    it('should handle empty parameters', () => {
      const queryString = ayrshareClient.formatQueryParams({});
      expect(queryString).toBe('');
    });

    it('should handle undefined values', () => {
      const params = {
        platforms: ['facebook'],
        startDate: undefined,
        endDate: '2024-01-31',
      };

      const queryString = ayrshareClient.formatQueryParams(params);
      expect(queryString).toBe('platforms=facebook&endDate=2024-01-31');
    });
  });
});
