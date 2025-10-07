/**
 * Native Social Media Provider Component
 * React Native social media integration with mobile-specific features
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { useNativeAuth } from "../auth/AuthProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Alert, Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";

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

// Native social context types
interface NativeSocialContextType {
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

  // Mobile-specific features
  mediaCapture: {
    pickImage: () => Promise<string[]>;
    takePhoto: () => Promise<string>;
    pickVideo: () => Promise<string>;
    recordVideo: () => Promise<string>;
    uploadMedia: (uri: string) => Promise<string>;
  };

  // Offline support
  isOffline: boolean;
  queuePost: (postData: any) => Promise<void>;
  processQueuedPosts: () => Promise<void>;

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

const NativeSocialContext = createContext<NativeSocialContextType | undefined>(
  undefined,
);

// Native social provider component
export function NativeSocialProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isSignedIn } = useNativeAuth();
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

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

  // Request media permissions on mount
  useEffect(() => {
    requestMediaPermissions();
  }, []);

  // Request media permissions
  const requestMediaPermissions = async () => {
    try {
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaLibraryStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraStatus !== "granted" || mediaLibraryStatus !== "granted") {
        Alert.alert(
          "Permissions Required",
          "Camera and media library permissions are required to share photos and videos.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("Error requesting media permissions:", error);
    }
  };

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

      Alert.alert(
        "Success",
        `Successfully connected ${platform} account: ${authData.accountName}`,
      );
    } catch (error) {
      console.error("Error connecting account:", error);
      Alert.alert("Error", "Failed to connect account. Please try again.");
      throw error;
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  // Disconnect social account
  const disconnectAccount = async (accountId: string) => {
    try {
      Alert.alert(
        "Disconnect Account",
        "Are you sure you want to disconnect this account?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: async () => {
              try {
                // Call backend API to disconnect account
                const response = await fetch(
                  `/api/social/disconnect/${accountId}`,
                  {
                    method: "DELETE",
                  },
                );

                if (!response.ok) {
                  throw new Error("Failed to disconnect account");
                }

                // Deactivate account in Convex
                await deactivateSocialAccount({ accountId });
                Alert.alert("Success", "Account disconnected successfully.");
              } catch (error) {
                console.error("Error disconnecting account:", error);
                Alert.alert(
                  "Error",
                  "Failed to disconnect account. Please try again.",
                );
              }
            },
          },
        ],
      );
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
      Alert.alert("Validation Error", validation.errors.join("\n"));
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

      Alert.alert("Success", "Post created successfully!");
      return postId;
    } catch (error) {
      console.error("Error creating post:", error);
      if (isOffline) {
        await queuePost(postData);
        Alert.alert("Offline", "Post queued for when you're back online.");
      } else {
        Alert.alert("Error", "Failed to create post. Please try again.");
      }
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
      Alert.alert("Success", "Post updated successfully!");
    } catch (error) {
      console.error("Error updating post:", error);
      Alert.alert("Error", "Failed to update post. Please try again.");
      throw error;
    }
  };

  // Delete social post
  const deletePost = async (postId: string) => {
    try {
      Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
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
              Alert.alert("Success", "Post deleted successfully.");
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
        },
      ]);
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

      Alert.alert("Success", "Post published successfully!");
    } catch (error) {
      console.error("Error publishing post:", error);
      Alert.alert("Error", "Failed to publish post. Please try again.");
      throw error;
    }
  };

  // Pick image from gallery
  const pickImage = async (): Promise<string[]> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled) {
        return result.assets.map((asset) => asset.uri);
      }
      return [];
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
      return [];
    }
  };

  // Take photo with camera
  const takePhoto = async (): Promise<string> => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [1, 1],
      });

      if (!result.canceled) {
        return result.assets[0].uri;
      }
      return "";
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
      return "";
    }
  };

  // Pick video from gallery
  const pickVideo = async (): Promise<string> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });

      if (!result.canceled) {
        return result.assets[0].uri;
      }
      return "";
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Error", "Failed to pick video. Please try again.");
      return "";
    }
  };

  // Record video with camera
  const recordVideo = async (): Promise<string> => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });

      if (!result.canceled) {
        return result.assets[0].uri;
      }
      return "";
    } catch (error) {
      console.error("Error recording video:", error);
      Alert.alert("Error", "Failed to record video. Please try again.");
      return "";
    }
  };

  // Upload media to server
  const uploadMedia = async (uri: string): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "image/jpeg", // or detect from file
        name: "upload.jpg",
      } as any);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to upload media");
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error("Error uploading media:", error);
      throw error;
    }
  };

  // Queue post for offline processing
  const queuePost = async (postData: any) => {
    try {
      const queuedPosts = await AsyncStorage.getItem("queued_posts");
      const posts = queuedPosts ? JSON.parse(queuedPosts) : [];
      posts.push({ ...postData, timestamp: Date.now() });
      await AsyncStorage.setItem("queued_posts", JSON.stringify(posts));
    } catch (error) {
      console.error("Error queuing post:", error);
    }
  };

  // Process queued posts when online
  const processQueuedPosts = async () => {
    try {
      const queuedPosts = await AsyncStorage.getItem("queued_posts");
      if (!queuedPosts) return;

      const posts = JSON.parse(queuedPosts);
      for (const post of posts) {
        try {
          await createPost(post);
        } catch (error) {
          console.error(`Error processing queued post:`, error);
        }
      }

      // Clear processed posts
      await AsyncStorage.removeItem("queued_posts");
    } catch (error) {
      console.error("Error processing queued posts:", error);
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
  const contextValue: NativeSocialContextType = {
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
    mediaCapture: {
      pickImage,
      takePhoto,
      pickVideo,
      recordVideo,
      uploadMedia,
    },
    isOffline,
    queuePost,
    processQueuedPosts,
    supportedPlatforms,
    getPlatformConstraints,
    validateContent,
  };

  return (
    <NativeSocialContext.Provider value={contextValue}>
      {children}
    </NativeSocialContext.Provider>
  );
}

// Hook to use native social context
export function useNativeSocial(): NativeSocialContextType {
  const context = useContext(NativeSocialContext);
  if (context === undefined) {
    throw new Error(
      "useNativeSocial must be used within a NativeSocialProvider",
    );
  }
  return context;
}
