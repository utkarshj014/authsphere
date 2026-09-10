import { z } from "zod";
import { registry } from "../../common/openapi/registry.js";
import {
  cookieSecurity,
  refreshCookieSecurity,
  MessageOnlyResponseSchema,
  standardErrors,
  authedErrors,
  jsonContent,
  successEnvelope,
  successResponse,
  messageResponse,
  errorResponse,
  jsonBody,
} from "../../common/openapi/schemas.js";
import { authRequestSchema, authResponseSchema } from "./auth.validation.js";

// ─── Reusable Auth Response Components ─────────────────────────────

export const MfaRequiredResponseSchema = registry.register(
  "MfaRequiredResponse",
  successEnvelope(authResponseSchema.mfaRequired).openapi(
    "MfaRequiredResponse",
    {
      description: "MFA challenge verification required to complete flow",
    },
  ),
);

export const LoginResponseSchema = registry.register(
  "LoginResponse",
  z
    .union([MessageOnlyResponseSchema, MfaRequiredResponseSchema])
    .openapi("LoginResponse", {
      description:
        "Successful login (session cookies set) or MFA challenge verification required",
    }),
);

export const CurrentUserProfileSchema = registry.register(
  "CurrentUserProfile",
  authResponseSchema.currentUserProfile.openapi("CurrentUserProfile", {
    description: "Current authenticated user profile data",
  }),
);

export const PaginatedSecurityEventsResponseSchema = registry.register(
  "PaginatedSecurityEvents",
  authResponseSchema.paginatedSecurityEvents.openapi(
    "PaginatedSecurityEvents",
    {
      description: "Paginated security events with metadata",
    },
  ),
);

const loginOrMfaResponse = (description: string) => ({
  description,
  content: jsonContent(LoginResponseSchema),
});

// ─── POST /auth/signup ─────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/signup",
  tags: ["Auth"],
  summary: "Register a new user account",
  description:
    "Creates a new user with email and password. Sends a verification email.",
  request: {
    body: jsonBody(authRequestSchema.signup),
  },
  responses: {
    201: messageResponse("Account created — verification email sent"),
    ...standardErrors,
    409: errorResponse("Email already registered"),
  },
});

// ─── POST /auth/verify-email ───────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/verify-email",
  tags: ["Auth"],
  summary: "Verify email address",
  description: "Confirms the user's email using a verification token.",
  request: {
    body: jsonBody(authRequestSchema.verifyEmail),
  },
  responses: {
    200: messageResponse("Email verified successfully"),
    ...standardErrors,
  },
});

// ─── POST /auth/resend-verification ────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/resend-verification",
  tags: ["Auth"],
  summary: "Resend verification email",
  description:
    "Resends a verification email if the account exists and is unverified.",
  request: {
    body: jsonBody(authRequestSchema.resendVerificationToken),
  },
  responses: {
    200: messageResponse("Verification email resent (if applicable)"),
    ...standardErrors,
  },
});

// ─── POST /auth/login ──────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Login with email and password",
  description:
    "Authenticates a user. Sets HttpOnly auth cookies on success, or returns an MFA challenge if MFA is enabled.",
  request: {
    body: jsonBody(authRequestSchema.login),
  },
  responses: {
    200: loginOrMfaResponse("Login successful (or MFA challenge returned)"),
    ...standardErrors,
    401: errorResponse("Invalid credentials"),
    403: errorResponse("Email not verified"),
  },
});

// ─── POST /auth/refresh-token ──────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/refresh-token",
  tags: ["Auth"],
  summary: "Refresh access token",
  description:
    "Uses the refresh token cookie to issue a new access/refresh token pair.",
  security: refreshCookieSecurity,
  responses: {
    200: messageResponse("Tokens refreshed — new cookies set"),
    401: errorResponse("Invalid or expired refresh token"),
    429: standardErrors[429],
    500: standardErrors[500],
  },
});

// ─── POST /auth/logout ─────────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Logout current session",
  description: "Revokes the current refresh token and clears auth cookies.",
  security: refreshCookieSecurity,
  responses: {
    200: messageResponse("Logged out successfully"),
    401: errorResponse("Unauthorized — missing or invalid refresh token"),
    429: standardErrors[429],
    500: standardErrors[500],
  },
});

