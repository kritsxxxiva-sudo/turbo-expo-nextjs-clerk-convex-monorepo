# @packages/testing

Shared testing utilities and Chrome DevTools automation for the Turbo Expo Next.js Clerk Convex Monorepo.

## Features

- 🚀 **Chrome DevTools Integration** - Automated browser testing with Chrome DevTools Protocol
- 🔧 **Convex Testing Helpers** - Utilities for testing real-time Convex functions
- 🔐 **Clerk Authentication Testing** - Helpers for testing authentication flows
- 📱 **Cross-Platform Testing** - Test utilities that work across web and native apps
- 📊 **Performance Monitoring** - Built-in performance metrics collection
- 🎯 **Type-Safe** - Full TypeScript support with proper type definitions

## Installation

This package is automatically available in the monorepo workspaces. To use it in your app:

```json
{
  "devDependencies": {
    "@packages/testing": "*"
  }
}
```

## Quick Start

### Basic Chrome DevTools Usage

```typescript
import { ChromeDevToolsClient, createTestClient } from "@packages/testing";

describe("My E2E Tests", () => {
  let client: ChromeDevToolsClient;

  beforeEach(async () => {
    client = createTestClient();
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  test("should load page", async () => {
    await client.navigateAndWait("http://localhost:3000");
    const title = await client.evaluateScript("document.title");
    expect(title).toBeTruthy();
  });
});
```

### Testing with Convex

```typescript
import { waitForConvexReady, createConvexTestHelpers } from "@packages/testing";

test("should handle real-time updates", async () => {
  await client.navigateAndWait("http://localhost:3000");

  // Wait for Convex to be ready
  await waitForConvexReady(client);

  // Test real-time updates
  const convexHelpers = createConvexTestHelpers(client);
  const result = await convexHelpers.waitForRealtimeUpdate("api.notes.list");
  expect(result).toBeDefined();
});
```

### Testing with Clerk Authentication

```typescript
import { waitForClerkAuth } from "@packages/testing";

test("should handle authentication", async () => {
  await client.navigateAndWait("http://localhost:3000");

  // Wait for Clerk to load
  const clerkLoaded = await waitForClerkAuth(client);
  expect(clerkLoaded).toBe(true);
});
```

## API Reference

### ChromeDevToolsClient

Main class for Chrome DevTools automation.

#### Methods

- `connect()` - Launch Chrome and establish DevTools connection
- `disconnect()` - Close Chrome and clean up resources
- `navigateAndWait(url, timeout?)` - Navigate to URL and wait for load
- `evaluateScript(expression)` - Execute JavaScript in page context
- `screenshot(options?)` - Take a screenshot of the current page
- `getPerformanceMetrics()` - Get performance metrics
- `waitForElement(selector, timeout?)` - Wait for element to appear

### Test Helpers

- `createTestClient(config?)` - Create optimized Chrome client for testing
- `waitForClerkAuth(client, timeout?)` - Wait for Clerk authentication to load
- `waitForConvexReady(client, timeout?)` - Wait for Convex to be connected
- `createConvexTestHelpers(client)` - Create Convex-specific test utilities

### TestAssertions

Helper class for common test assertions.

- `assertPageLoaded(expectedTitle?)` - Assert page loaded successfully
- `assertElementExists(selector)` - Assert element exists in DOM
- `assertElementText(selector, expectedText)` - Assert element has specific text
- `assertNoConsoleErrors()` - Assert no console errors occurred

## Configuration

### Default E2E Config

```typescript
const defaultE2EConfig = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  timeout: 30000,
  retries: 2,
  headless: process.env.CI === "true",
  viewport: { width: 1280, height: 720 },
};
```

### Environment Variables

- `NEXT_PUBLIC_APP_URL` - Base URL for testing (default: http://localhost:3000)
- `CI` - Set to 'true' to run in headless mode
- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key

## Scripts

### Available Commands

```bash
# Run unit tests
yarn test

# Run E2E tests
yarn test:e2e

# Start Chrome for manual testing
yarn chrome:start

# Stop Chrome processes
yarn chrome:stop

# Build the package
yarn build

# Watch mode for development
yarn dev
```

### Turbo Commands (from root)

```bash
# Run all tests across the monorepo
npm run test

# Run E2E tests across the monorepo
npm run test:e2e

# Start Chrome for manual testing
npm run test:chrome
```

## Best Practices

1. **Always clean up** - Use `beforeEach`/`afterEach` to connect/disconnect clients
2. **Run tests serially** - Chrome DevTools tests should not run in parallel
3. **Use appropriate timeouts** - Network operations may take time
4. **Test real-time features** - Leverage Convex's reactive capabilities in tests
5. **Mock external services** - Use Jest mocks for external APIs
6. **Take screenshots** - Capture screenshots for debugging failed tests

## Troubleshooting

### Chrome won't start

- Ensure no other Chrome instances are running
- Check if port 9222 is available
- Run `yarn chrome:stop` to kill existing processes

### Tests timeout

- Increase timeout values in test configuration
- Check if the app is running on the expected URL
- Verify environment variables are set correctly

### Convex connection issues

- Ensure `NEXT_PUBLIC_CONVEX_URL` is set
- Check if Convex backend is running
- Verify authentication is properly configured

## Contributing

When adding new test utilities:

1. Add them to the appropriate module in `src/`
2. Export them from `src/index.ts`
3. Add TypeScript types in `src/types/`
4. Update this README with usage examples
5. Add unit tests for the new utilities
