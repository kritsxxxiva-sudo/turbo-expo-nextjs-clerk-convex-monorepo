#!/usr/bin/env node

/**
 * Start Chrome for manual testing with DevTools
 */

const { launch } = require("chrome-launcher");

async function startChrome() {
  try {
    console.log("🚀 Starting Chrome with DevTools...");

    const chrome = await launch({
      chromeFlags: [
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
      ],
      handleSIGINT: false,
    });

    console.log(`✅ Chrome started on port ${chrome.port}`);
    console.log(`🔗 DevTools URL: http://localhost:${chrome.port}`);
    console.log("📱 Test your app at: http://localhost:3000");
    console.log("\nPress Ctrl+C to stop Chrome");

    // Keep the process alive
    process.on("SIGINT", async () => {
      console.log("\n🛑 Stopping Chrome...");
      await chrome.kill();
      console.log("✅ Chrome stopped");
      process.exit(0);
    });

    // Prevent the script from exiting
    setInterval(() => {}, 1000);
  } catch (error) {
    console.error("❌ Failed to start Chrome:", error.message);
    process.exit(1);
  }
}

startChrome();
