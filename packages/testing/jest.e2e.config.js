module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/e2e"],
  testMatch: ["**/e2e/**/*.ts", "**/?(*.)+(e2e|integration).ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  testTimeout: 60000, // 60 seconds for E2E tests
  maxWorkers: 1, // Run E2E tests serially
  globalSetup: "<rootDir>/e2e/global-setup.ts",
  globalTeardown: "<rootDir>/e2e/global-teardown.ts",
};
