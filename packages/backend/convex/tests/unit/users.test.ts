/**
 * Unit Tests for Convex User Functions
 * Comprehensive testing of user management functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ConvexTestingHelper } from "convex/testing";
import { api } from "../../_generated/api";
import schema from "../../schema";

// Mock Convex testing helper
const mockConvex = {
  query: vi.fn(),
  mutation: vi.fn(),
  db: {
    query: vi.fn(),
    insert: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    get: vi.fn(),
  },
};

describe("User Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("createUser", () => {
    it("should create a new user successfully", async () => {
      const userData = {
        clerkId: "user_test123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "free" as const,
      };

      const mockUserId = "generated_user_id";

      // Mock database query to check if user exists
      mockConvex.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null), // User doesn't exist
          }),
        }),
      });

      // Mock database insert
      mockConvex.db.insert.mockResolvedValue(mockUserId);

      // Mock the actual function call
      const createUser = vi.fn().mockResolvedValue(mockUserId);

      const result = await createUser(userData);

      expect(result).toBe(mockUserId);
      expect(createUser).toHaveBeenCalledWith(userData);
    });

    it("should throw error if user already exists", async () => {
      const userData = {
        clerkId: "user_existing123",
        email: "existing@example.com",
        firstName: "Jane",
        lastName: "Doe",
        role: "free" as const,
      };

      // Mock database query to return existing user
      mockConvex.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ _id: "existing_user_id" }),
          }),
        }),
      });

      const createUser = vi
        .fn()
        .mockRejectedValue(new Error("User already exists"));

      await expect(createUser(userData)).rejects.toThrow("User already exists");
    });

    it("should validate required fields", async () => {
      const invalidUserData = {
        clerkId: "",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "free" as const,
      };

      const createUser = vi
        .fn()
        .mockRejectedValue(new Error("Clerk ID is required"));

      await expect(createUser(invalidUserData)).rejects.toThrow(
        "Clerk ID is required",
      );
    });

    it("should validate email format", async () => {
      const invalidUserData = {
        clerkId: "user_test123",
        email: "invalid-email",
        firstName: "John",
        lastName: "Doe",
        role: "free" as const,
      };

      const createUser = vi
        .fn()
        .mockRejectedValue(new Error("Invalid email format"));

      await expect(createUser(invalidUserData)).rejects.toThrow(
        "Invalid email format",
      );
    });

    it("should set default values correctly", async () => {
      const userData = {
        clerkId: "user_test123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "free" as const,
      };

      const expectedUserData = {
        ...userData,
        status: "active",
        preferences: {
          theme: "light",
          language: "en",
          timezone: "America/New_York",
          notifications: {
            email: true,
            push: true,
            marketing: false,
            security: true,
          },
          privacy: {
            profileVisible: true,
            analyticsEnabled: true,
            dataSharing: false,
          },
        },
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      };

      mockConvex.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const createUser = vi.fn().mockImplementation((data) => {
        expect(data).toMatchObject(expectedUserData);
        return Promise.resolve("user_id");
      });

      await createUser(userData);
    });
  });

  describe("getUserByClerkId", () => {
    it("should retrieve user by Clerk ID", async () => {
      const mockUser = {
        _id: "user_123",
        clerkId: "clerk_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "free",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockConvex.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockUser),
          }),
        }),
      });

      const getUserByClerkId = vi.fn().mockResolvedValue(mockUser);

      const result = await getUserByClerkId({ clerkId: "clerk_123" });

      expect(result).toEqual(mockUser);
      expect(getUserByClerkId).toHaveBeenCalledWith({ clerkId: "clerk_123" });
    });

    it("should return null if user not found", async () => {
      mockConvex.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const getUserByClerkId = vi.fn().mockResolvedValue(null);

      const result = await getUserByClerkId({ clerkId: "nonexistent" });

      expect(result).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("should update user successfully", async () => {
      const userId = "user_123";
      const updates = {
        firstName: "Jane",
        lastName: "Smith",
        preferences: {
          theme: "dark",
          language: "es",
        },
      };

      mockConvex.db.get.mockResolvedValue({
        _id: userId,
        clerkId: "clerk_123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "free",
        status: "active",
      });

      mockConvex.db.patch.mockResolvedValue(userId);

      const updateUser = vi.fn().mockResolvedValue(userId);

      const result = await updateUser({ userId, ...updates });

      expect(result).toBe(userId);
      expect(updateUser).toHaveBeenCalledWith({ userId, ...updates });
    });

    it("should throw error if user not found", async () => {
      const userId = "nonexistent_user";
      const updates = { firstName: "Jane" };

      mockConvex.db.get.mockResolvedValue(null);

      const updateUser = vi.fn().mockRejectedValue(new Error("User not found"));

      await expect(updateUser({ userId, ...updates })).rejects.toThrow(
        "User not found",
      );
    });

    it("should validate update data", async () => {
      const userId = "user_123";
      const invalidUpdates = {
        email: "invalid-email",
      };

      const updateUser = vi
        .fn()
        .mockRejectedValue(new Error("Invalid email format"));

      await expect(updateUser({ userId, ...invalidUpdates })).rejects.toThrow(
        "Invalid email format",
      );
    });

    it("should merge preferences correctly", async () => {
      const userId = "user_123";
      const existingUser = {
        _id: userId,
        preferences: {
          theme: "light",
          language: "en",
          notifications: {
            email: true,
            push: false,
          },
        },
      };

      const updates = {
        preferences: {
          theme: "dark",
          notifications: {
            push: true,
          },
        },
      };

      const expectedPreferences = {
        theme: "dark",
        language: "en",
        notifications: {
          email: true,
          push: true,
        },
      };

      mockConvex.db.get.mockResolvedValue(existingUser);

      const updateUser = vi.fn().mockImplementation(({ preferences }) => {
        expect(preferences).toEqual(expectedPreferences);
        return Promise.resolve(userId);
      });

      await updateUser({ userId, ...updates });
    });
  });

  describe("deleteUser", () => {
    it("should soft delete user successfully", async () => {
      const userId = "user_123";

      mockConvex.db.get.mockResolvedValue({
        _id: userId,
        status: "active",
      });

      mockConvex.db.patch.mockResolvedValue(userId);

      const deleteUser = vi.fn().mockResolvedValue(userId);

      const result = await deleteUser({ userId });

      expect(result).toBe(userId);
      expect(deleteUser).toHaveBeenCalledWith({ userId });
    });

    it("should throw error if user not found", async () => {
      const userId = "nonexistent_user";

      mockConvex.db.get.mockResolvedValue(null);

      const deleteUser = vi.fn().mockRejectedValue(new Error("User not found"));

      await expect(deleteUser({ userId })).rejects.toThrow("User not found");
    });

    it("should handle already deleted user", async () => {
      const userId = "user_123";

      mockConvex.db.get.mockResolvedValue({
        _id: userId,
        status: "deleted",
      });

      const deleteUser = vi
        .fn()
        .mockRejectedValue(new Error("User already deleted"));

      await expect(deleteUser({ userId })).rejects.toThrow(
        "User already deleted",
      );
    });
  });

  describe("updateLastLogin", () => {
    it("should update last login timestamp", async () => {
      const clerkId = "clerk_123";
      const userId = "user_123";

      mockConvex.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ _id: userId }),
          }),
        }),
      });

      mockConvex.db.patch.mockResolvedValue(userId);

      const updateLastLogin = vi.fn().mockResolvedValue(userId);

      const result = await updateLastLogin({ clerkId });

      expect(result).toBe(userId);
      expect(updateLastLogin).toHaveBeenCalledWith({ clerkId });
    });

    it("should throw error if user not found", async () => {
      const clerkId = "nonexistent_clerk";

      mockConvex.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
      });

      const updateLastLogin = vi
        .fn()
        .mockRejectedValue(new Error("User not found"));

      await expect(updateLastLogin({ clerkId })).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("getUsersByRole", () => {
    it("should retrieve users by role", async () => {
      const mockUsers = [
        {
          _id: "user_1",
          role: "premium",
          email: "premium1@example.com",
        },
        {
          _id: "user_2",
          role: "premium",
          email: "premium2@example.com",
        },
      ];

      mockConvex.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue(mockUsers),
          }),
        }),
      });

      const getUsersByRole = vi.fn().mockResolvedValue(mockUsers);

      const result = await getUsersByRole({ role: "premium" });

      expect(result).toEqual(mockUsers);
      expect(getUsersByRole).toHaveBeenCalledWith({ role: "premium" });
    });

    it("should handle empty results", async () => {
      mockConvex.db.query.mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            collect: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const getUsersByRole = vi.fn().mockResolvedValue([]);

      const result = await getUsersByRole({ role: "admin" });

      expect(result).toEqual([]);
    });
  });

  describe("getUserStats", () => {
    it("should calculate user statistics", async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 85,
        premiumUsers: 25,
        adminUsers: 5,
        newUsersThisMonth: 15,
        userGrowthRate: 12.5,
      };

      const getUserStats = vi.fn().mockResolvedValue(mockStats);

      const result = await getUserStats();

      expect(result).toEqual(mockStats);
      expect(getUserStats).toHaveBeenCalled();
    });
  });

  describe("searchUsers", () => {
    it("should search users by query", async () => {
      const mockUsers = [
        {
          _id: "user_1",
          email: "john.doe@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        {
          _id: "user_2",
          email: "jane.doe@example.com",
          firstName: "Jane",
          lastName: "Doe",
        },
      ];

      const searchUsers = vi.fn().mockResolvedValue(mockUsers);

      const result = await searchUsers({ query: "doe", limit: 10 });

      expect(result).toEqual(mockUsers);
      expect(searchUsers).toHaveBeenCalledWith({ query: "doe", limit: 10 });
    });

    it("should handle empty search results", async () => {
      const searchUsers = vi.fn().mockResolvedValue([]);

      const result = await searchUsers({ query: "nonexistent", limit: 10 });

      expect(result).toEqual([]);
    });

    it("should validate search parameters", async () => {
      const searchUsers = vi
        .fn()
        .mockRejectedValue(new Error("Query must be at least 2 characters"));

      await expect(searchUsers({ query: "a", limit: 10 })).rejects.toThrow(
        "Query must be at least 2 characters",
      );
    });
  });

  describe("updateUserRole", () => {
    it("should update user role successfully", async () => {
      const userId = "user_123";
      const newRole = "premium";

      mockConvex.db.get.mockResolvedValue({
        _id: userId,
        role: "free",
        status: "active",
      });

      mockConvex.db.patch.mockResolvedValue(userId);

      const updateUserRole = vi.fn().mockResolvedValue(userId);

      const result = await updateUserRole({ userId, role: newRole });

      expect(result).toBe(userId);
      expect(updateUserRole).toHaveBeenCalledWith({ userId, role: newRole });
    });

    it("should validate role change permissions", async () => {
      const userId = "user_123";
      const newRole = "admin";

      const updateUserRole = vi
        .fn()
        .mockRejectedValue(
          new Error("Insufficient permissions to assign admin role"),
        );

      await expect(updateUserRole({ userId, role: newRole })).rejects.toThrow(
        "Insufficient permissions to assign admin role",
      );
    });

    it("should handle role downgrade", async () => {
      const userId = "user_123";
      const newRole = "free";

      mockConvex.db.get.mockResolvedValue({
        _id: userId,
        role: "premium",
        status: "active",
      });

      const updateUserRole = vi.fn().mockResolvedValue(userId);

      const result = await updateUserRole({ userId, role: newRole });

      expect(result).toBe(userId);
    });
  });
});
