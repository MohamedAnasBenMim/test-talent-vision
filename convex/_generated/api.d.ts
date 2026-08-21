/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiInsights from "../aiInsights.js";
import type * as applicationAnalysis from "../applicationAnalysis.js";
import type * as applications from "../applications.js";
import type * as assessments from "../assessments.js";
import type * as chat from "../chat.js";
import type * as codeSessions from "../codeSessions.js";
import type * as comments from "../comments.js";
import type * as http from "../http.js";
import type * as interviews from "../interviews.js";
import type * as jobGeneration from "../jobGeneration.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiInsights: typeof aiInsights;
  applicationAnalysis: typeof applicationAnalysis;
  applications: typeof applications;
  assessments: typeof assessments;
  chat: typeof chat;
  codeSessions: typeof codeSessions;
  comments: typeof comments;
  http: typeof http;
  interviews: typeof interviews;
  jobGeneration: typeof jobGeneration;
  users: typeof users;
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

export declare const components: {};
