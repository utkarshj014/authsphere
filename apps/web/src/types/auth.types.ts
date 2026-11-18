import {
  ROLES,
  PERMISSIONS,
  OAUTH_PROVIDERS,
  SECURITY_EVENT_TYPES,
  type RoleName,
  type PermissionName,
  type OAuthProviderName,
  type SecurityEventTypeName,
} from "@authsphere/shared";

export { ROLES, PERMISSIONS, OAUTH_PROVIDERS, SECURITY_EVENT_TYPES };
export type {
  RoleName,
  PermissionName,
  OAuthProviderName,
  SecurityEventTypeName,
};

/**
 * Standard user profile payload returned from backend GET /auth/me
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: RoleName;
  mfaEnabled: boolean;
  verifiedAt?: string | null;
  createdAt?: string;
}

/**
 * Authentication status lifecycle
 */
export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "unavailable";

/**
 * Standard backend response envelopes
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * MFA Challenge intermediate response payload
 */
export interface MfaChallengePayload {
  mfaRequired: true;
  mfaToken: string;
}

/**
 * MFA Setup response payload
 */
export interface MfaSetupResponse {
  secret: string;
  otpauthUri: string;
}

/**
 * MFA Verify Setup response payload
 */
export interface MfaVerifySetupResponse {
  recoveryCodes: string[];
}

/**
 * MFA Recovery Codes payload
 */
export interface MfaRecoveryCodesResponse {
  recoveryCodes: string[];
}

/**
 * MFA Login completion response payload
 */
export interface MfaLoginResponse {
  lowRecoveryCodesWarning?: boolean;
  remainingRecoveryCodes?: number;
}

/**
 * Session item returned from GET /sessions
 */
export interface SessionItem {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

/**
 * Security audit event item returned from GET /auth/security-events
 */
export interface SecurityEventItem {
  id: string;
  type: SecurityEventTypeName;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

/**
 * Admin user item returned from GET /users
 */
export interface AdminUserItem {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: RoleName;
  mfaEnabled: boolean;
  isEmailVerified: boolean;
  createdAt: string;
}

/**
 * Role permissions response returned from GET /roles/:roleName/permissions
 */
export interface RolePermissionsResponse {
  role: RoleName;
  permissions: PermissionName[];
}

/**
 * Pagination metadata returned with paginated listings
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}