// ─── POST /auth/logout-all ─────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/logout-all",
  tags: ["Auth"],
  summary: "Logout all sessions",
  description:
    "Revokes all active sessions for the authenticated user and clears auth cookies.",
  security: cookieSecurity,
  responses: {
    200: messageResponse("All sessions revoked"),
    ...authedErrors,
  },
});

// ─── GET /auth/me ──────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get current user profile",
  description: "Returns the authenticated user's profile information.",
  security: cookieSecurity,
  responses: {
    200: successResponse("Current user profile", CurrentUserProfileSchema),
    ...authedErrors,
  },
});

// ─── POST /auth/forgot-password ────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/forgot-password",
  tags: ["Auth"],
  summary: "Request password reset email",
  description: "Sends a password reset email if the account exists.",
  request: {
    body: jsonBody(authRequestSchema.forgotPassword),
  },
  responses: {
    200: messageResponse("Reset email sent (if account exists)"),
    ...standardErrors,
  },
});

// ─── POST /auth/reset-password ─────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/reset-password",
  tags: ["Auth"],
  summary: "Reset password with token",
  description:
    "Resets the user's password using a token from the password reset email. May require MFA verification.",
  request: {
    body: jsonBody(authRequestSchema.resetPassword),
  },
  responses: {
    200: loginOrMfaResponse(
      "Password reset successful (or MFA challenge returned)",
    ),
    ...standardErrors,
  },
});

// ─── POST /auth/change-password ────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/change-password",
  tags: ["Auth"],
  summary: "Change password (authenticated)",
  description:
    "Changes the authenticated user's password. Clears auth cookies on success. May require MFA verification.",
  security: cookieSecurity,
  request: {
    body: jsonBody(authRequestSchema.changePassword),
  },
  responses: {
    200: loginOrMfaResponse(
      "Password changed successfully (or MFA challenge returned)",
    ),
    ...authedErrors,
    403: errorResponse(
      "Forbidden — accounts using social login cannot change password",
    ),
  },
});

// ─── POST /auth/mfa/setup ──────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/mfa/setup",
  tags: ["MFA"],
  summary: "Initiate MFA setup",
  description:
    "Generates a TOTP secret and QR code URI for the authenticated user to set up MFA.",
  security: cookieSecurity,
  responses: {
    200: successResponse(
      "MFA setup data with secret and otpauthUri",
      authResponseSchema.mfaSetup,
    ),
    ...authedErrors,
  },
});

// ─── POST /auth/mfa/verify-setup ───────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/mfa/verify-setup",
  tags: ["MFA"],
  summary: "Verify and enable MFA",
  description:
    "Verifies the TOTP code to enable MFA. Returns recovery codes that should be stored securely.",
  security: cookieSecurity,
  request: {
    body: jsonBody(authRequestSchema.mfaVerifySetup),
  },
  responses: {
    200: successResponse(
      "MFA enabled — recovery codes returned",
      authResponseSchema.mfaRecoveryCodes,
    ),
    ...authedErrors,
  },
});

// ─── POST /auth/mfa/verify ─────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/mfa/verify",
  tags: ["MFA"],
  summary: "Verify MFA code during login",
  description:
    "Completes login by verifying a TOTP code or recovery code. Sets auth cookies on success.",
  request: {
    body: jsonBody(authRequestSchema.mfaVerifyLogin),
  },
  responses: {
    200: successResponse(
      "Login completed — auth cookies set",
      authResponseSchema.mfaVerifyLogin,
    ),
    ...standardErrors,
  },
});

// ─── POST /auth/mfa/disable ────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/mfa/disable",
  tags: ["MFA"],
  summary: "Disable MFA",
  description:
    "Disables MFA for the authenticated user. All active sessions are revoked.",
  security: cookieSecurity,
  request: {
    body: jsonBody(authRequestSchema.mfaDisable),
  },
  responses: {
    200: messageResponse("MFA disabled — all sessions revoked"),
    ...authedErrors,
  },
});

