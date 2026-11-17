import { describe, it, expect } from "vitest";
import {
  authSchema,
  authResponseSchema,
} from "../../src/modules/auth/auth.validation.js";
import {
  usersSchema,
  usersResponseSchema,
} from "../../src/modules/users/users.validation.js";
import { rolesSchema } from "../../src/modules/roles/roles.validation.js";
import { parseDurationToMs } from "../../src/common/utils/time.js";

describe("Validation Schemas & Utilities Unit Tests", () => {
  describe("Auth Validation Schemas", () => {
    it("validates signup payload correctly", () => {
      expect(
        authSchema.signup.safeParse({
          email: "user@example.com",
          password: "ValidPassword123!",
          firstName: "Alice",
          lastName: "Smith",
        }).success,
      ).toBe(true);

      expect(
        authSchema.signup.safeParse({
          email: "invalid-email",
          password: "ValidPassword123!",
        }).success,
      ).toBe(false);

      expect(
        authSchema.signup.safeParse({
          email: "user@example.com",
          password: "short",
        }).success,
      ).toBe(false);
    });

    it("validates login payload correctly", () => {
      expect(
        authSchema.login.safeParse({
          email: "user@example.com",
          password: "Password123!",
        }).success,
      ).toBe(true);

      expect(
        authSchema.login.safeParse({ email: "user@example.com" }).success,
      ).toBe(false);
      expect(
        authSchema.login.safeParse({ password: "Password123!" }).success,
      ).toBe(false);
    });

    it("validates resetPassword payload with optional TOTP/backup codes", () => {
      expect(
        authSchema.resetPassword.safeParse({
          token: "some-reset-token-hex",
          password: "NewStrongPassword123!",
        }).success,
      ).toBe(true);

      expect(
        authSchema.resetPassword.safeParse({
          token: "token",
          password: "NewStrongPassword123!",
          code: "123456",
        }).success,
      ).toBe(true);

      expect(
        authSchema.resetPassword.safeParse({
          token: "token",
          password: "NewStrongPassword123!",
          code: "ABCDE-12345",
        }).success,
      ).toBe(true);

      expect(
        authSchema.resetPassword.safeParse({
          token: "token",
          password: "NewStrongPassword123!",
          code: "invalid-code-shape",
        }).success,
      ).toBe(false);
    });

    it("validates and paginates securityEventsQuery", () => {
      const defaultQuery = authSchema.securityEventsQuery.safeParse({});
      expect(defaultQuery.success).toBe(true);
      if (defaultQuery.success) {
        expect(defaultQuery.data.page).toBe(1);
        expect(defaultQuery.data.limit).toBe(20);
      }

      const coercedQuery = authSchema.securityEventsQuery.safeParse({
        page: "2",
        limit: "50",
      });
      expect(coercedQuery.success).toBe(true);
      if (coercedQuery.success) {
        expect(coercedQuery.data.page).toBe(2);
        expect(coercedQuery.data.limit).toBe(50);
      }

      expect(
        authSchema.securityEventsQuery.safeParse({ limit: 101 }).success,
      ).toBe(false);
      expect(
        authSchema.securityEventsQuery.safeParse({ page: 0 }).success,
      ).toBe(false);
    });

    it("validates oauthCallbackQuery payload", () => {
      expect(
        authSchema.oauthCallbackQuery.safeParse({
          code: "auth-code-123",
          state: "state-token-456",
        }).success,
      ).toBe(true);

      expect(
        authSchema.oauthCallbackQuery.safeParse({
          code: "",
          state: "state-token-456",
        }).success,
      ).toBe(false);
    });

    it("validates mfaVerifyLogin response shape", () => {
      expect(authResponseSchema.mfaVerifyLogin.safeParse(null).success).toBe(
        true,
      );

      expect(
        authResponseSchema.mfaVerifyLogin.safeParse({
          lowRecoveryCodesWarning: true,
          remainingRecoveryCodes: 2,
        }).success,
      ).toBe(true);

      expect(
        authResponseSchema.mfaVerifyLogin.safeParse({
          lowRecoveryCodesWarning: "invalid",
        }).success,
      ).toBe(false);
    });
  });

  describe("Users & Roles Validation Schemas", () => {
    it("validates UUIDs and role names", () => {
      expect(usersSchema.getUser.safeParse({ id: "not-a-uuid" }).success).toBe(
        false,
      );
      expect(usersSchema.role.safeParse({ roleName: "USER" }).success).toBe(
        true,
      );
      expect(usersSchema.role.safeParse({ roleName: "ADMIN" }).success).toBe(
        true,
      );
      expect(
        usersSchema.role.safeParse({ roleName: "SUPERADMIN" }).success,
      ).toBe(false);
    });

    it("validates usersResponseSchema.userProfile strict roles and mfaEnabled", () => {
      expect(
        usersResponseSchema.userProfile.safeParse({
          id: "018f4a7b-3b32-7264-b0cf-5b1234567890",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "USER",
          mfaEnabled: true,
          isEmailVerified: true,
          createdAt: new Date(),
        }).success,
      ).toBe(true);

      // Defaults mfaEnabled to false when omitted
      const resWithoutMfa = usersResponseSchema.userProfile.safeParse({
        id: "018f4a7b-3b32-7264-b0cf-5b1234567890",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        role: "USER",
        isEmailVerified: true,
        createdAt: new Date(),
      });
      expect(resWithoutMfa.success).toBe(true);
      if (resWithoutMfa.success) {
        expect(resWithoutMfa.data.mfaEnabled).toBe(false);
      }

      expect(
        usersResponseSchema.userProfile.safeParse({
          id: "018f4a7b-3b32-7264-b0cf-5b1234567890",
          email: "user@example.com",
          firstName: null,
          lastName: null,
          role: "UNKNOWN_ROLE",
          isEmailVerified: true,
          createdAt: new Date(),
        }).success,
      ).toBe(false);
    });

    it("validates usersSchema.listUsersQuery pagination parameters", () => {
      const parsedDefault = usersSchema.listUsersQuery.parse({});
      expect(parsedDefault.page).toBe(1);
      expect(parsedDefault.limit).toBe(20);

      const parsedExplicit = usersSchema.listUsersQuery.parse({
        page: "3",
        limit: "50",
      });
      expect(parsedExplicit.page).toBe(3);
      expect(parsedExplicit.limit).toBe(50);

      // Rejects negative/zero page
      expect(usersSchema.listUsersQuery.safeParse({ page: 0 }).success).toBe(
        false,
      );
      expect(usersSchema.listUsersQuery.safeParse({ page: -1 }).success).toBe(
        false,
      );

      // Rejects limit exceeding 100
      expect(usersSchema.listUsersQuery.safeParse({ limit: 101 }).success).toBe(
        false,
      );
    });

    it("validates usersResponseSchema.paginatedUsers response shape", () => {
      const parsed = usersResponseSchema.paginatedUsers.safeParse({
        users: [
          {
            id: "018f4a7b-3b32-7264-b0cf-5b1234567890",
            email: "admin@example.com",
            firstName: "Admin",
            lastName: "User",
            role: "ADMIN",
            mfaEnabled: true,
            isEmailVerified: true,
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          totalCount: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });

      expect(parsed.success).toBe(true);
    });

    it("validates role permissions query and update schemas", () => {
      expect(
        rolesSchema.getRolePermissionsParams.safeParse({
          roleName: "USER",
        }).success,
      ).toBe(true);
      expect(
        rolesSchema.getRolePermissionsParams.safeParse({
          roleName: "ADMIN",
        }).success,
      ).toBe(true);
      expect(
        rolesSchema.getRolePermissionsParams.safeParse({
          roleName: "SUPERADMIN",
        }).success,
      ).toBe(false);

      expect(
        rolesSchema.updatePermissionsParams.safeParse({
          roleName: "USER",
        }).success,
      ).toBe(true);
      expect(
        rolesSchema.updatePermissionsParams.safeParse({
          roleName: "INVALID",
        }).success,
      ).toBe(false);

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

  describe("Duration Parser (parseDurationToMs)", () => {
    it("parses time durations into milliseconds accurately", () => {
      expect(parseDurationToMs("60s")).toBe(60_000);
      expect(parseDurationToMs("15m")).toBe(900_000);
      expect(parseDurationToMs("1h")).toBe(3_600_000);
      expect(parseDurationToMs("1d")).toBe(86_400_000);
      expect(parseDurationToMs("1w")).toBe(7 * 24 * 60 * 60 * 1000);
      expect(parseDurationToMs("1y")).toBe(365 * 24 * 60 * 60 * 1000);
    });

    it("handles unitless strings and whitespace", () => {
      expect(parseDurationToMs("60")).toBe(60_000);
      expect(parseDurationToMs("  15 M  ")).toBe(900_000);
    });

    it("throws for invalid formats", () => {
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
