/**
 * Native Authentication Provider Component
 * React Native authentication integration with Clerk and Convex
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Authentication context types for React Native
interface NativeAuthContextType {
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

  // Native-specific features
  biometricAuth: {
    isAvailable: boolean;
    isEnabled: boolean;
    enable: () => Promise<void>;
    disable: () => Promise<void>;
    authenticate: () => Promise<boolean>;
  };

  // Offline support
  isOffline: boolean;
  syncWhenOnline: () => Promise<void>;
}

const NativeAuthContext = createContext<NativeAuthContextType | undefined>(
  undefined,
);

// Native authentication provider component
export function NativeAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
  const [isOffline, setIsOffline] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Convex mutations and queries
  const createUser = useMutation(api.users.createUser);
  const updateUser = useMutation(api.users.updateUser);
  const updateLastLogin = useMutation(api.users.updateLastLogin);
  const getUserByClerkId = useQuery(
    api.users.getUserByClerkId,
    isSignedIn && userId ? { clerkId: userId } : "skip",
  );

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricPreference();
  }, []);

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
        // Store for offline sync
        if (isOffline) {
          await storeOfflineAction("syncUser", { userId, clerkUser });
        }
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

  // Check biometric availability
  const checkBiometricAvailability = async () => {
    try {
      const { LocalAuthentication } = await import("expo-local-authentication");
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error("Error checking biometric availability:", error);
      setBiometricAvailable(false);
    }
  };

  // Load biometric preference
  const loadBiometricPreference = async () => {
    try {
      const enabled = await SecureStore.getItemAsync("biometric_enabled");
      setBiometricEnabled(enabled === "true");
    } catch (error) {
      console.error("Error loading biometric preference:", error);
    }
  };

  // Enable biometric authentication
  const enableBiometric = async () => {
    try {
      const { LocalAuthentication } = await import("expo-local-authentication");
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable biometric authentication",
        fallbackLabel: "Use passcode",
      });

      if (result.success) {
        await SecureStore.setItemAsync("biometric_enabled", "true");
        setBiometricEnabled(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error enabling biometric:", error);
      return false;
    }
  };

  // Disable biometric authentication
  const disableBiometric = async () => {
    try {
      await SecureStore.deleteItemAsync("biometric_enabled");
      setBiometricEnabled(false);
    } catch (error) {
      console.error("Error disabling biometric:", error);
    }
  };

  // Authenticate with biometrics
  const authenticateWithBiometric = async (): Promise<boolean> => {
    if (!biometricAvailable || !biometricEnabled) return false;

    try {
      const { LocalAuthentication } = await import("expo-local-authentication");
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to continue",
        fallbackLabel: "Use passcode",
      });

      return result.success;
    } catch (error) {
      console.error("Error authenticating with biometric:", error);
      return false;
    }
  };

  // Store offline actions
  const storeOfflineAction = async (action: string, data: any) => {
    try {
      const offlineActions = await AsyncStorage.getItem("offline_actions");
      const actions = offlineActions ? JSON.parse(offlineActions) : [];
      actions.push({ action, data, timestamp: Date.now() });
      await AsyncStorage.setItem("offline_actions", JSON.stringify(actions));
    } catch (error) {
      console.error("Error storing offline action:", error);
    }
  };

  // Sync offline actions when online
  const syncWhenOnline = async () => {
    try {
      const offlineActions = await AsyncStorage.getItem("offline_actions");
      if (!offlineActions) return;

      const actions = JSON.parse(offlineActions);
      for (const { action, data } of actions) {
        try {
          switch (action) {
            case "syncUser":
              // Retry user sync
              if (!getUserByClerkId) {
                await createUser({
                  clerkId: data.userId,
                  email: data.clerkUser.primaryEmailAddress?.emailAddress || "",
                  firstName: data.clerkUser.firstName || undefined,
                  lastName: data.clerkUser.lastName || undefined,
                  username: data.clerkUser.username || undefined,
                  profileImageUrl: data.clerkUser.imageUrl || undefined,
                  role: "free",
                });
              }
              break;
            case "updateProfile":
              await updateUser(data);
              break;
            // Add more offline actions as needed
          }
        } catch (error) {
          console.error(`Error syncing offline action ${action}:`, error);
        }
      }

      // Clear synced actions
      await AsyncStorage.removeItem("offline_actions");
    } catch (error) {
      console.error("Error syncing offline actions:", error);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await clerkSignOut();
      // Clear any cached data
      await AsyncStorage.multiRemove(["offline_actions", "user_preferences"]);
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
      // Store for offline sync
      if (isOffline) {
        await storeOfflineAction("updateProfile", {
          userId: getUserByClerkId._id,
          ...updates,
        });
      }
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
        "offline:sync",
      ],
      free: ["profile:edit", "social:post:limited"],
    };

    const permissions = rolePermissions[userRole || "free"] || [];
    return permissions.includes("*") || permissions.includes(permission);
  };

  // Context value
  const contextValue: NativeAuthContextType = {
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

    // Native-specific features
    biometricAuth: {
      isAvailable: biometricAvailable,
      isEnabled: biometricEnabled,
      enable: enableBiometric,
      disable: disableBiometric,
      authenticate: authenticateWithBiometric,
    },

    // Offline support
    isOffline,
    syncWhenOnline,
  };

  return (
    <NativeAuthContext.Provider value={contextValue}>
      {children}
    </NativeAuthContext.Provider>
  );
}

// Hook to use native authentication context
export function useNativeAuth(): NativeAuthContextType {
  const context = useContext(NativeAuthContext);
  if (context === undefined) {
    throw new Error("useNativeAuth must be used within a NativeAuthProvider");
  }
  return context;
}

// Higher-order component for protected screens
export function withNativeAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredRole?: string;
    requiredPermission?: string;
    requireBiometric?: boolean;
  },
) {
  return function AuthenticatedComponent(props: P) {
    const {
      isLoaded,
      isSignedIn,
      user,
      hasRole,
      hasPermission,
      biometricAuth,
    } = useNativeAuth();
    const [biometricChecked, setBiometricChecked] = useState(false);

    // Check biometric authentication if required
    useEffect(() => {
      if (
        options?.requireBiometric &&
        biometricAuth.isEnabled &&
        !biometricChecked
      ) {
        biometricAuth.authenticate().then((success) => {
          if (success) {
            setBiometricChecked(true);
          }
        });
      } else if (!options?.requireBiometric) {
        setBiometricChecked(true);
      }
    }, [biometricAuth, biometricChecked, options?.requireBiometric]);

    // Show loading state
    if (!isLoaded) {
      return null; // Or loading component
    }

    // Redirect if not signed in
    if (!isSignedIn) {
      return null; // Or redirect to sign in
    }

    // Check biometric requirement
    if (options?.requireBiometric && !biometricChecked) {
      return null; // Or biometric prompt component
    }

    // Check role requirement
    if (options?.requiredRole && !hasRole(options.requiredRole)) {
      return null; // Or access denied component
    }

    // Check permission requirement
    if (
      options?.requiredPermission &&
      !hasPermission(options.requiredPermission)
    ) {
      return null; // Or access denied component
    }

    return <Component {...props} />;
  };
}
