import { describe, it, expect } from "vitest";
import { authSchema } from "../../src/modules/auth/auth.validation.js";
import { usersSchema } from "../../src/modules/users/users.validation.js";
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

    it("validates and deduplicates role permissions update body", () => {
      expect(
        rolesSchema.updatePermissionsParams.safeParse({ roleName: "USER" })
          .success,
      ).toBe(true);
      expect(
        rolesSchema.updatePermissionsParams.safeParse({ roleName: "INVALID" })
          .success,
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
