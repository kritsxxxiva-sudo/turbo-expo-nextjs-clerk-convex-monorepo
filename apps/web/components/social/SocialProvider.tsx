/**
 * Social Media Provider Component
 * Integrates Ayrshare social media functionality
 */

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthContext } from "../auth/AuthProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// Social media platform types
export type SocialPlatform =
  | "facebook"
  | "instagram"
  | "x"
  | "linkedin"
  | "tiktok"
  | "youtube"
  | "pinterest"
  | "reddit"
  | "snapchat"
  | "telegram"
  | "threads"
  | "bluesky"
  | "google_business";

export type PostStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "failed"
  | "deleted";

// Social context types
interface SocialContextType {
  // Connected accounts
  socialAccounts: Array<{
    _id: string;
    platform: SocialPlatform;
    accountId: string;
    accountName: string;
    profileUrl?: string;
    profileImageUrl?: string;
    isActive: boolean;
    permissions: string[];
    connectedAt: number;
    lastSyncAt?: number;
  }>;

  // Posts
  socialPosts: Array<{
    _id: string;
    content: string;
    platforms: string[];
    status: PostStatus;
    scheduledAt?: number;
    publishedAt?: number;
    mediaUrls: string[];
    analytics?: {
      views?: number;
      likes?: number;
      shares?: number;
      comments?: number;
      clicks?: number;
    };
    errors?: Array<{
      platform: string;
      error: string;
      timestamp: number;
    }>;
    createdAt: number;
  }>;

  // Loading states
  isLoadingAccounts: boolean;
  isLoadingPosts: boolean;

  // Actions
  connectAccount: (platform: SocialPlatform, authData: any) => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<void>;
  createPost: (postData: {
    content: string;
    platforms: SocialPlatform[];
    scheduledAt?: number;
    mediaUrls?: string[];
  }) => Promise<string>;
  updatePost: (
    postId: string,
    updates: {
      content?: string;
      platforms?: SocialPlatform[];
      scheduledAt?: number;
    },
  ) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  publishPost: (postId: string) => Promise<void>;

