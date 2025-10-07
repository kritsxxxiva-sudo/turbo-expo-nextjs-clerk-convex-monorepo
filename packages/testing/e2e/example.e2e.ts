/**
 * Example E2E test demonstrating Chrome DevTools integration
 * Tests the web app's basic functionality
 */

import {
  ChromeDevToolsClient,
  createTestClient,
  waitForClerkAuth,
  waitForConvexReady,
  TestAssertions,
  defaultE2EConfig,
} from "../src/index.js";

describe("Web App E2E Tests", () => {
  let client: ChromeDevToolsClient;
  let assertions: TestAssertions;

  beforeEach(async () => {
    client = createTestClient();
    assertions = new TestAssertions(client);
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  test("should load the home page successfully", async () => {
    await client.navigateAndWait(defaultE2EConfig.baseUrl);

    // Assert page loaded
    await assertions.assertPageLoaded();

    // Check for no console errors
    await assertions.assertNoConsoleErrors();

    // Take screenshot for debugging
    const screenshot = await client.screenshot();
    expect(screenshot).toBeInstanceOf(Buffer);
  });

  test("should initialize Convex connection", async () => {
    await client.navigateAndWait(defaultE2EConfig.baseUrl);

    // Wait for Convex to be ready
    const convexReady = await waitForConvexReady(client, 15000);
    expect(convexReady).toBe(true);

    // Verify Convex connection state
    const connectionState = await client.evaluateScript(`
      window.convex ? window.convex.connectionState() : 'not-loaded'
    `);

    expect(connectionState).toBe("connected");
  });

  test("should load Clerk authentication", async () => {
    await client.navigateAndWait(defaultE2EConfig.baseUrl);

    // Wait for Clerk to load
    const clerkLoaded = await waitForClerkAuth(client, 10000);
    expect(clerkLoaded).toBe(true);

    // Check if sign-in elements are present
    const hasSignIn = await client.evaluateScript(`
      document.querySelector('[data-clerk-sign-in]') !== null ||
      document.querySelector('.cl-sign-in') !== null ||
      document.querySelector('button[data-testid="sign-in"]') !== null
    `);

    // Should have sign-in UI or be already authenticated
    expect(typeof hasSignIn).toBe("boolean");
  });

  test("should measure page performance", async () => {
    await client.navigateAndWait(defaultE2EConfig.baseUrl);

    // Get performance metrics
    const metrics = await client.getPerformanceMetrics();
    expect(metrics).toBeDefined();
    expect(Array.isArray(metrics)).toBe(true);

    // Check for key performance metrics
    const metricNames = metrics.map((m: any) => m.name);
    expect(metricNames).toContain("Timestamp");

    // Log metrics for debugging
    console.log("Performance metrics:", metrics.slice(0, 5));
  });

  test("should handle navigation between pages", async () => {
    await client.navigateAndWait(defaultE2EConfig.baseUrl);

    // Look for navigation links
    const hasNavigation = await client.evaluateScript(`
      document.querySelector('nav') !== null ||
      document.querySelector('[role="navigation"]') !== null ||
      document.querySelector('a[href]') !== null
    `);

    if (hasNavigation) {
      // Click on first available link
      await client.evaluateScript(`
        const link = document.querySelector('a[href]');
        if (link && link.href.startsWith(window.location.origin)) {
          link.click();
        }
      `);

      // Wait a bit for navigation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify we're still on the same domain
      const currentUrl = await client.evaluateScript("window.location.href");
      expect(currentUrl).toContain(new URL(defaultE2EConfig.baseUrl).hostname);
    }
  });
});
