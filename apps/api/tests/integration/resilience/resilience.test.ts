import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { authService } from "../../../src/modules/auth/auth.service.js";
import { usersService } from "../../../src/modules/users/users.service.js";
import { usersRepository } from "../../../src/modules/users/users.repository.js";
import { authorizationService } from "../../../src/modules/authorization/authorization.service.js";
import {
  prisma,
  redis,
  getTestApp,
  createVerifiedUser,
  createAdmin,
  createSession,
  cleanTestState,
  ensureBaselineSeed,
  flushRedis,
  getLastSentMagicLinkEmail,
} from "../../helpers/index.js";
import { PERMISSIONS, ROLES } from "@authsphere/shared";
import { Prisma } from "../../../src/generated/prisma/client.js";

describe("Resilience & Invariants (Concurrency, Fail-Open, Constraints)", () => {
  const app = getTestApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Concurrency & Anti-Replay Invariants", () => {
    it("concurrent refresh token requests: at most one succeeds, other rejected as reuse", async () => {
      const { user, password } = await createVerifiedUser();
      const loginResult = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );
      if (loginResult.mfaRequired) throw new Error("Expected tokens");

      const token = loginResult.tokens.refreshToken;

      const results = await Promise.allSettled([
        authService.refreshToken("127.0.0.1", "Agent-A", token),
        authService.refreshToken("127.0.0.1", "Agent-B", token),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBeLessThanOrEqual(1);
      expect(rejected.length).toBeGreaterThanOrEqual(1);
    });

    it("concurrent admin demotion: write-skew prevented, last admin invariant preserved", async () => {
      const { user: adminA } = await createAdmin();
      const { user: adminB } = await createAdmin();

      const initialAdminCount = await usersRepository.countUsersByRole("ADMIN");
      expect(initialAdminCount).toBe(2);

      const results = await Promise.allSettled([
        usersRepository.updateUserRole(adminA.id, "USER"),
        usersRepository.updateUserRole(adminB.id, "USER"),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const remainingAdminCount =
        await usersRepository.countUsersByRole("ADMIN");
      expect(remainingAdminCount).toBe(1);
    });

    it("concurrent magic link verification: token consumed only once", async () => {
      const { user } = await createVerifiedUser();
      await authService.sendMagicLink({ email: user.email });

      const email = getLastSentMagicLinkEmail();
      expect(email).toBeDefined();

      const results = await Promise.allSettled([
        authService.verifyMagicLink({ token: email!.token }, "127.0.0.1"),
        authService.verifyMagicLink({ token: email!.token }, "127.0.0.1"),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
    });
  });

  describe("Database Constraints & Graceful 404/400 Handling", () => {
    it("handles queries for non-existent UUIDs gracefully with 404 AppError", async () => {
      const nonExistentId = "01912345-6789-7abc-def0-123456789abc";

      await expect(usersService.getUser(nonExistentId)).rejects.toMatchObject({
        statusCode: 404,
        message: "User not found",
      });
    });

    it("rejects expired or corrupt verification tokens with clean 400 error", async () => {
      await expect(
        authService.verifyEmail({ token: "totally-invalid-or-expired-token" }),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid or expired verification token",
      });
    });

    it("foreign key constraint prevents creating orphaned sessions in PostgreSQL", async () => {
      const nonExistentUserId = "01912345-6789-7abc-def0-123456789abc";

      await expect(
        prisma.session.create({
          data: {
            userId: nonExistentUserId,
            tokenHash:
              "dummy-hash-value-000000000000000000000000000000000000000000000000",
            expiresAt: new Date(Date.now() + 60000),
            ipAddress: "127.0.0.1",
          },
        }),
      ).rejects.toThrowError(Prisma.PrismaClientKnownRequestError);
    });
  });

  describe("Redis Failure & Graceful Degradation", () => {
    it("rateLimiter fails-open when Redis throws an unexpected error", async () => {
      vi.spyOn(redis, "multi").mockImplementation(() => {
        throw new Error("Redis connection timed out / socket closed");
      });

      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
    });

    it("authorizationService falls back to PostgreSQL when Redis cache is unavailable", async () => {
      vi.spyOn(redis, "get").mockRejectedValue(new Error("Redis ECONNREFUSED"));

      const permissions =
        await authorizationService.getPermissionsByRole("USER");

      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain(PERMISSIONS.PROFILE_READ);
    });
  });

  describe("Test Infrastructure & State Cleanup Invariants", () => {
    it("cleanTestState clears dynamic entities and Redis DB while preserving baseline roles/permissions", async () => {
      // 1. Create dynamic state in DB and Redis
      const { user } = await createVerifiedUser();
      await createSession(user.id);
      await prisma.securityEvent.create({
        data: { userId: user.id, type: "LOGIN_SUCCESS" },
      });
      await redis.set("test:cleanup:key", "sample-value", "EX", 60);

      // Verify records exist
      expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
      expect(await prisma.session.count({ where: { userId: user.id } })).toBe(
        1,
      );
      expect(
        await prisma.securityEvent.count({ where: { userId: user.id } }),
      ).toBe(1);
      expect(await redis.get("test:cleanup:key")).toBe("sample-value");

      // 2. Execute cleanTestState()
      await cleanTestState();

      // 3. Assert all dynamic tables are purged
      expect(await prisma.user.count()).toBe(0);
      expect(await prisma.session.count()).toBe(0);
      expect(await prisma.securityEvent.count()).toBe(0);
      expect(await prisma.magicLinkToken.count()).toBe(0);
      expect(await prisma.passwordResetToken.count()).toBe(0);
      expect(await prisma.emailVerificationToken.count()).toBe(0);
      expect(await prisma.mfaChallenge.count()).toBe(0);

      // 4. Assert baseline roles and permissions are preserved
      expect(await prisma.role.count({ where: { name: ROLES.USER } })).toBe(1);
      expect(await prisma.role.count({ where: { name: ROLES.ADMIN } })).toBe(1);
      const permCount = await prisma.permission.count();
      expect(permCount).toBeGreaterThanOrEqual(Object.keys(PERMISSIONS).length);

      // 5. Assert Redis DB #1 is flushed
      expect(await redis.get("test:cleanup:key")).toBeNull();
      expect(await redis.dbsize()).toBe(0);
    });
  });
});
