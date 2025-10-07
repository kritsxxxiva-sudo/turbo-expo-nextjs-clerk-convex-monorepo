/**
 * Global teardown for E2E tests
 * Runs once after all E2E tests complete
 */

export default async function globalTeardown(): Promise<void> {
  console.log("🧹 Cleaning up E2E test environment...");

  // Clean up any global resources
  // Kill any remaining Chrome processes
  try {
    const { execSync } = require("child_process");

    // Kill Chrome processes on different platforms
    if (process.platform === "win32") {
      execSync("taskkill /f /im chrome.exe", { stdio: "ignore" });
    } else {
      execSync("pkill -f chrome", { stdio: "ignore" });
    }
  } catch (error) {
    // Ignore errors - processes might not exist
  }

  console.log("✅ E2E test cleanup complete");
}
