/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_auth_helpers from "../_lib/auth_helpers.js";
import type * as _lib_errors from "../_lib/errors.js";
import type * as _lib_schema_types from "../_lib/schema_types.js";
import type * as _lib_tenancy from "../_lib/tenancy.js";
import type * as _tests_convex_auth_harness from "../_tests/convex_auth_harness.js";
import type * as _tests_setup from "../_tests/setup.js";
import type * as auth from "../auth.js";
import type * as auth_adapter from "../auth_adapter.js";
import type * as comments from "../comments.js";
import type * as cycles from "../cycles.js";
import type * as http from "../http.js";
import type * as issues from "../issues.js";
import type * as memberships from "../memberships.js";
import type * as notifications from "../notifications.js";
import type * as projects from "../projects.js";
import type * as rbac from "../rbac.js";
import type * as seed from "../seed.js";
import type * as tenancy_probe from "../tenancy_probe.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/auth_helpers": typeof _lib_auth_helpers;
  "_lib/errors": typeof _lib_errors;
  "_lib/schema_types": typeof _lib_schema_types;
  "_lib/tenancy": typeof _lib_tenancy;
  "_tests/convex_auth_harness": typeof _tests_convex_auth_harness;
  "_tests/setup": typeof _tests_setup;
  auth: typeof auth;
  auth_adapter: typeof auth_adapter;
  comments: typeof comments;
  cycles: typeof cycles;
  http: typeof http;
  issues: typeof issues;
  memberships: typeof memberships;
  notifications: typeof notifications;
  projects: typeof projects;
  rbac: typeof rbac;
  seed: typeof seed;
  tenancy_probe: typeof tenancy_probe;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
