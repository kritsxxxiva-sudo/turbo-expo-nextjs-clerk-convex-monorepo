/**
 * Ayrshare API Client
 * Handles social media operations across 13+ platforms
 */

import { BaseApiClient, ApiClientConfig } from '../base/BaseApiClient';
import {
  SocialAccount,
  SocialPost,
  PostAnalytics,
  SocialPlatform,
  SocialPostStatus,
  MediaAttachment,
  PlatformConstraints,
  SUPPORTED_PLATFORMS,
  PLATFORM_CONSTRAINTS,
  isSupportedPlatform,
} from '@packages/types';

export interface AyrshareClientConfig extends Omit<ApiClientConfig, 'baseURL'> {
  apiKey: string;
  webhookSecret: string;
}

export interface CreatePostParams {
  content: string;
  platforms: SocialPlatform[];
  scheduledAt?: number;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  metadata?: Record<string, any>;
}

export interface ConnectAccountParams {
  platform: SocialPlatform;
  authToken: string;
  accountName?: string;
  permissions?: string[];
}

export class AyrshareClient extends BaseApiClient {
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor(config: AyrshareClientConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://app.ayrshare.com/api',
      defaultHeaders: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
  }

  public validateConfig(): boolean {
    return !!(this.apiKey && this.webhookSecret);
  }

  // Account Management
  public async connectAccount(
    params: ConnectAccountParams
  ): Promise<SocialAccount> {
    try {
      if (!isSupportedPlatform(params.platform)) {
        throw new Error(`Unsupported platform: ${params.platform}`);
      }

      const response = await this.post<any>('/profiles/connect', {
        platform: params.platform,
        authToken: params.authToken,
        accountName: params.accountName,
        permissions: params.permissions || ['read', 'write'],
      });

      return this.transformSocialAccount(response.data);
    } catch (error) {
      throw this.transformAyrshareError(error, params.platform);
    }
  }

  public async getConnectedAccounts(userId: string): Promise<SocialAccount[]> {
    try {
      const response = await this.get<any>('/profiles', {
        params: { userId },
        cache: true,
        cacheTTL: 300000, // 5 minutes
      });

      return response.data.map((account: any) =>
        this.transformSocialAccount(account)
      );
    } catch (error) {
      throw this.transformAyrshareError(error);
    }
  }

  public async disconnectAccount(
    accountId: string,
    platform: SocialPlatform
  ): Promise<void> {
    try {
      await this.delete(`/profiles/${accountId}`, {
        params: { platform },
      });
    } catch (error) {
      throw this.transformAyrshareError(error, platform);
    }
  }

  // Content Publishing
  public async createPost(params: CreatePostParams): Promise<SocialPost> {
    try {
      // Validate platforms
      for (const platform of params.platforms) {
        if (!isSupportedPlatform(platform)) {
          throw new Error(`Unsupported platform: ${platform}`);
        }
        this.validateContentForPlatform(params.content, platform);
      }

      const postData = {
        post: params.content,
        platforms: params.platforms,
        scheduleDate: params.scheduledAt
          ? new Date(params.scheduledAt).toISOString()
          : undefined,
        mediaUrls: params.mediaUrls || [],
        hashtags: params.hashtags || [],
        mentions: params.mentions || [],
        ...params.metadata,
      };

      const response = await this.post<any>('/post', postData);
      return this.transformSocialPost(response.data);
    } catch (error) {
      throw this.transformAyrshareError(error);
    }
  }

  public async getPost(postId: string): Promise<SocialPost> {
    try {
      const response = await this.get<any>(`/post/${postId}`, {
        cache: true,
        cacheTTL: 60000, // 1 minute
      });

      return this.transformSocialPost(response.data);
    } catch (error) {
      throw this.transformAyrshareError(error);
    }
  }

  public async deletePost(postId: string): Promise<void> {
    try {
      await this.delete(`/post/${postId}`);
    } catch (error) {
      throw this.transformAyrshareError(error);
    }
  }

