/**
 * Social Media Dashboard
 * Comprehensive social media management interface
 */

"use client";

import React, { useState, useEffect } from "react";
import { useAuthContext } from "../../components/auth/AuthProvider";
import { useSocial } from "../../components/social/SocialProvider";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface PostFormData {
  content: string;
  platforms: string[];
  scheduledAt?: number;
  mediaUrls: string[];
}

export default function SocialDashboard() {
  const { user, hasPermission } = useAuthContext();
  const {
    socialAccounts,
    socialPosts,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    supportedPlatforms,
    validateContent,
    isLoadingPosts,
  } = useSocial();

  const [activeTab, setActiveTab] = useState<
    "posts" | "schedule" | "analytics" | "accounts"
  >("posts");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [formData, setFormData] = useState<PostFormData>({
    content: "",
    platforms: [],
    mediaUrls: [],
  });

  // Get analytics data
  const analyticsData = useQuery(
    api.socialPosts.getPostAnalyticsSummary,
    user ? { userId: user._id, days: 30 } : "skip",
  );

  const handleCreatePost = async () => {
    if (!user || !formData.content.trim()) return;

    try {
      const validation = validateContent(
        formData.content,
        formData.platforms as any,
      );
      if (!validation.isValid) {
        alert(`Content validation failed: ${validation.errors.join(", ")}`);
        return;
      }

      await createPost({
        content: formData.content,
        platforms: formData.platforms as any,
        scheduledAt: formData.scheduledAt,
        mediaUrls: formData.mediaUrls,
      });

      setFormData({ content: "", platforms: [], mediaUrls: [] });
      setShowCreatePost(false);
      alert("Post created successfully!");
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await deletePost(postId);
      alert("Post deleted successfully!");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post. Please try again.");
    }
  };

  const handlePublishPost = async (postId: string) => {
    try {
      await publishPost(postId);
      alert("Post published successfully!");
    } catch (error) {
      console.error("Error publishing post:", error);
      alert("Failed to publish post. Please try again.");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Sign In Required
          </h1>
          <p className="text-gray-600">
            Please sign in to access the social media dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">
              Social Media Dashboard
            </h1>
            <button
              onClick={() => setShowCreatePost(true)}
              disabled={!hasPermission("social:post")}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Create Post
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Analytics Overview */}
        {analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Total Posts</h3>
              <p className="text-3xl font-bold text-blue-600">
                {analyticsData.totalPosts}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Total Views</h3>
              <p className="text-3xl font-bold text-green-600">
                {analyticsData.totalViews.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">
                Total Engagement
              </h3>
              <p className="text-3xl font-bold text-purple-600">
                {(
                  analyticsData.totalLikes +
                  analyticsData.totalShares +
                  analyticsData.totalComments
                ).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">
                Engagement Rate
              </h3>
              <p className="text-3xl font-bold text-orange-600">
                {analyticsData.averageEngagement.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "posts", label: "Posts", count: socialPosts.length },
                {
                  id: "schedule",
                  label: "Scheduled",
                  count: socialPosts.filter((p) => p.status === "scheduled")
                    .length,
                },
                { id: "analytics", label: "Analytics" },
                {
                  id: "accounts",
                  label: "Accounts",
                  count: socialAccounts.length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "posts" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Posts
                </h2>
                {isLoadingPosts ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : socialPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      No posts yet. Create your first post!
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {socialPosts.slice(0, 10).map((post) => (
                      <div
                        key={post._id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-gray-900 mb-2">{post.content}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>
                                Platforms: {post.platforms.join(", ")}
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  post.status === "published"
                                    ? "bg-green-100 text-green-800"
                                    : post.status === "scheduled"
                                      ? "bg-blue-100 text-blue-800"
                                      : post.status === "failed"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {post.status}
                              </span>
                              <span>
                                {new Date(post.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            {post.analytics && (
                              <div className="mt-2 flex space-x-4 text-sm text-gray-600">
                                <span>👁 {post.analytics.views || 0}</span>
                                <span>❤️ {post.analytics.likes || 0}</span>
                                <span>🔄 {post.analytics.shares || 0}</span>
                                <span>💬 {post.analytics.comments || 0}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {post.status === "draft" && (
                              <button
                                onClick={() => handlePublishPost(post._id)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Publish
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePost(post._id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "accounts" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Connected Accounts
                </h2>
                {socialAccounts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      No social accounts connected yet.
                    </p>
                    <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                      Connect Account
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {socialAccounts.map((account) => (
                      <div
                        key={account._id}
                        className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-4">
                          {account.profileImageUrl && (
                            <img
                              src={account.profileImageUrl}
                              alt={account.accountName}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {account.accountName}
                            </h3>
                            <p className="text-sm text-gray-600 capitalize">
                              {account.platform}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              account.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {account.isActive ? "Active" : "Inactive"}
                          </span>
                          <button className="text-red-600 hover:text-red-800 text-sm">
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Other tabs would be implemented similarly */}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Post
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What's on your mind?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platforms
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {supportedPlatforms.map((platform) => (
                    <label key={platform} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.platforms.includes(platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData((prev) => ({
                              ...prev,
                              platforms: [...prev.platforms, platform],
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              platforms: prev.platforms.filter(
                                (p) => p !== platform,
                              ),
                            }));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {platform}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowCreatePost(false)}
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePost}
                  disabled={
                    !formData.content.trim() || formData.platforms.length === 0
                  }
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Create Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
