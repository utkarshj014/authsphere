import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiErrorResponse } from "../types/auth.types.js";
import { ROUTES, PUBLIC_AUTH_ROUTES } from "../routes/routes.config.js";

// Endpoints that bypass automatic 401 refresh rotation
const AUTH_BYPASS_URLS: readonly string[] = [
  "/auth/login",
  "/auth/signup",
  "/auth/refresh-token",
  "/auth/magic-link",
  "/auth/magic-link/verify",
  "/auth/mfa/verify",
  "/auth/forgot-password",
  "/auth/reset-password",
];

type AuthFailureReason = "unauthenticated" | "unavailable";
type AuthFailureHandler = (reason: AuthFailureReason) => void;
let onAuthFailure: AuthFailureHandler | null = null;

type ForbiddenHandler = () => Promise<void> | void;
let onForbidden: ForbiddenHandler | null = null;

/**
 * Register a callback invoked when authentication cannot be recovered or service is unavailable.
 * Breaks circular dependencies between the HTTP client and auth store.
 */
export const registerAuthFailureHandler = (
  handler: AuthFailureHandler,
): void => {
  onAuthFailure = handler;
};

/**
 * Register a callback invoked when a request receives a 403 Forbidden response.
 * Allows the auth store to synchronize permissions in the background.
 */
export const registerForbiddenHandler = (handler: ForbiddenHandler): void => {
  onForbidden = handler;
};

interface RetryQueueItem {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

let isRefreshing = false;
let failedQueue: RetryQueueItem[] = [];

const processQueue = (error: unknown): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url || "";
    const isAuthBypass = AUTH_BYPASS_URLS.some((url) =>
      requestUrl.includes(url),
    );

    // Intercept 401 on protected requests that haven't been retried yet
    if (
      error.response?.status === 401 &&
      !isAuthBypass &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // Carry retry flag on queued concurrent requests to prevent recursive refresh loops
        originalRequest._retry = true;
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Single in-flight refresh request directly via raw axios to avoid interceptor recursion
        await axios.post("/api/auth/refresh-token", null, {
          withCredentials: true,
          timeout: 10000,
        });

        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);

        const isDefinitive401 =
          axios.isAxiosError(refreshError) &&
          refreshError.response?.status === 401;

        if (isDefinitive401) {
          // Refresh token invalid, expired, or replayed -> Unauthenticated
          if (onAuthFailure) {
            onAuthFailure("unauthenticated");
          }

          // Redirect to login if on a protected route
          if (typeof window !== "undefined") {
            const currentPath = window.location.pathname;
            const isPublicRoute = PUBLIC_AUTH_ROUTES.some((route) =>
              route === "/"
                ? currentPath === "/"
                : currentPath.startsWith(route),
            );

            // Only redirect with session_expired if currently within a protected application route
            if (!isPublicRoute && currentPath.startsWith(ROUTES.APP.ROOT)) {
              const returnTo = encodeURIComponent(
                currentPath + window.location.search,
              );
              window.location.href = `${ROUTES.LOGIN}?session_expired=true&returnTo=${returnTo}`;
            }
          }
        } else {
          // Network failure, DNS outage, or 5xx server error -> Service Unavailable (retain session)
          if (onAuthFailure) {
            onAuthFailure("unavailable");
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // When a request is rejected with 403 Forbidden, role permissions may have changed dynamically.
    // Await store resynchronization so capabilities are refreshed atomically before rejecting caller.
    if (error.response?.status === 403) {
      if (onForbidden) {
        try {
          await onForbidden();
        } catch {
          // Swallow refresh error to allow original 403 error to propagate to caller
        }
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

    // Never leak 5xx server internals or stack traces
    if (status >= 500) {
      return "An unexpected server error occurred. Please try again later.";
    }

    const data = error.response.data;

    // Schema validation errors array
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

  if (error instanceof Error) {
    if (!isTechnicalOrInternalError(error.message)) {
      return error.message;
    }
  }

  return "An unexpected error occurred. Please try again.";
};
