import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse, PaginationMeta } from "../types/auth.types.js";

export const DEFAULT_PAGE_SIZE = 20;

export const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

// Endpoints whose 401/403 responses belong directly to the caller and must not trigger refresh/profile cascades
const AUTH_BYPASS_PATHS: readonly string[] = [
  "/auth/login",
  "/auth/signup",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/refresh-token",
  "/auth/logout",
  "/auth/magic-link",
  "/auth/magic-link/verify",
  "/auth/mfa/verify",
  "/auth/forgot-password",
  "/auth/reset-password",
];

const isAuthBypassRoute = (url?: string): boolean => {
  if (!url) return false;
  const path = url.split("?")[0] ?? "";
  return AUTH_BYPASS_PATHS.includes(path);
};

export type AuthFailureReason =
  | "unauthenticated"
  | "session_expired"
  | "unavailable";
type AuthFailureHandler = (reason: AuthFailureReason) => void;
let onAuthFailure: AuthFailureHandler | null = null;

type ForbiddenHandler = () => Promise<void> | void;
let onForbidden: ForbiddenHandler | null = null;

/**
 * Register a callback invoked when authentication cannot be recovered or service is unavailable.
 */
export const registerAuthFailureHandler = (
  handler: AuthFailureHandler,
): void => {
  onAuthFailure = handler;
};

/**
 * Register a callback invoked when a protected request receives a 403 Forbidden response.
 */
export const registerForbiddenHandler = (handler: ForbiddenHandler): void => {
  onForbidden = handler;
};

export const isRequestCanceled = (error: unknown): boolean =>
  axios.isCancel(error);

const API_TIMEOUT_MS = 15_000;

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
  },
});

let inflightRefreshPromise: Promise<void> | null = null;

const refreshAuthSession = (): Promise<void> => {
  if (inflightRefreshPromise) {
    return inflightRefreshPromise;
  }

  inflightRefreshPromise = axios
    .post("/api/auth/refresh-token", null, {
      withCredentials: true,
      timeout: API_TIMEOUT_MS,
    })
    .then(() => undefined)
    .catch((refreshError: unknown) => {
      if (axios.isAxiosError(refreshError)) {
        const status = refreshError.response?.status;
        if (status === 401) {
          onAuthFailure?.("session_expired");
        } else if (!status || status >= 500) {
          onAuthFailure?.("unavailable");
        }
      } else {
        onAuthFailure?.("unavailable");
      }
      throw refreshError;
    })
    .finally(() => {
      inflightRefreshPromise = null;
    });

  return inflightRefreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const isAuthBypass = isAuthBypassRoute(originalRequest.url);

    // Single-flight silent refresh on 401 for protected requests
    if (
      error.response?.status === 401 &&
      !isAuthBypass &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      await refreshAuthSession();
      return apiClient(originalRequest);
    }

    // Re-sync dynamic RBAC permissions when a protected request receives 403 Forbidden
    if (error.response?.status === 403 && !isAuthBypass && onForbidden) {
      try {
        await onForbidden();
      } catch {
        // Swallow sync errors so the original 403 error reaches the caller
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Detects whether an error message contains raw database, internal server, or driver details.
 */
const isTechnicalOrInternalError = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return (
    lower.includes("prisma") ||
    lower.includes("syntax error") ||
    lower.includes("foreign key") ||
    lower.includes("unique constraint") ||
    lower.includes("column") ||
    lower.includes("table") ||
    lower.includes("database") ||
    lower.includes("relation") ||
    lower.includes("connection pool") ||
    lower.includes("timed out") ||
    lower.includes("failed to query") ||
    lower.includes("internal server") ||
    lower.includes("econnrefused") ||
    lower.includes("nullpointer") ||
    lower.includes("cannot read properties")
  );
};

/**
 * Extracts a human-readable, safe, and sanitized error message from an API error response.
 */
export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (!error.response) {
      return "Unable to reach the AuthSphere server. Please verify your internet connection or try again shortly.";
    }

    const status = error.response.status;

    if (status >= 500) {
      return "An unexpected server error occurred. Please try again later.";
    }

    const data = error.response.data;

    if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const messages = data.errors
        .map((e) => e.message)
        .filter(Boolean)
        .filter((m) => !isTechnicalOrInternalError(m));
      if (messages.length > 0) {
        return messages.join(", ");
      }
      return "The submitted data is invalid. Please check your inputs.";
    }

    if (data?.message && typeof data.message === "string") {
      if (isTechnicalOrInternalError(data.message)) {
        return "A request processing error occurred. Please check your inputs and try again.";
      }
      return data.message;
    }

    if (status === 429) {
      return "Too many requests. Please slow down and try again in a few moments.";
    }

    if (status === 403) {
      return "Access denied. You do not have permission to perform this action.";
    }

    if (status === 401) {
      return "Authentication required. Please sign in to continue.";
    }

    if (status === 404) {
      return "The requested resource was not found.";
    }
  }

  if (error instanceof Error && !isTechnicalOrInternalError(error.message)) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
};

export const formatPermissionError = (
  error: unknown,
  permission: string,
  resourceDescription: string,
): string => {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return `Access Denied · Your role does not have permission to ${resourceDescription} (${permission}). An administrator can configure role permissions in Role Governance.`;
  }
  return getApiErrorMessage(error);
};
