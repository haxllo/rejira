/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_errors from "../_lib/errors.js";
import type * as _lib_schema_types from "../_lib/schema_types.js";
import type * as _lib_tenancy from "../_lib/tenancy.js";
import type * as _tests_setup from "../_tests/setup.js";
import type * as http from "../http.js";
import type * as seed from "../seed.js";
import type * as tenancy_probe from "../tenancy_probe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/errors": typeof _lib_errors;
  "_lib/schema_types": typeof _lib_schema_types;
  "_lib/tenancy": typeof _lib_tenancy;
  "_tests/setup": typeof _tests_setup;
  http: typeof http;
  seed: typeof seed;
  tenancy_probe: typeof tenancy_probe;
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
