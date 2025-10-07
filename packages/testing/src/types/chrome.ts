import { LaunchedChrome } from "chrome-launcher";
import CDP from "chrome-remote-interface";

export interface ChromeDevToolsConfig {
  headless: boolean;
  port: number;
  chromeFlags: string[];
  timeout?: number;
}

export interface DevToolsSession {
  client: CDP.Client;
  chrome: LaunchedChrome;
  Page: any; // CDP.Page types are complex, using any for now
  Runtime: any; // CDP.Runtime types are complex, using any for now
  Network: any; // CDP.Network types are complex, using any for now
  Performance: any; // CDP.Performance types are complex, using any for now
}

export interface PerformanceMetric {
  name: string;
  value: number;
}

export interface TestResult {
  success: boolean;
  error?: string;
  metrics?: PerformanceMetric[];
  screenshot?: Buffer;
}

export interface E2ETestConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headless: boolean;
  viewport: {
    width: number;
    height: number;
  };
}

export interface ConvexTestHelpers {
  waitForRealtimeUpdate: (query: string, timeout?: number) => Promise<any>;
  mockConvexFunction: (functionName: string, mockData: any) => void;
  clearConvexMocks: () => void;
}
