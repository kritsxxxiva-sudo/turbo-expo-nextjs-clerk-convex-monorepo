/**
 * Authentication Provider Component
 * Integrates Clerk authentication with Convex backend
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

// Authentication context types
interface AuthContextType {
  // Clerk auth state
  isLoaded: boolean;
  isSignedIn: boolean;
  userId?: string;
  sessionId?: string;

  // Convex user data
  user?: {
    _id: Id<"users">;
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    profileImageUrl?: string;
    role: "admin" | "premium" | "free";
    status: "active" | "suspended" | "deleted";
    preferences: any;
    createdAt: number;
    updatedAt: number;
    lastLoginAt?: number;
  };

  // Loading states
  isLoadingUser: boolean;

  // Actions
  signOut: () => Promise<void>;
  updateProfile: (updates: {
    firstName?: string;
    lastName?: string;
    username?: string;
    preferences?: any;
  }) => Promise<void>;

  // Permissions
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authentication provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    isLoaded: clerkLoaded,
    isSignedIn,
    userId,
    sessionId,
    signOut: clerkSignOut,
  } = useAuth();
  const { user: clerkUser } = useUser();
  const { isLoading: convexLoading, isAuthenticated } = useConvexAuth();

  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Convex mutations and queries
  const createUser = useMutation(api.users.createUser);
  const updateUser = useMutation(api.users.updateUser);
  const updateLastLogin = useMutation(api.users.updateLastLogin);
  const getUserByClerkId = useQuery(
    api.users.getUserByClerkId,
    isSignedIn && userId ? { clerkId: userId } : "skip",
  );

  // Sync user data with Convex backend
  useEffect(() => {
    if (!clerkLoaded || !isSignedIn || !userId || !clerkUser) return;

    const syncUser = async () => {
      setIsLoadingUser(true);

      try {
        // Check if user exists in Convex
        if (!getUserByClerkId) {
          // Create user in Convex if doesn't exist
          await createUser({
            clerkId: userId,
            email: clerkUser.primaryEmailAddress?.emailAddress || "",
            firstName: clerkUser.firstName || undefined,
            lastName: clerkUser.lastName || undefined,
            username: clerkUser.username || undefined,
            profileImageUrl: clerkUser.imageUrl || undefined,
            role: "free", // Default role
          });
        } else {
          // Update last login time
          await updateLastLogin({ clerkId: userId });
        }
      } catch (error) {
        console.error("Error syncing user:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    syncUser();
  }, [
    clerkLoaded,
    isSignedIn,
    userId,
    clerkUser,
    getUserByClerkId,
    createUser,
    updateLastLogin,
  ]);

  // Sign out function
  const signOut = async () => {
    try {
      await clerkSignOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Update profile function
  const updateProfile = async (updates: {
    firstName?: string;
    lastName?: string;
    username?: string;
    preferences?: any;
  }) => {
    if (!getUserByClerkId) return;

    try {
      await updateUser({
        userId: getUserByClerkId._id,
        ...updates,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  // Permission helpers
  const hasRole = (role: string): boolean => {
    return getUserByClerkId?.role === role;
  };

  const hasPermission = (permission: string): boolean => {
    const userRole = getUserByClerkId?.role;

    // Admin has all permissions
    if (userRole === "admin") return true;

    // Define role-based permissions
    const rolePermissions: Record<string, string[]> = {
      admin: ["*"], // All permissions
      premium: [
        "social:post",
        "social:schedule",
        "social:analytics",
        "payments:manage",
        "profile:edit",
      ],
      free: ["profile:edit", "social:post:limited"],
    };

    const permissions = rolePermissions[userRole || "free"] || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  // Context value
  const contextValue: AuthContextType = {
    // Clerk auth state
    isLoaded: clerkLoaded && !convexLoading,
    isSignedIn: isSignedIn && isAuthenticated,
    userId,
    sessionId,

    // Convex user data
    user: getUserByClerkId || undefined,

    // Loading states
    isLoadingUser,

    // Actions
    signOut,
    updateProfile,

    // Permissions
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Hook to use authentication context
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredRole?: string;
    requiredPermission?: string;
    redirectTo?: string;
  },
) {
  return function AuthenticatedComponent(props: P) {
    const { isLoaded, isSignedIn, user, hasRole, hasPermission } =
      useAuthContext();

    // Show loading state
    if (!isLoaded) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      );
    }

    // Redirect if not signed in
    if (!isSignedIn) {
      if (typeof window !== "undefined") {
        window.location.href = options?.redirectTo || "/sign-in";
      }
      return null;
    }

    // Check role requirement
    if (options?.requiredRole && !hasRole(options.requiredRole)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    // Check permission requirement
    if (
      options?.requiredPermission &&
      !hasPermission(options.requiredPermission)
    ) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access this feature.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Hook for role-based rendering
export function useRoleAccess() {
  const { hasRole, hasPermission, user } = useAuthContext();

  return {
    isAdmin: hasRole("admin"),
    isPremium: hasRole("premium") || hasRole("admin"),
    isFree: hasRole("free"),
    hasRole,
    hasPermission,
    userRole: user?.role,
  };
}

// Component for conditional rendering based on permissions
export function PermissionGate({
  children,
  role,
  permission,
  fallback,
}: {
  children: React.ReactNode;
  role?: string;
  permission?: string;
  fallback?: React.ReactNode;
}) {
  const { hasRole, hasPermission } = useAuthContext();

  const hasAccess =
    (role && hasRole(role)) || (permission && hasPermission(permission));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
