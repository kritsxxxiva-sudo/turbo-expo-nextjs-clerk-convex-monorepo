/**
 * Health Check API Route
 * Provides comprehensive health monitoring endpoints for the application
 */

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// GET /api/health - Basic health check
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkType = searchParams.get("type") || "basic";

  try {
    switch (checkType) {
      case "basic":
        return await basicHealthCheck();
      case "detailed":
        return await detailedHealthCheck();
      case "readiness":
        return await readinessCheck();
      case "liveness":
        return await livenessCheck();
      default:
        return NextResponse.json(
          { error: "Invalid check type" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

// Basic health check
async function basicHealthCheck() {
  const startTime = Date.now();

  try {
    // Simple ping to verify service is responding
    const response = {
      status: "healthy",
      service: "social-media-platform",
      version: process.env.APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

// Detailed health check
async function detailedHealthCheck() {
  const startTime = Date.now();

  try {
    // Perform comprehensive health check via Convex
    const healthResult = await convex.query(api.deployment.performHealthCheck);

    const response = {
      ...healthResult,
      version: process.env.APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss,
      },
      cpu: {
        usage: process.cpuUsage(),
      },
    };

    const statusCode =
      healthResult.status === "healthy"
        ? 200
        : healthResult.status === "degraded"
          ? 200
          : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      },
      { status: 503 },
    );
  }
}

// Readiness check (for Kubernetes)
async function readinessCheck() {
  try {
    // Check if the application is ready to serve traffic
    const readinessResult = await convex.query(
      api.deployment.performReadinessCheck,
    );

    if (readinessResult.ready) {
      return NextResponse.json(readinessResult, { status: 200 });
    } else {
      return NextResponse.json(readinessResult, { status: 503 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      },
      { status: 503 },
    );
  }
}

// Liveness check (for Kubernetes)
async function livenessCheck() {
  try {
    // Check if the application is alive
    const livenessResult = await convex.query(
      api.deployment.performLivenessCheck,
    );

    return NextResponse.json(livenessResult, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        alive: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      },
      { status: 503 },
    );
  }
}

// POST /api/health/validate - Validate deployment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { version, environment, features } = body;

    if (!version || !environment) {
      return NextResponse.json(
        { error: "Version and environment are required" },
        { status: 400 },
      );
    }

    // Validate deployment via Convex
    const validationResult = await convex.mutation(
      api.deployment.validateDeployment,
      {
        version,
        environment,
        features,
      },
    );

    const statusCode = validationResult.valid ? 200 : 400;

    return NextResponse.json(validationResult, { status: statusCode });
  } catch (error) {
    console.error("Deployment validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}
