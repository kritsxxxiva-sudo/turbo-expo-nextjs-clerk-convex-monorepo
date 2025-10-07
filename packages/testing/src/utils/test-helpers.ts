import { ChromeDevToolsClient } from "../chrome/devtools-client";
import { E2ETestConfig, ConvexTestHelpers } from "../types/chrome";

/**
 * Default E2E test configuration
 */
export const defaultE2EConfig: E2ETestConfig = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  timeout: 30000,
  retries: 2,
  headless: process.env.CI === "true",
  viewport: {
    width: 1280,
    height: 720,
  },
};

/**
 * Create a Chrome DevTools client with test-optimized settings
 */
export function createTestClient(
  config: Partial<E2ETestConfig> = {},
): ChromeDevToolsClient {
  const testConfig = { ...defaultE2EConfig, ...config };

  return new ChromeDevToolsClient({
    headless: testConfig.headless,
    chromeFlags: [
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      `--window-size=${testConfig.viewport.width},${testConfig.viewport.height}`,
    ],
  });
}

/**
 * Wait for Clerk authentication to complete
 */
export async function waitForClerkAuth(
  client: ChromeDevToolsClient,
  timeout: number = 10000,
): Promise<boolean> {
  return client.waitForElement('[data-clerk-loaded="true"]', timeout);
}

/**
 * Wait for Convex to be ready
 */
export async function waitForConvexReady(
  client: ChromeDevToolsClient,
  timeout: number = 10000,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const isReady = await client.evaluateScript(`
        window.convex && window.convex.connectionState() === 'connected'
      `);

      if (isReady) {
        return true;
      }
    } catch (error) {
      // Convex might not be loaded yet
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

/**
 * Helper to test real-time updates in Convex
 */
export function createConvexTestHelpers(
  client: ChromeDevToolsClient,
): ConvexTestHelpers {
  return {
    async waitForRealtimeUpdate(
      query: string,
      timeout: number = 5000,
    ): Promise<any> {
      const startTime = Date.now();
      let lastResult: any = null;

      while (Date.now() - startTime < timeout) {
        const result = await client.evaluateScript(`
          (async () => {
            const convex = window.convex;
            if (!convex) return null;
            
            try {
              return await convex.query('${query}');
            } catch (error) {
              return { error: error.message };
            }
          })()
        `);

        if (result && JSON.stringify(result) !== JSON.stringify(lastResult)) {
          return result;
        }

        lastResult = result;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      throw new Error(`Real-time update timeout for query: ${query}`);
    },

    mockConvexFunction(functionName: string, mockData: any): void {
      // This would integrate with Convex's testing utilities
      // Implementation depends on Convex's mocking capabilities
      console.warn("Convex function mocking not yet implemented");
    },

    clearConvexMocks(): void {
      // Clear all Convex mocks
      console.warn("Convex mock clearing not yet implemented");
    },
  };
}

/**
 * Common test assertions for the monorepo
 */
export class TestAssertions {
  constructor(private client: ChromeDevToolsClient) {}

  async assertPageLoaded(expectedTitle?: string): Promise<void> {
    const title = await this.client.evaluateScript("document.title");
    if (expectedTitle && title !== expectedTitle) {
      throw new Error(`Expected page title "${expectedTitle}", got "${title}"`);
    }
  }

  async assertElementExists(selector: string): Promise<void> {
    const exists = await this.client.evaluateScript(`
      document.querySelector('${selector}') !== null
    `);

    if (!exists) {
      throw new Error(`Element not found: ${selector}`);
    }
  }

  async assertElementText(
    selector: string,
    expectedText: string,
  ): Promise<void> {
    const actualText = await this.client.evaluateScript(`
      document.querySelector('${selector}')?.textContent?.trim()
    `);

    if (actualText !== expectedText) {
      throw new Error(`Expected text "${expectedText}", got "${actualText}"`);
    }
  }

  async assertNoConsoleErrors(): Promise<void> {
    const errors = await this.client.evaluateScript(`
      window.testConsoleErrors || []
    `);

    if (errors.length > 0) {
      throw new Error(`Console errors found: ${JSON.stringify(errors)}`);
    }
  }
}
