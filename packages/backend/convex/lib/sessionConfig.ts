/**
 * Session Timeout Configuration
 * Configurable session management with role-based timeouts
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// Session configuration types
export interface SessionConfig {
  defaultTimeout: number; // milliseconds
  maxTimeout: number; // milliseconds
  refreshThreshold: number; // milliseconds
  roleBasedTimeouts: {
    admin: number;
    premium: number;
    free: number;
  };
  securitySettings: {
    requireFreshSession: boolean;
    allowConcurrentSessions: boolean;
    maxConcurrentSessions: number;
    ipValidation: boolean;
    userAgentValidation: boolean;
  };
  autoExtension: {
    enabled: boolean;
    activityThreshold: number; // milliseconds
    maxExtensions: number;
  };
}

// Default session configuration
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  defaultTimeout: 24 * 60 * 60 * 1000, // 24 hours
  maxTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
  refreshThreshold: 60 * 60 * 1000, // 1 hour
  roleBasedTimeouts: {
    admin: 8 * 60 * 60 * 1000, // 8 hours (shorter for security)
    premium: 7 * 24 * 60 * 60 * 1000, // 7 days
    free: 24 * 60 * 60 * 1000, // 24 hours
  },
  securitySettings: {
    requireFreshSession: false,
    allowConcurrentSessions: true,
    maxConcurrentSessions: 5,
    ipValidation: false,
    userAgentValidation: false,
  },
  autoExtension: {
    enabled: true,
    activityThreshold: 30 * 60 * 1000, // 30 minutes
    maxExtensions: 10,
  },
};

// Get session configuration
export const getSessionConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    // In a real implementation, this could be stored in the database
    // and configurable per organization or environment
    return DEFAULT_SESSION_CONFIG;
  },
});

// Update session configuration
export const updateSessionConfig = internalMutation({
  args: {
    config: v.any(), // SessionConfig type
  },
  handler: async (ctx, args) => {
    // Validate configuration
    const config = args.config as SessionConfig;

    if (
      config.defaultTimeout <= 0 ||
      config.defaultTimeout > config.maxTimeout
    ) {
      throw new Error("Invalid default timeout");
    }

    if (
      config.refreshThreshold <= 0 ||
      config.refreshThreshold > config.defaultTimeout
    ) {
      throw new Error("Invalid refresh threshold");
    }

    // Validate role-based timeouts
    Object.values(config.roleBasedTimeouts).forEach((timeout) => {
      if (timeout <= 0 || timeout > config.maxTimeout) {
        throw new Error("Invalid role-based timeout");
      }
    });

    // In a real implementation, save to database
    console.log("Session configuration updated:", config);

    return true;
  },
});

// Get timeout for user role
export function getTimeoutForRole(
  role: string,
  config: SessionConfig = DEFAULT_SESSION_CONFIG,
): number {
  const roleTimeout =
    config.roleBasedTimeouts[role as keyof typeof config.roleBasedTimeouts];
  return roleTimeout || config.defaultTimeout;
}

// Check if session should be extended
export function shouldExtendSession(
  lastActiveAt: number,
  expiresAt: number,
  config: SessionConfig = DEFAULT_SESSION_CONFIG,
): boolean {
  if (!config.autoExtension.enabled) {
    return false;
  }

  const now = Date.now();
  const timeSinceActivity = now - lastActiveAt;
  const timeUntilExpiry = expiresAt - now;

  // Extend if user was recently active and session is close to expiring
  return (
    timeSinceActivity <= config.autoExtension.activityThreshold &&
    timeUntilExpiry <= config.refreshThreshold
  );
}

// Calculate session extension
export function calculateSessionExtension(
  currentExpiresAt: number,
  userRole: string,
  extensionCount: number = 0,
  config: SessionConfig = DEFAULT_SESSION_CONFIG,
): { newExpiresAt: number; canExtend: boolean } {
  if (
    !config.autoExtension.enabled ||
    extensionCount >= config.autoExtension.maxExtensions
  ) {
    return { newExpiresAt: currentExpiresAt, canExtend: false };
  }

  const roleTimeout = getTimeoutForRole(userRole, config);
  const now = Date.now();
  const newExpiresAt = Math.min(now + roleTimeout, now + config.maxTimeout);

  return { newExpiresAt, canExtend: true };
}

// Validate session security
export function validateSessionSecurity(
  sessionData: {
    ipAddress?: string;
    userAgent?: string;
    createdAt: number;
  },
  currentRequest: {
    ipAddress?: string;
    userAgent?: string;
  },
  config: SessionConfig = DEFAULT_SESSION_CONFIG,
): { valid: boolean; reason?: string } {
  // IP validation
  if (
    config.securitySettings.ipValidation &&
    sessionData.ipAddress &&
    currentRequest.ipAddress &&
    sessionData.ipAddress !== currentRequest.ipAddress
  ) {
    return { valid: false, reason: "IP address mismatch" };
  }

  // User agent validation
  if (
    config.securitySettings.userAgentValidation &&
    sessionData.userAgent &&
    currentRequest.userAgent &&
    sessionData.userAgent !== currentRequest.userAgent
  ) {
    return { valid: false, reason: "User agent mismatch" };
  }

  // Fresh session requirement
  if (config.securitySettings.requireFreshSession) {
    const sessionAge = Date.now() - sessionData.createdAt;
    const maxFreshAge = 60 * 60 * 1000; // 1 hour

    if (sessionAge > maxFreshAge) {
      return {
        valid: false,
        reason: "Session too old, fresh session required",
      };
    }
  }

  return { valid: true };
}

// Session cleanup configuration
export interface CleanupConfig {
  expiredSessionCleanup: {
    enabled: boolean;
    intervalMinutes: number;
    batchSize: number;
  };
  inactiveSessionCleanup: {
    enabled: boolean;
    inactiveThresholdDays: number;
    intervalHours: number;
  };
  auditLogRetention: {
    enabled: boolean;
    retentionDays: number;
  };
}

export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  expiredSessionCleanup: {
    enabled: true,
    intervalMinutes: 15,
    batchSize: 100,
  },
  inactiveSessionCleanup: {
    enabled: true,
    inactiveThresholdDays: 30,
    intervalHours: 24,
  },
  auditLogRetention: {
    enabled: true,
    retentionDays: 90,
  },
};

// Session monitoring configuration
export interface MonitoringConfig {
  alerting: {
    enabled: boolean;
    thresholds: {
      concurrentSessionsPerUser: number;
      failedLoginAttempts: number;
      suspiciousActivityScore: number;
    };
  };
  metrics: {
    enabled: boolean;
    trackSessionDuration: boolean;
    trackLoginPatterns: boolean;
    trackDeviceFingerprinting: boolean;
  };
  reporting: {
    enabled: boolean;
    dailyReports: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
  };
}

export const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  alerting: {
    enabled: true,
    thresholds: {
      concurrentSessionsPerUser: 10,
      failedLoginAttempts: 5,
      suspiciousActivityScore: 80,
    },
  },
  metrics: {
    enabled: true,
    trackSessionDuration: true,
    trackLoginPatterns: true,
    trackDeviceFingerprinting: false,
  },
  reporting: {
    enabled: true,
    dailyReports: false,
    weeklyReports: true,
    monthlyReports: true,
  },
};

// Advanced session features
export interface AdvancedSessionFeatures {
  deviceTrust: {
    enabled: boolean;
    trustDurationDays: number;
    requireVerificationForNewDevices: boolean;
  };
  locationTracking: {
    enabled: boolean;
    alertOnLocationChange: boolean;
    maxLocationRadius: number; // kilometers
  };
  riskAssessment: {
    enabled: boolean;
    factors: {
      newDevice: number;
      newLocation: number;
      unusualTime: number;
      multipleFailedAttempts: number;
    };
  };
}

export const DEFAULT_ADVANCED_FEATURES: AdvancedSessionFeatures = {
  deviceTrust: {
    enabled: false,
    trustDurationDays: 30,
    requireVerificationForNewDevices: true,
  },
  locationTracking: {
    enabled: false,
    alertOnLocationChange: true,
    maxLocationRadius: 100,
  },
  riskAssessment: {
    enabled: false,
    factors: {
      newDevice: 30,
      newLocation: 20,
      unusualTime: 15,
      multipleFailedAttempts: 50,
    },
  },
};

// Configuration presets for different environments
export const SESSION_CONFIG_PRESETS = {
  development: {
    ...DEFAULT_SESSION_CONFIG,
    defaultTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
    securitySettings: {
      ...DEFAULT_SESSION_CONFIG.securitySettings,
      requireFreshSession: false,
      ipValidation: false,
      userAgentValidation: false,
    },
  },

  staging: {
    ...DEFAULT_SESSION_CONFIG,
    defaultTimeout: 2 * 24 * 60 * 60 * 1000, // 2 days
    securitySettings: {
      ...DEFAULT_SESSION_CONFIG.securitySettings,
      requireFreshSession: false,
      ipValidation: true,
      userAgentValidation: false,
    },
  },

  production: {
    ...DEFAULT_SESSION_CONFIG,
    roleBasedTimeouts: {
      admin: 4 * 60 * 60 * 1000, // 4 hours
      premium: 3 * 24 * 60 * 60 * 1000, // 3 days
      free: 12 * 60 * 60 * 1000, // 12 hours
    },
    securitySettings: {
      ...DEFAULT_SESSION_CONFIG.securitySettings,
      requireFreshSession: true,
      ipValidation: true,
      userAgentValidation: true,
      maxConcurrentSessions: 3,
    },
  },

  enterprise: {
    ...DEFAULT_SESSION_CONFIG,
    roleBasedTimeouts: {
      admin: 2 * 60 * 60 * 1000, // 2 hours
      premium: 24 * 60 * 60 * 1000, // 24 hours
      free: 8 * 60 * 60 * 1000, // 8 hours
    },
    securitySettings: {
      ...DEFAULT_SESSION_CONFIG.securitySettings,
      requireFreshSession: true,
      ipValidation: true,
      userAgentValidation: true,
      maxConcurrentSessions: 2,
    },
    autoExtension: {
      enabled: false,
      activityThreshold: 0,
      maxExtensions: 0,
    },
  },
};

// Get configuration for environment
export function getConfigForEnvironment(env: string): SessionConfig {
  const preset =
    SESSION_CONFIG_PRESETS[env as keyof typeof SESSION_CONFIG_PRESETS];
  return preset || DEFAULT_SESSION_CONFIG;
}