  // Platform utilities
  supportedPlatforms: SocialPlatform[];
  getPlatformConstraints: (platform: SocialPlatform) => {
    maxLength: number;
    maxHashtags: number;
    maxMentions: number;
    supportedMedia: string[];
  };
  validateContent: (
    content: string,
    platforms: SocialPlatform[],
  ) => {
    isValid: boolean;
    errors: string[];
  };
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

// Social provider component
export function SocialProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useAuthContext();
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);

  // Convex mutations and queries
  const createSocialAccount = useMutation(
    api.socialAccounts.createSocialAccount,
  );
  const deactivateSocialAccount = useMutation(
    api.socialAccounts.deactivateSocialAccount,
  );
  const createSocialPost = useMutation(api.socialPosts.createSocialPost);
  const updateSocialPost = useMutation(api.socialPosts.updateSocialPost);
  const deleteSocialPost = useMutation(api.socialPosts.deleteSocialPost);
  const updatePostStatus = useMutation(api.socialPosts.updatePostStatus);

  const socialAccounts =
    useQuery(
      api.socialAccounts.getUserSocialAccounts,
      user ? { userId: user._id, activeOnly: true } : "skip",
    ) || [];

  const socialPosts =
    useQuery(
      api.socialPosts.getUserSocialPosts,
      user ? { userId: user._id, limit: 50 } : "skip",
    ) || [];

  // Connect social account
  const connectAccount = async (platform: SocialPlatform, authData: any) => {
    if (!user) throw new Error("User not authenticated");

    setIsLoadingAccounts(true);
    try {
      // Call backend API to connect account via Ayrshare
      const response = await fetch("/api/social/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          authToken: authData.accessToken,
          accountName: authData.accountName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect account");
      }

      const { account } = await response.json();

      // Create account record in Convex
      await createSocialAccount({
        userId: user._id,
        platform,
        accountId: account.accountId,
        accountName: account.accountName,
        profileUrl: account.profileUrl,
        profileImageUrl: account.profileImageUrl,
        accessToken: authData.accessToken, // This will be encrypted in the backend
        permissions: authData.permissions || ["read", "write"],
      });
    } catch (error) {
      console.error("Error connecting account:", error);
      throw error;
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  // Disconnect social account
  const disconnectAccount = async (accountId: string) => {
    try {
      // Call backend API to disconnect account
      const response = await fetch(`/api/social/disconnect/${accountId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect account");
      }

      // Deactivate account in Convex
      await deactivateSocialAccount({ accountId });
    } catch (error) {
      console.error("Error disconnecting account:", error);
      throw error;
    }
  };

  // Create social post
  const createPost = async (postData: {
    content: string;
    platforms: SocialPlatform[];
    scheduledAt?: number;
    mediaUrls?: string[];
  }): Promise<string> => {
    if (!user) throw new Error("User not authenticated");

    // Validate content
    const validation = validateContent(postData.content, postData.platforms);
    if (!validation.isValid) {
      throw new Error(
        `Content validation failed: ${validation.errors.join(", ")}`,
      );
    }

    setIsLoadingPosts(true);
    try {
      // Create post in Convex first
      const postId = await createSocialPost({
        userId: user._id,
        content: postData.content,
        platforms: postData.platforms,
        scheduledAt: postData.scheduledAt,
        mediaUrls: postData.mediaUrls || [],
      });

      // If not scheduled, publish immediately
      if (!postData.scheduledAt) {
        await publishPost(postId);
      }

      return postId;
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    } finally {
      setIsLoadingPosts(false);
    }
  };

  // Update social post
  const updatePost = async (
    postId: string,
    updates: {
      content?: string;
      platforms?: SocialPlatform[];
      scheduledAt?: number;
    },
  ) => {
    try {
      await updateSocialPost({
        postId,
        ...updates,
      });
    } catch (error) {
      console.error("Error updating post:", error);
      throw error;
    }
  };

  // Delete social post
  const deletePost = async (postId: string) => {
    try {
      // Call backend API to delete from social platforms
      const response = await fetch(`/api/social/posts/${postId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete post from social platforms");
      }

      // Delete post in Convex
      await deleteSocialPost({ postId });
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  };

  // Publish social post
  const publishPost = async (postId: string) => {
    try {
      // Call backend API to publish via Ayrshare
      const response = await fetch(`/api/social/posts/${postId}/publish`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to publish post");
      }

      const { ayrsharePostId } = await response.json();

      // Update post status in Convex
      await updatePostStatus({
        postId,
        status: "published",
        publishedAt: Date.now(),
        ayrsharePostId,
      });
    } catch (error) {
      console.error("Error publishing post:", error);
      throw error;
    }
  };

  // Platform utilities
  const supportedPlatforms: SocialPlatform[] = [
    "facebook",
    "instagram",
    "x",
    "linkedin",
    "tiktok",
    "youtube",
    "pinterest",
    "reddit",
    "snapchat",
    "telegram",
    "threads",
    "bluesky",
    "google_business",
  ];

  const getPlatformConstraints = (platform: SocialPlatform) => {
    const constraints: Record<SocialPlatform, any> = {
      x: {
        maxLength: 280,
        maxHashtags: 10,
        maxMentions: 10,
        supportedMedia: ["image", "video", "gif"],
      },
      linkedin: {
        maxLength: 3000,
        maxHashtags: 30,
        maxMentions: 50,
        supportedMedia: ["image", "video", "document"],
      },
      facebook: {
        maxLength: 63206,
        maxHashtags: 30,
        maxMentions: 50,
        supportedMedia: ["image", "video"],
      },
      instagram: {
        maxLength: 2200,
        maxHashtags: 30,
        maxMentions: 20,
        supportedMedia: ["image", "video"],
      },
      // Add more platform constraints
    };

    return (
      constraints[platform] || {
        maxLength: 1000,
        maxHashtags: 10,
        maxMentions: 10,
        supportedMedia: ["image"],
      }
    );
  };

  const validateContent = (content: string, platforms: SocialPlatform[]) => {
    const errors: string[] = [];

    // Check content length for each platform
    platforms.forEach((platform) => {
      const constraints = getPlatformConstraints(platform);
      if (content.length > constraints.maxLength) {
        errors.push(
          `Content exceeds ${platform} character limit of ${constraints.maxLength}`,
        );
      }

      // Count hashtags
      const hashtags = content.match(/#\w+/g) || [];
      if (hashtags.length > constraints.maxHashtags) {
        errors.push(
          `Too many hashtags for ${platform}. Maximum: ${constraints.maxHashtags}`,
        );
      }

      // Count mentions
      const mentions = content.match(/@\w+/g) || [];
      if (mentions.length > constraints.maxMentions) {
        errors.push(
          `Too many mentions for ${platform}. Maximum: ${constraints.maxMentions}`,
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Context value
  const contextValue: SocialContextType = {
    socialAccounts,
    socialPosts,
    isLoadingAccounts,
    isLoadingPosts,
    connectAccount,
    disconnectAccount,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    supportedPlatforms,
    getPlatformConstraints,
    validateContent,
  };

  return (
    <SocialContext.Provider value={contextValue}>
      {children}
    </SocialContext.Provider>
  );
}

// Hook to use social context
export function useSocial(): SocialContextType {
  const context = useContext(SocialContext);
  if (context === undefined) {
    throw new Error("useSocial must be used within a SocialProvider");
  }
  return context;
}
