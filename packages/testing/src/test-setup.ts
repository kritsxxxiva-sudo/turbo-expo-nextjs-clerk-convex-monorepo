/**
 * Global test setup for Chrome DevTools testing
 */

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeVisible(): R;
      toHaveText(text: string): R;
      toBeAuthenticated(): R;
    }
  }
}

// Set up global test timeout
jest.setTimeout(60000);

// Global test utilities
(global as any).testUtils = {
  // Add any global test utilities here
};

// Console error tracking for tests
const originalConsoleError = console.error;
const consoleErrors: string[] = [];

console.error = (...args: any[]) => {
  consoleErrors.push(args.join(" "));
  originalConsoleError.apply(console, args);
};

// Make console errors available to tests
(global as any).getConsoleErrors = () => [...consoleErrors];
(global as any).clearConsoleErrors = () => {
  consoleErrors.length = 0;
};

// Clean up after each test
afterEach(() => {
  consoleErrors.length = 0;
});

export {};
