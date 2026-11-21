import {
  SECURITY_EVENT_TYPES,
  type SecurityEventTypeName,
} from "@authsphere/shared";

/**
 * Single source of truth for presentation formatters across AuthSphere.
 */

export type BadgeVariant = "ok" | "bad" | "cool" | "accent" | "neutral";

const EVENT_TYPE_LABELS: Record<SecurityEventTypeName, string> = {
  [SECURITY_EVENT_TYPES.LOGIN_SUCCESS]: "Login Success",
  [SECURITY_EVENT_TYPES.LOGIN_FAILED]: "Login Failed",
  [SECURITY_EVENT_TYPES.LOGOUT]: "Logout",
  [SECURITY_EVENT_TYPES.MFA_ENABLED]: "2FA Enabled",
  [SECURITY_EVENT_TYPES.MFA_DISABLED]: "2FA Disabled",
  [SECURITY_EVENT_TYPES.PASSWORD_CHANGED]: "Password Changed",
  [SECURITY_EVENT_TYPES.PASSWORD_RESET]: "Password Reset",
  [SECURITY_EVENT_TYPES.OAUTH_LOGIN]: "Social Login",
  [SECURITY_EVENT_TYPES.MAGIC_LINK_LOGIN]: "Magic Link Login",
};

const EVENT_BADGE_VARIANTS: Record<SecurityEventTypeName, BadgeVariant> = {
  [SECURITY_EVENT_TYPES.LOGIN_SUCCESS]: "ok",
  [SECURITY_EVENT_TYPES.OAUTH_LOGIN]: "ok",
  [SECURITY_EVENT_TYPES.MAGIC_LINK_LOGIN]: "ok",
  [SECURITY_EVENT_TYPES.LOGIN_FAILED]: "bad",
  [SECURITY_EVENT_TYPES.MFA_DISABLED]: "bad",
  [SECURITY_EVENT_TYPES.LOGOUT]: "neutral",
  [SECURITY_EVENT_TYPES.PASSWORD_CHANGED]: "accent",
  [SECURITY_EVENT_TYPES.PASSWORD_RESET]: "accent",
  [SECURITY_EVENT_TYPES.MFA_ENABLED]: "accent",
};

interface ClientMatcher {
  readonly pattern: RegExp;
  readonly name: string;
}

// Ordered browser/client definitions (specific signatures precede generic Chromium/Safari tokens)
const BROWSER_MATCHERS: readonly ClientMatcher[] = [
  { pattern: /PostmanRuntime/i, name: "Postman" },
  { pattern: /curl\//i, name: "cURL" },
  { pattern: /Edg\//i, name: "Microsoft Edge" },
  { pattern: /OPR\/|Opera/i, name: "Opera" },
  { pattern: /SamsungBrowser/i, name: "Samsung Internet" },
  { pattern: /Firefox/i, name: "Firefox" },
  { pattern: /Chrome/i, name: "Google Chrome" },
  { pattern: /Safari/i, name: "Apple Safari" },
];

// Operating system / platform definitions
const OS_MATCHERS: readonly ClientMatcher[] = [
  { pattern: /iPhone|iPad|iPod/i, name: "iOS" },
  { pattern: /Android/i, name: "Android" },
  { pattern: /Macintosh|Mac OS X/i, name: "macOS" },
  { pattern: /Windows/i, name: "Windows" },
  { pattern: /Linux/i, name: "Linux" },
];

export const formatClient = (ua?: string | null): string => {
  if (!ua) return "Unknown Client";

  const browser = BROWSER_MATCHERS.find((m) => m.pattern.test(ua))?.name;
  const os = OS_MATCHERS.find((m) => m.pattern.test(ua))?.name;

  if (browser && os) return `${browser} on ${os}`;
  if (browser) return browser;
  if (os) return `Unknown Browser on ${os}`;
  return "Unknown Client";
};

export const formatEventType = (type: string): string => {
  if (!type) return "—";
  return (
    EVENT_TYPE_LABELS[type as SecurityEventTypeName] ?? type.replace(/_/g, " ")
  );
};

export const getEventBadgeVariant = (type: string): BadgeVariant => {
  return EVENT_BADGE_VARIANTS[type as SecurityEventTypeName] ?? "neutral";
};

export const formatDate = (date: string | Date | undefined): string => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (date: string | Date | undefined): string => {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
