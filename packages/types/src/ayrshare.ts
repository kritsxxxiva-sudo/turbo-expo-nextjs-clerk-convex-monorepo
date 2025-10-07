/**
 * Ayrshare Social Media Type Definitions
 * Comprehensive types for social media integration across 13+ platforms
 */

// Core Social Account Types
export interface SocialAccount {
  readonly id: string;
  readonly platform: SocialPlatform;
  readonly accountId: string;
  readonly accountName: string;
  readonly accountHandle?: string;
  readonly isActive: boolean;
  readonly connectedAt: number;
  readonly lastUsedAt?: number;
  readonly permissions: SocialPermission[];
  readonly metadata: Record<string, any>;
}

export type SocialPlatform =
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'pinterest'
  | 'reddit'
  | 'telegram'
  | 'discord'
  | 'mastodon'
  | 'threads'
  | 'bluesky';

export type SocialPermission =
  | 'read'
  | 'write'
  | 'delete'
  | 'analytics'
  | 'manage_account';

// Social Post Types
export interface SocialPost {
  readonly id: string;
  readonly userId: string;
  readonly content: string;
  readonly platforms: SocialPlatform[];
  readonly status: SocialPostStatus;
  readonly scheduledAt?: number;
  readonly publishedAt?: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly mediaUrls: string[];
  readonly hashtags: string[];
  readonly mentions: string[];
  readonly metadata: Record<string, any>;
  readonly platformPosts: PlatformPost[];
}

export type SocialPostStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'deleted';

export interface PlatformPost {
  readonly platform: SocialPlatform;
  readonly platformPostId?: string;
  readonly status: SocialPostStatus;
  readonly publishedAt?: number;
  readonly error?: string;
  readonly url?: string;
  readonly analytics?: PostAnalytics;
}

// Analytics Types
export interface PostAnalytics {
  readonly postId: string;
  readonly platform: SocialPlatform;
  readonly impressions: number;
  readonly engagements: number;
  readonly clicks: number;
  readonly shares: number;
  readonly likes: number;
  readonly comments: number;
  readonly saves?: number;
  readonly reach?: number;
  readonly videoViews?: number;
  readonly profileVisits?: number;
  readonly lastUpdated: number;
}

export interface AnalyticsSummary {
  readonly totalImpressions: number;
  readonly totalEngagements: number;
  readonly totalClicks: number;
  readonly totalShares: number;
  readonly totalLikes: number;
  readonly totalComments: number;
  readonly engagementRate: number;
  readonly clickThroughRate: number;
  readonly platformBreakdown: Record<SocialPlatform, PostAnalytics>;
}

// Content Scheduling Types
export interface SchedulingOptions {
  readonly scheduledAt: number;
  readonly timezone: string;
  readonly repeatSchedule?: RepeatSchedule;
  readonly autoOptimize?: boolean;
  readonly bestTimePosting?: boolean;
}

export interface RepeatSchedule {
  readonly frequency: 'daily' | 'weekly' | 'monthly';
  readonly interval: number;
  readonly endDate?: number;
  readonly maxOccurrences?: number;
}

// Media Types
export interface MediaAttachment {
  readonly id: string;
  readonly type: MediaType;
  readonly url: string;
  readonly filename: string;
  readonly size: number;
  readonly mimeType: string;
  readonly dimensions?: MediaDimensions;
  readonly duration?: number; // for videos
  readonly altText?: string;
}

export type MediaType = 'image' | 'video' | 'gif' | 'document';

export interface MediaDimensions {
  readonly width: number;
  readonly height: number;
}

// Platform-Specific Constraints
export interface PlatformConstraints {
  readonly platform: SocialPlatform;
  readonly maxTextLength: number;
  readonly maxHashtags: number;
  readonly maxMentions: number;
  readonly supportedMediaTypes: MediaType[];
  readonly maxMediaCount: number;
  readonly maxVideoSize: number; // bytes
  readonly maxImageSize: number; // bytes
  readonly requiresApproval: boolean;
}

// Webhook Types
export interface AyrshareWebhookEvent {
  readonly type: AyrshareWebhookEventType;
  readonly data: AyrshareWebhookData;
  readonly timestamp: number;
  readonly id: string;
}

export type AyrshareWebhookEventType =
  | 'post.published'
  | 'post.failed'
  | 'post.deleted'
  | 'account.connected'
  | 'account.disconnected'
  | 'analytics.updated'
  | 'quota.exceeded'
  | 'rate_limit.reached';