// ─── POST /auth/mfa/regenerate-recovery-codes ──────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/mfa/regenerate-recovery-codes",
  tags: ["MFA"],
  summary: "Regenerate recovery codes",
  description: "Generates new recovery codes, invalidating the previous set.",
  security: cookieSecurity,
  request: {
    body: jsonBody(authRequestSchema.mfaRegenerateRecoveryCodes),
  },
  responses: {
    200: successResponse(
      "New recovery codes generated",
      authResponseSchema.mfaRecoveryCodes,
    ),
    ...authedErrors,
  },
});

// ─── POST /auth/magic-link ─────────────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/magic-link",
  tags: ["Auth"],
  summary: "Send magic link email",
  description: "Sends a passwordless login link if the account exists.",
  request: {
    body: jsonBody(authRequestSchema.sendMagicLink),
  },
  responses: {
    200: messageResponse("Magic link sent (if account exists)"),
    ...standardErrors,
  },
});

// ─── POST /auth/magic-link/verify ──────────────────────────────────

registry.registerPath({
  method: "post",
  path: "/auth/magic-link/verify",
  tags: ["Auth"],
  summary: "Verify magic link token",
  description:
    "Authenticates a user via magic link token. Sets auth cookies on success, or returns MFA challenge.",
  request: {
    body: jsonBody(authRequestSchema.verifyMagicLink),
  },
  responses: {
    200: loginOrMfaResponse("Login successful (or MFA challenge returned)"),
    ...standardErrors,
  },
});

// ─── GET /auth/security-events ─────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/auth/security-events",
  tags: ["Security Events"],
  summary: "Get paginated security events",
  description:
    "Returns a paginated list of security events (logins, logouts, password changes, etc.) for the authenticated user.",
  security: cookieSecurity,
  request: {
    query: authRequestSchema.securityEventsQuery,
  },
  responses: {
    200: successResponse(
      "Paginated security events",
      PaginatedSecurityEventsResponseSchema,
    ),
    ...authedErrors,
  },
});

// ─── OAuth Routes ──────────────────────────────────────────────────

registry.registerPath({
  method: "get",
  path: "/auth/oauth/google",
  tags: ["OAuth"],
  summary: "Initiate Google OAuth",
  description:
    "Redirects the user to Google's OAuth consent screen. Optionally links a Google account to an existing session.",
  responses: {
    302: { description: "Redirect to Google OAuth consent screen" },
    429: standardErrors[429],
    500: standardErrors[500],
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/oauth/google/callback",
  tags: ["OAuth"],
  summary: "Google OAuth callback",
  description:
    "Handles the redirect from Google after OAuth consent. Creates or links an account and sets auth cookies.",
  request: {
    query: authRequestSchema.oauthCallbackQuery,
  },
  responses: {
    200: loginOrMfaResponse(
      "Authenticated via Google (or MFA challenge returned)",
    ),
    400: errorResponse(
      "OAuth callback failed, invalid or expired state parameter",
    ),
    429: standardErrors[429],
    500: standardErrors[500],
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/oauth/github",
  tags: ["OAuth"],
  summary: "Initiate GitHub OAuth",
  description:
    "Redirects the user to GitHub's OAuth consent screen. Optionally links a GitHub account to an existing session.",
  responses: {
    302: { description: "Redirect to GitHub OAuth consent screen" },
    429: standardErrors[429],
    500: standardErrors[500],
  },
});

registry.registerPath({
  method: "get",
  path: "/auth/oauth/github/callback",
  tags: ["OAuth"],
  summary: "GitHub OAuth callback",
  description:
    "Handles the redirect from GitHub after OAuth consent. Creates or links an account and sets auth cookies.",
  request: {
    query: authRequestSchema.oauthCallbackQuery,
  },
  responses: {
    200: loginOrMfaResponse(
      "Authenticated via GitHub (or MFA challenge returned)",
    ),
    400: errorResponse(
      "OAuth callback failed, invalid or expired state parameter",
    ),
    429: standardErrors[429],
    500: standardErrors[500],
  },
});
