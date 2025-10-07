/**
 * @packages/testing
 *
 * Shared testing utilities and Chrome DevTools automation for the Turbo monorepo
 * Integrates with @executeautomation/mcp-chrome-devtools
 */

// Core Chrome DevTools client
export { ChromeDevToolsClient } from "./chrome/devtools-client";

// Type definitions
export type {
  ChromeDevToolsConfig,
  DevToolsSession,
  PerformanceMetric,
  TestResult,
  E2ETestConfig,
  ConvexTestHelpers,
} from "./types/chrome";

// Test utilities and helpers
export {
  defaultE2EConfig,
  createTestClient,
  waitForClerkAuth,
  waitForConvexReady,
  createConvexTestHelpers,
  TestAssertions,
} from "./utils/test-helpers";

// Re-export commonly used testing libraries
export { launch } from "chrome-launcher";
export type { LaunchedChrome } from "chrome-launcher";
export { default as CDP } from "chrome-remote-interface";
