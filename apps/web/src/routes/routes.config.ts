/**
 * Canonical route definitions for AuthSphere frontend.
 * Acts as the single source of truth for all internal navigation paths and external OAuth endpoints.
 */

export const ROUTES = {
  ROOT: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
  MAGIC_LINK_VERIFY: "/magic-link/verify",
  APP: {
    ROOT: "/app",
    SECURITY: "/app/security",
    SESSIONS: "/app/sessions",
    ACTIVITY: "/app/activity",
    USERS: "/app/users",
    ADMIN_ROLES: "/app/admin/roles",
  },
} as const;

export const OAUTH_URLS = {
  GOOGLE: "/api/auth/oauth/google",
  GITHUB: "/api/auth/oauth/github",
} as const;

export const DOCS_URLS = {
  SWAGGER: "/api/docs/",
  OPENAPI: "/api/openapi.json",
} as const;

/**
 * Public route prefixes where session expiration redirects should not be triggered
 */
export const PUBLIC_AUTH_ROUTES: readonly string[] = [
  ROUTES.ROOT,
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.VERIFY_EMAIL,
  ROUTES.MAGIC_LINK_VERIFY,
];
