/**
 * Global setup for E2E tests
 * Runs once before all E2E tests
 */

export default async function globalSetup(): Promise<void> {
  console.log("🚀 Setting up E2E test environment...");

  // Check if required environment variables are set
  const requiredEnvVars = [
    "NEXT_PUBLIC_CONVEX_URL",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar],
  );

  if (missingEnvVars.length > 0) {
    console.warn(
      "⚠️  Missing environment variables:",
      missingEnvVars.join(", "),
    );
    console.warn("E2E tests may fail without proper configuration");
  }

  // Set default test environment variables
  process.env.NODE_ENV = process.env.NODE_ENV || "test";
  process.env.NEXT_PUBLIC_APP_URL =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  console.log("✅ E2E test environment ready");
}
