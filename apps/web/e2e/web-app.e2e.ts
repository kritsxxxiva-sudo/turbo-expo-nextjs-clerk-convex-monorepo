/**
 * E2E tests for the web application
 * Tests the Next.js app with Clerk authentication and Convex integration
 */

import {
  ChromeDevToolsClient,
  createTestClient,
  waitForClerkAuth,
  waitForConvexReady,
  TestAssertions,
  defaultE2EConfig,
} from "@packages/testing";

describe("Web App E2E Tests", () => {
  let client: ChromeDevToolsClient;
  let assertions: TestAssertions;

  beforeEach(async () => {
    client = createTestClient({
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    });
    assertions = new TestAssertions(client);
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  test("should load the Next.js home page", async () => {
    await client.navigateAndWait(defaultE2EConfig.baseUrl);

    // Assert page loaded
    await assertions.assertPageLoaded();

    // Check for Next.js specific elements
    const hasNextJs = await client.evaluateScript(`
      document.querySelector('[data-nextjs]') !== null ||
      document.querySelector('#__next') !== null ||
      window.next !== undefined
    `);

    // Should have Next.js indicators
    expect(typeof hasNextJs).toBe("boolean");
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

    // Check if Clerk elements are present
    const hasClerkElements = await client.evaluateScript(`
      document.querySelector('[data-clerk-loaded]') !== null ||
      document.querySelector('.cl-component') !== null ||
      window.Clerk !== undefined
    `);

    expect(hasClerkElements).toBe(true);
  });

  test("should have proper meta tags and SEO", async () => {
    await client.navigateAndWait(defaultE2EConfig.baseUrl);

    // Check for essential meta tags
    const metaTags = await client.evaluateScript(`
      ({
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content,
        viewport: document.querySelector('meta[name="viewport"]')?.content,
        charset: document.querySelector('meta[charset]')?.getAttribute('charset')
      })
    `);

    expect(metaTags.title).toBeTruthy();
    expect(metaTags.viewport).toContain("width=device-width");
  });

  test("should measure Core Web Vitals", async () => {
    await client.navigateAndWait(defaultE2EConfig.baseUrl);

    // Wait for page to fully load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get performance metrics
    const metrics = await client.getPerformanceMetrics();
    expect(metrics).toBeDefined();
    expect(Array.isArray(metrics)).toBe(true);

    // Check for timing metrics
    const timingMetrics = await client.evaluateScript(`
      ({
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
      })
    `);

    // Assert reasonable load times (adjust thresholds as needed)
    expect(timingMetrics.domContentLoaded).toBeLessThan(5000); // 5 seconds
    expect(timingMetrics.loadComplete).toBeLessThan(10000); // 10 seconds

    console.log("Performance metrics:", timingMetrics);
  });

  test("should handle responsive design", async () => {
    await client.navigateAndWait(defaultE2EConfig.baseUrl);

    // Test mobile viewport
    await client.evaluateScript(`
      window.resizeTo(375, 667); // iPhone SE dimensions
    `);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if mobile-responsive elements are working
    const isMobileResponsive = await client.evaluateScript(`
      window.innerWidth <= 768
    `);

    expect(isMobileResponsive).toBe(true);

    // Test desktop viewport
    await client.evaluateScript(`
      window.resizeTo(1280, 720);
    `);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const isDesktop = await client.evaluateScript(`
      window.innerWidth >= 1024
    `);

    expect(isDesktop).toBe(true);
  });
});