  public async getUserPosts(
    userId: string,
    options: {
      status?: SocialPostStatus;
      platform?: SocialPlatform;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SocialPost[]> {
    try {
      const response = await this.get<any>('/posts', {
        params: {
          userId,
          status: options.status,
          platform: options.platform,
          limit: options.limit || 50,
          offset: options.offset || 0,
        },
        cache: true,
        cacheTTL: 120000, // 2 minutes
      });

      return response.data.map((post: any) => this.transformSocialPost(post));
    } catch (error) {
      throw this.transformAyrshareError(error);
    }
  }

  // Analytics
  public async getPostAnalytics(postId: string): Promise<PostAnalytics[]> {
    try {
      const response = await this.get<any>(`/analytics/post/${postId}`, {
        cache: true,
        cacheTTL: 600000, // 10 minutes
      });

      return response.data.map((analytics: any) =>
        this.transformPostAnalytics(analytics)
      );
    } catch (error) {
      throw this.transformAyrshareError(error);
    }
  }

  public async getAccountAnalytics(
    accountId: string,
    platform: SocialPlatform,
    dateRange: { start: Date; end: Date }
  ): Promise<PostAnalytics[]> {
    try {
      const response = await this.get<any>(`/analytics/account/${accountId}`, {
        params: {
          platform,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        },
        cache: true,
        cacheTTL: 1800000, // 30 minutes
      });

      return response.data.map((analytics: any) =>
        this.transformPostAnalytics(analytics)
      );
    } catch (error) {
      throw this.transformAyrshareError(error, platform);
    }
  }

  // Media Management
  public async uploadMedia(
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<MediaAttachment> {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([file], { type: mimeType }), filename);

      const response = await this.post<any>('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return this.transformMediaAttachment(response.data);
    } catch (error) {
      throw this.transformAyrshareError(error);
    }
  }

  // Webhook Processing
  public verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      // Implement webhook signature verification logic
      // This would typically involve HMAC verification
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }

  // Platform Utilities
  public getSupportedPlatforms(): SocialPlatform[] {
    return [...SUPPORTED_PLATFORMS];
  }

  public getPlatformConstraints(
    platform: SocialPlatform
  ): PlatformConstraints | undefined {
    return PLATFORM_CONSTRAINTS[platform];
  }

  public validateContentForPlatform(
    content: string,
    platform: SocialPlatform
  ): void {
    const constraints = this.getPlatformConstraints(platform);
    if (!constraints) {
      return; // No constraints defined
    }

    if (content.length > constraints.maxTextLength) {
      throw new Error(
        `Content exceeds ${platform} character limit of ${constraints.maxTextLength}`
      );
    }

    // Count hashtags
    const hashtags = content.match(/#\w+/g) || [];
    if (hashtags.length > constraints.maxHashtags) {
      throw new Error(
        `Too many hashtags for ${platform}. Maximum: ${constraints.maxHashtags}`
      );
    }

    // Count mentions
    const mentions = content.match(/@\w+/g) || [];
    if (mentions.length > constraints.maxMentions) {
      throw new Error(
        `Too many mentions for ${platform}. Maximum: ${constraints.maxMentions}`
      );
    }
  }

  // Private Helper Methods
  private transformSocialAccount(data: any): SocialAccount {
    return {
      id: data.id,
      platform: data.platform,
      accountId: data.accountId,
      accountName: data.accountName,
      accountHandle: data.accountHandle,
      isActive: data.isActive !== false,
      connectedAt: data.connectedAt
        ? new Date(data.connectedAt).getTime()
        : Date.now(),
      lastUsedAt: data.lastUsedAt
        ? new Date(data.lastUsedAt).getTime()
        : undefined,
      permissions: data.permissions || [],
      metadata: data.metadata || {},
    };
  }

  private transformSocialPost(data: any): SocialPost {
    return {
      id: data.id,
      userId: data.userId,
      content: data.content || data.post,
      platforms: data.platforms || [],
      status: this.mapPostStatus(data.status),
      scheduledAt: data.scheduledAt
        ? new Date(data.scheduledAt).getTime()
        : undefined,
      publishedAt: data.publishedAt
        ? new Date(data.publishedAt).getTime()
        : undefined,
      createdAt: data.createdAt
        ? new Date(data.createdAt).getTime()
        : Date.now(),
      updatedAt: data.updatedAt
        ? new Date(data.updatedAt).getTime()
        : Date.now(),
      mediaUrls: data.mediaUrls || [],
      hashtags: data.hashtags || [],
      mentions: data.mentions || [],
      metadata: data.metadata || {},
      platformPosts: data.platformPosts || [],
    };
  }

  private transformPostAnalytics(data: any): PostAnalytics {
    return {
      postId: data.postId,
      platform: data.platform,
      impressions: data.impressions || 0,
      engagements: data.engagements || 0,
      clicks: data.clicks || 0,
      shares: data.shares || 0,
      likes: data.likes || 0,
      comments: data.comments || 0,
      saves: data.saves,
      reach: data.reach,
      videoViews: data.videoViews,
      profileVisits: data.profileVisits,
      lastUpdated: data.lastUpdated
        ? new Date(data.lastUpdated).getTime()
        : Date.now(),
    };
  }

  private transformMediaAttachment(data: any): MediaAttachment {
    return {
      id: data.id,
      type: data.type,
      url: data.url,
      filename: data.filename,
      size: data.size,
      mimeType: data.mimeType,
      dimensions: data.dimensions,
      duration: data.duration,
      altText: data.altText,
    };
  }

  private mapPostStatus(status: string): SocialPostStatus {
    const statusMap: Record<string, SocialPostStatus> = {
      draft: 'draft',
      scheduled: 'scheduled',
      publishing: 'publishing',
      published: 'published',
      failed: 'failed',
      deleted: 'deleted',
    };
    return statusMap[status] || 'draft';
  }

  private transformAyrshareError(error: any, platform?: SocialPlatform): Error {
    const message =
      error.response?.data?.message || error.message || 'Ayrshare API error';
    const platformInfo = platform ? ` [${platform}]` : '';
    return new Error(`Ayrshare Error${platformInfo}: ${message}`);
  }
}
