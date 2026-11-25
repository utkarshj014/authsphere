import { describe, it, expect } from "vitest";
import { authSchema } from "../../src/modules/auth/auth.validation.js";
import {
  usersSchema,
  usersResponseSchema,
} from "../../src/modules/users/users.validation.js";
import { rolesSchema } from "../../src/modules/roles/roles.validation.js";
import { parseDurationToMs } from "../../src/common/utils/time.js";

describe("Validation Schemas & Utilities Unit Tests", () => {
  describe("Authentication Business Schemas", () => {
    it("validates signup payload requiring valid email and strong password criteria", () => {
      // Valid signup
      expect(
        authSchema.signup.safeParse({
          email: "user@example.com",
          password: "ValidPassword123!",
          firstName: "Alice",
          lastName: "Smith",
        }).success,
      ).toBe(true);

      // Invalid email
      expect(
        authSchema.signup.safeParse({
          email: "invalid-email",
          password: "ValidPassword123!",
        }).success,
      ).toBe(false);

      // Weak password (< 8 chars)
      expect(
        authSchema.signup.safeParse({
          email: "user@example.com",
          password: "short",
        }).success,
      ).toBe(false);
    });

    it("validates resetPassword payload with optional TOTP or backup recovery codes", () => {
      // Valid without code
      expect(
        authSchema.resetPassword.safeParse({
          token: "reset-token-hex",
          password: "NewStrongPassword123!",
        }).success,
      ).toBe(true);

      // Valid with 6-digit TOTP code
      expect(
        authSchema.resetPassword.safeParse({
          token: "reset-token-hex",
          password: "NewStrongPassword123!",
          code: "123456",
        }).success,
      ).toBe(true);

      // Valid with formatted backup recovery code (XXXXX-XXXXX)
      expect(
        authSchema.resetPassword.safeParse({
          token: "reset-token-hex",
          password: "NewStrongPassword123!",
          code: "ABCDE-12345",
        }).success,
      ).toBe(true);

      // Invalid code format
      expect(
        authSchema.resetPassword.safeParse({
          token: "reset-token-hex",
          password: "NewStrongPassword123!",
          code: "invalid-shape",
        }).success,
      ).toBe(false);
    });
  });

  describe("Pagination Boundaries & Coercion", () => {
    it("enforces pagination defaults, string coercion, and bounds across query schemas", () => {
      // Defaults to page 1, limit 20
      const defaultEvents = authSchema.securityEventsQuery.parse({});
      expect(defaultEvents.page).toBe(1);
      expect(defaultEvents.limit).toBe(20);

      // Coerces string numbers
      const coercedUsers = usersSchema.listUsersQuery.parse({
        page: "3",
        limit: "50",
      });
      expect(coercedUsers.page).toBe(3);
      expect(coercedUsers.limit).toBe(50);

      // Rejects page < 1
      expect(
        authSchema.securityEventsQuery.safeParse({ page: 0 }).success,
      ).toBe(false);
      expect(usersSchema.listUsersQuery.safeParse({ page: -1 }).success).toBe(
        false,
      );

      // Rejects limit > 100
      expect(
        authSchema.securityEventsQuery.safeParse({ limit: 101 }).success,
      ).toBe(false);
      expect(usersSchema.listUsersQuery.safeParse({ limit: 101 }).success).toBe(
        false,
      );
    });
  });

  describe("Roles & Permissions Validation", () => {
    it("validates allowed roles and deduplicates permission arrays", () => {
      // Valid roles
      expect(
        rolesSchema.getRolePermissionsParams.safeParse({ roleName: "USER" })
          .success,
      ).toBe(true);
      expect(
        rolesSchema.getRolePermissionsParams.safeParse({ roleName: "ADMIN" })
          .success,
      ).toBe(true);
      expect(
        rolesSchema.getRolePermissionsParams.safeParse({
          roleName: "SUPERADMIN",
        }).success,
      ).toBe(false);

      // Permission array deduplication
      const result = rolesSchema.updatePermissionsBody.safeParse({
        permissions: ["profile.read", "profile.read", "profile.update"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.permissions).toEqual([
          "profile.read",
          "profile.update",
        ]);
      }
    });
  });

  describe("User Response Schemas", () => {
    it("validates userProfile shape, rejects invalid roles, and defaults mfaEnabled to false", () => {
      const parsedWithMfa = usersResponseSchema.userProfile.safeParse({
        id: "018f4a7b-3b32-7264-b0cf-5b1234567890",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "USER",
        mfaEnabled: true,
        isEmailVerified: true,
        createdAt: new Date(),
      });
      expect(parsedWithMfa.success).toBe(true);

      // Defaults mfaEnabled to false when omitted
      const parsedWithoutMfa = usersResponseSchema.userProfile.safeParse({
        id: "018f4a7b-3b32-7264-b0cf-5b1234567890",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "USER",
        isEmailVerified: true,
        createdAt: new Date(),
      });
      expect(parsedWithoutMfa.success).toBe(true);
      if (parsedWithoutMfa.success) {
        expect(parsedWithoutMfa.data.mfaEnabled).toBe(false);
      }

      // Rejects unknown role
      expect(
        usersResponseSchema.userProfile.safeParse({
          id: "018f4a7b-3b32-7264-b0cf-5b1234567890",
          email: "user@example.com",
          role: "UNKNOWN_ROLE",
          isEmailVerified: true,
          createdAt: new Date(),
        }).success,
      ).toBe(false);
    });
  });

  describe("Custom Duration Parser (parseDurationToMs)", () => {
    it("parses duration strings accurately, handles unitless inputs, and rejects invalid formats", () => {
      // Standard time units
      expect(parseDurationToMs("60s")).toBe(60_000);
      expect(parseDurationToMs("15m")).toBe(900_000);
      expect(parseDurationToMs("1h")).toBe(3_600_000);
      expect(parseDurationToMs("1d")).toBe(86_400_000);
      expect(parseDurationToMs("1w")).toBe(7 * 24 * 60 * 60 * 1000);
      expect(parseDurationToMs("1y")).toBe(365 * 24 * 60 * 60 * 1000);

      // Unitless default (seconds) and whitespace handling
      expect(parseDurationToMs("60")).toBe(60_000);
      expect(parseDurationToMs("  15 M  ")).toBe(900_000);

      // Rejects invalid formats
      expect(() => parseDurationToMs("invalid")).toThrow(
        /Invalid duration format/,
      );
      expect(() => parseDurationToMs("")).toThrow(/Invalid duration format/);
      expect(() => parseDurationToMs("-15m")).toThrow(
        /Invalid duration format/,
      );
    });
  });
});
