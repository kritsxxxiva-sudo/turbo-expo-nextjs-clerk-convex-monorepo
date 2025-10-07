import { launch, LaunchedChrome } from "chrome-launcher";
import CDP from "chrome-remote-interface";
import { ChromeDevToolsConfig, DevToolsSession } from "../types/chrome";

/**
 * Chrome DevTools client for browser automation and performance testing
 * Integrates with @executeautomation/mcp-chrome-devtools
 */
export class ChromeDevToolsClient {
  private chrome: LaunchedChrome | null = null;
  private client: CDP.Client | null = null;
  private config: ChromeDevToolsConfig;

  constructor(config: Partial<ChromeDevToolsConfig> = {}) {
    this.config = {
      headless: true,
      port: 9222,
      chromeFlags: [
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
      ...config,
    };
  }

  /**
   * Launch Chrome and establish DevTools connection
   */
  async connect(): Promise<DevToolsSession> {
    try {
      // Launch Chrome
      this.chrome = await launch({
        chromeFlags: this.config.chromeFlags,
        port: this.config.port,
        handleSIGINT: false,
      });

      // Connect to DevTools
      this.client = await CDP({ port: this.config.port });

      // Enable necessary domains
      const { Page, Runtime, Network, Performance } = this.client;
      await Promise.all([
        Page.enable(),
        Runtime.enable(),
        Network.enable(),
        Performance.enable(),
      ]);

      return {
        client: this.client,
        chrome: this.chrome,
        Page,
        Runtime,
        Network,
        Performance,
      };
    } catch (error) {
      await this.disconnect();
      throw new Error(`Failed to connect to Chrome DevTools: ${error}`);
    }
  }

  /**
   * Navigate to a URL and wait for load
   */
  async navigateAndWait(url: string, timeout: number = 30000): Promise<void> {
    if (!this.client) {
      throw new Error("Chrome DevTools client not connected");
    }

    const { Page } = this.client;

    // Set up load event listener
    const loadPromise = new Promise<void>((resolve) => {
      Page.loadEventFired(() => resolve());
    });

    // Navigate to URL
    await Page.navigate({ url });

    // Wait for load with timeout
    await Promise.race([
      loadPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Navigation timeout after ${timeout}ms`)),
          timeout,
        ),
      ),
    ]);
  }

  /**
   * Execute JavaScript in the page context
   */
  async evaluateScript(expression: string): Promise<any> {
    if (!this.client) {
      throw new Error("Chrome DevTools client not connected");
    }

    const { Runtime } = this.client;
    const result = await Runtime.evaluate({ expression });

    if (result.exceptionDetails) {
      throw new Error(
        `Script execution failed: ${result.exceptionDetails.text}`,
      );
    }

    return result.result.value;
  }

  /**
   * Take a screenshot of the current page
   */
  async screenshot(
    options: { format?: "png" | "jpeg"; quality?: number } = {},
  ): Promise<Buffer> {
    if (!this.client) {
      throw new Error("Chrome DevTools client not connected");
    }

    const { Page } = this.client;
    const { data } = await Page.captureScreenshot({
      format: options.format || "png",
      quality: options.quality,
    });

    return Buffer.from(data, "base64");
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    if (!this.client) {
      throw new Error("Chrome DevTools client not connected");
    }

    const { Performance } = this.client;
    const metrics = await Performance.getMetrics();
    return metrics.metrics;
  }

  /**
   * Wait for a specific element to appear
   */
  async waitForElement(
    selector: string,
    timeout: number = 10000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const exists = await this.evaluateScript(`
        document.querySelector('${selector}') !== null
      `);

      if (exists) {
        return true;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return false;
  }

  /**
   * Disconnect from Chrome and close browser
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }

      if (this.chrome) {
        await this.chrome.kill();
        this.chrome = null;
      }
    } catch (error) {
      console.warn("Error during Chrome DevTools disconnect:", error);
    }
  }
}
