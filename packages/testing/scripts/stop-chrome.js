#!/usr/bin/env node

/**
 * Stop all Chrome processes
 */

const { execSync } = require("child_process");

function stopChrome() {
  try {
    console.log("🛑 Stopping Chrome processes...");

    if (process.platform === "win32") {
      execSync("taskkill /f /im chrome.exe", { stdio: "ignore" });
    } else {
      execSync("pkill -f chrome", { stdio: "ignore" });
    }

    console.log("✅ Chrome processes stopped");
  } catch (error) {
    console.log("ℹ️  No Chrome processes found or already stopped");
  }
}

stopChrome();