export interface AyrshareWebhookData {
  readonly [key: string]: any;
}

// Configuration Types
export interface AyrshareConfig {
  readonly apiKey: string;
  readonly webhookSecret: string;
  readonly baseUrl?: string;
  readonly timeout?: number;
  readonly retryAttempts?: number;
  readonly rateLimitBuffer?: number;
}

export interface ContentOptimizationConfig {
  readonly autoHashtags: boolean;
  readonly hashtagSuggestions: boolean;
  readonly contentAnalysis: boolean;
  readonly bestTimePosting: boolean;
  readonly audienceTargeting: boolean;
  readonly crossPlatformOptimization: boolean;
}

// Error Types
export interface AyrshareError {
  readonly code: string;
  readonly message: string;
  readonly platform?: SocialPlatform;
  readonly details?: Record<string, any>;
  readonly retryable: boolean;
}

export interface PlatformError {
  readonly platform: SocialPlatform;
  readonly error: AyrshareError;
  readonly timestamp: number;
}

// Utility Types
export type SocialAccountId = string;
export type SocialPostId = string;
export type PlatformPostId = string;

// Type Guards
export const isSocialAccount = (obj: any): obj is SocialAccount => {
  return obj && typeof obj.id === 'string' && typeof obj.platform === 'string';
};

export const isSocialPost = (obj: any): obj is SocialPost => {
  return obj && typeof obj.id === 'string' && typeof obj.content === 'string';
};

export const isAyrshareWebhookEvent = (
  obj: any
): obj is AyrshareWebhookEvent => {
  return (
    obj &&
    typeof obj.type === 'string' &&
    obj.data &&
    typeof obj.timestamp === 'number'
  );
};

export const isSupportedPlatform = (
  platform: string
): platform is SocialPlatform => {
  return SUPPORTED_PLATFORMS.includes(platform as SocialPlatform);
};

// Constants
export const SUPPORTED_PLATFORMS: SocialPlatform[] = [
  'twitter',
  'linkedin',
  'facebook',
  'instagram',
  'youtube',
  'tiktok',
  'pinterest',
  'reddit',
  'telegram',
  'discord',
  'mastodon',
  'threads',
  'bluesky',
];

export const PLATFORM_CONSTRAINTS: Record<SocialPlatform, PlatformConstraints> =
  {
    twitter: {
      platform: 'twitter',
      maxTextLength: 280,
      maxHashtags: 10,
      maxMentions: 10,
      supportedMediaTypes: ['image', 'video', 'gif'],
      maxMediaCount: 4,
      maxVideoSize: 512 * 1024 * 1024, // 512MB
      maxImageSize: 5 * 1024 * 1024, // 5MB
      requiresApproval: false,
    },
    linkedin: {
      platform: 'linkedin',
      maxTextLength: 3000,
      maxHashtags: 30,
      maxMentions: 50,
      supportedMediaTypes: ['image', 'video', 'document'],
      maxMediaCount: 9,
      maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
      maxImageSize: 20 * 1024 * 1024, // 20MB
      requiresApproval: false,
    },
    facebook: {
      platform: 'facebook',
      maxTextLength: 63206,
      maxHashtags: 30,
      maxMentions: 50,
      supportedMediaTypes: ['image', 'video'],
      maxMediaCount: 10,
      maxVideoSize: 10 * 1024 * 1024 * 1024, // 10GB
      maxImageSize: 4 * 1024 * 1024, // 4MB
      requiresApproval: false,
    },
    instagram: {
      platform: 'instagram',
      maxTextLength: 2200,
      maxHashtags: 30,
      maxMentions: 20,
      supportedMediaTypes: ['image', 'video'],
      maxMediaCount: 10,
      maxVideoSize: 4 * 1024 * 1024 * 1024, // 4GB
      maxImageSize: 8 * 1024 * 1024, // 8MB
      requiresApproval: false,
    },
    // Add more platform constraints as needed...
  } as Partial<Record<SocialPlatform, PlatformConstraints>>;

export const WEBHOOK_EVENTS = [
  'post.published',
  'post.failed',
  'post.deleted',
  'account.connected',
  'account.disconnected',
  'analytics.updated',
  'quota.exceeded',
  'rate_limit.reached',
] as const;
