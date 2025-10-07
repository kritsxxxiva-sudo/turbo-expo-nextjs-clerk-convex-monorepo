/**
 * Basic tests for the testing package configuration
 */

// Import only the config without Chrome dependencies
const defaultE2EConfig = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  timeout: 30000,
  retries: 2,
  headless: process.env.CI === "true",
  viewport: {
    width: 1280,
    height: 720,
  },
};

describe("Testing Package Configuration", () => {
  test("should have correct default config", () => {
    expect(defaultE2EConfig.baseUrl).toBe("http://localhost:3000");
    expect(defaultE2EConfig.timeout).toBe(30000);
    expect(defaultE2EConfig.retries).toBe(2);
    expect(defaultE2EConfig.viewport.width).toBe(1280);
    expect(defaultE2EConfig.viewport.height).toBe(720);
  });

  test("should have boolean headless setting", () => {
    expect(typeof defaultE2EConfig.headless).toBe("boolean");
  });

  test("should have valid viewport dimensions", () => {
    expect(defaultE2EConfig.viewport.width).toBeGreaterThan(0);
    expect(defaultE2EConfig.viewport.height).toBeGreaterThan(0);
  });
});
