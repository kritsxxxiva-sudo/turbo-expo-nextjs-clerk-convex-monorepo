/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as functions_customers from "../functions/customers.js";
import type * as functions_sessions from "../functions/sessions.js";
import type * as functions_socialAccounts from "../functions/socialAccounts.js";
import type * as functions_socialPosts from "../functions/socialPosts.js";
import type * as functions_subscriptions from "../functions/subscriptions.js";
import type * as functions_users from "../functions/users.js";
import type * as functions_webhookEvents from "../functions/webhookEvents.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_deployment from "../lib/deployment.js";
import type * as lib_errorHandling from "../lib/errorHandling.js";
import type * as lib_logging from "../lib/logging.js";
import type * as lib_middleware from "../lib/middleware.js";
import type * as lib_monitoring from "../lib/monitoring.js";
import type * as lib_scheduler from "../lib/scheduler.js";
import type * as lib_sessionConfig from "../lib/sessionConfig.js";
import type * as lib_testing from "../lib/testing.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_webhookAuth from "../lib/webhookAuth.js";
import type * as notes from "../notes.js";
import type * as openai from "../openai.js";
import type * as utils from "../utils.js";
import type * as webhooks_ayrshare from "../webhooks/ayrshare.js";
import type * as webhooks_clerk from "../webhooks/clerk.js";
import type * as webhooks_stripe from "../webhooks/stripe.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "functions/customers": typeof functions_customers;
  "functions/sessions": typeof functions_sessions;
  "functions/socialAccounts": typeof functions_socialAccounts;
  "functions/socialPosts": typeof functions_socialPosts;
  "functions/subscriptions": typeof functions_subscriptions;
  "functions/users": typeof functions_users;
  "functions/webhookEvents": typeof functions_webhookEvents;
  "lib/analytics": typeof lib_analytics;
  "lib/deployment": typeof lib_deployment;
  "lib/errorHandling": typeof lib_errorHandling;
  "lib/logging": typeof lib_logging;
  "lib/middleware": typeof lib_middleware;
  "lib/monitoring": typeof lib_monitoring;
  "lib/scheduler": typeof lib_scheduler;
  "lib/sessionConfig": typeof lib_sessionConfig;
  "lib/testing": typeof lib_testing;
  "lib/validation": typeof lib_validation;
  "lib/webhookAuth": typeof lib_webhookAuth;
  notes: typeof notes;
  openai: typeof openai;
  utils: typeof utils;
  "webhooks/ayrshare": typeof webhooks_ayrshare;
  "webhooks/clerk": typeof webhooks_clerk;
  "webhooks/stripe": typeof webhooks_stripe;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
