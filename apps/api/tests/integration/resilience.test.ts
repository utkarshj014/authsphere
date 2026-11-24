import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import {
  app,
  prisma,
  redis,
  createVerifiedUser,
  createAdmin,
} from "../helpers/index.js";
import { authService } from "../../src/modules/auth/auth.service.js";
import type { AuthTokens } from "../../src/modules/auth/auth.types.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";
import { authorizationService } from "../../src/modules/authorization/authorization.service.js";
import { healthRepository } from "../../src/modules/health/health.repository.js";
import { hashToken } from "../../src/lib/crypto/token.js";
import { PERMISSIONS } from "@authsphere/shared";

describe("Resilience, Concurrency & Health Probes Integration Suite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Concurrent Refresh Token Rotation & Anti-Replay", () => {
    it("concurrent refresh token rotation: CAS atomic swap & leeway grace window collapse into synchronized tokens", async () => {
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

      const fulfilled = results.filter(
        (r): r is PromiseFulfilledResult<AuthTokens> =>
          r.status === "fulfilled",
      );
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(2);
      expect(rejected.length).toBe(0);

      // Both concurrent requests collapse into identical synchronized tokens
      expect(fulfilled[0].value.refreshToken).toBe(
        fulfilled[1].value.refreshToken,
      );
      expect(fulfilled[0].value.accessToken).toBe(
        fulfilled[1].value.accessToken,
      );

      // Verify the session in DB was updated with the rotated token hash
      const session = await prisma.session.findFirst({
        where: { userId: user.id },
      });
      expect(session).toBeDefined();
      expect(session!.tokenHash).toBe(
        hashToken(fulfilled[0].value.refreshToken),
      );
    });

    it("deterministic race condition: bounded retry resolves cleanly when loser checks leeway cache during active swap", async () => {
      const { user, password } = await createVerifiedUser();
      const loginResult = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );
      if (loginResult.mfaRequired) throw new Error("Expected tokens");

      const currentRefreshToken = loginResult.tokens.refreshToken;

      let releaseWinner: () => void;
      const winnerPaused = new Promise<void>((resolve) => {
        releaseWinner = resolve;
      });

      let loserReachedFirstCacheCheck: () => void;
      const loserAtCache = new Promise<void>((resolve) => {
        loserReachedFirstCacheCheck = resolve;
      });

      let winnerStartedPublishing = false;
      const originalRedisSet = redis.set.bind(redis);
      const originalRedisGet = redis.get.bind(redis);

      vi.spyOn(redis, "set").mockImplementation(async (...args: unknown[]) => {
        winnerStartedPublishing = true;
        await winnerPaused;
        // @ts-expect-error ioredis overload
        return originalRedisSet(...args);
      });

      vi.spyOn(redis, "get").mockImplementation(async (...args: unknown[]) => {
        // @ts-expect-error ioredis overload
        const val = await originalRedisGet(...args);
        if (winnerStartedPublishing && val === null) {
          loserReachedFirstCacheCheck();
        }
        return val;
      });

      try {
        const winnerPromise = authService.refreshToken(
          "127.0.0.1",
          "Winner-Agent",
          currentRefreshToken,
        );

        const loserPromise = (async () => {
          await new Promise((r) => setTimeout(r, 10));
          return authService.refreshToken(
            "127.0.0.1",
            "Loser-Agent",
            currentRefreshToken,
          );
        })();

        await loserAtCache;
        releaseWinner!();

        const [winnerRes, loserRes] = await Promise.all([
          winnerPromise,
          loserPromise,
        ]);

        expect(winnerRes.accessToken).toBeDefined();
        expect(loserRes.accessToken).toBeDefined();
        expect(loserRes.refreshToken).toBe(winnerRes.refreshToken);
        expect(loserRes.accessToken).toBe(winnerRes.accessToken);
      } finally {
        vi.restoreAllMocks();
      }
    });

    it("refresh token reuse outside leeway window triggers compromise detection and revokes all user sessions", async () => {
      const { user, password } = await createVerifiedUser();
      const loginResult = await authService.login(
        { email: user.email, password },
        "127.0.0.1",
      );
      if (loginResult.mfaRequired) throw new Error("Expected tokens");

      const token = loginResult.tokens.refreshToken;

      // Rotate token once
      await authService.refreshToken("127.0.0.1", "Agent-A", token);

      // Invalidate grace leeway window in Redis
      await redis.flushdb();

      // Subsequent presentation of the consumed token outside grace period triggers compromise defense
      await expect(
        authService.refreshToken("127.0.0.1", "Agent-B", token),
      ).rejects.toMatchObject({
        statusCode: 401,
        message: "Compromised session detected",
      });

      const remainingSessions = await prisma.session.findMany({
        where: { userId: user.id },
      });
      expect(remainingSessions).toHaveLength(0);
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
  });

  describe("Redis Outage Resilience & Graceful Degradation", () => {
    it("rateLimiter fails-open when Redis throws an unexpected error", async () => {
      vi.spyOn(redis, "eval").mockRejectedValue(
        new Error("Redis connection timed out / socket closed"),
      );

      const res = await request(app).get("/openapi.json");
      expect(res.status).toBe(200);
    });

    it("authorizationService falls back to PostgreSQL when Redis cache is unavailable", async () => {
      vi.spyOn(redis, "get").mockRejectedValue(
        new Error("Redis connection refused"),
      );

      const permissions =
        await authorizationService.getPermissionsByRole("USER");

      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toContain(PERMISSIONS.PROFILE_READ);
    });
  });

  describe("Health Probes (/health/live & /health/ready)", () => {
    it("GET /health/live: zero I/O liveness probe returns 200 OK even if DB and Redis are unreachable", async () => {
      const dbSpy = vi.spyOn(prisma, "$queryRaw");
      const redisPingSpy = vi.spyOn(redis, "ping");

      vi.spyOn(healthRepository, "checkDatabase").mockRejectedValue(
        new Error("DB offline"),
      );
      vi.spyOn(healthRepository, "checkRedis").mockRejectedValue(
        new Error("Redis offline"),
      );

      const res = await request(app).get("/health/live");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("UP");
      expect(typeof res.body.data.timestamp).toBe("string");

      // Invariant: zero external I/O on liveness probe
      expect(dbSpy).not.toHaveBeenCalled();
      expect(redisPingSpy).not.toHaveBeenCalled();
    });

    it("GET /health/ready: dependency readiness probe returns 200 when ready, 503 when DB or Redis is down", async () => {
      // 1. All dependencies available
      const healthyRes = await request(app).get("/health/ready");
      expect(healthyRes.status).toBe(200);
      expect(healthyRes.body.data.status).toBe("UP");
      expect(healthyRes.body.data.database).toBe("UP");
      expect(healthyRes.body.data.redis).toBe("UP");

      // 2. PostgreSQL unavailable
      vi.spyOn(healthRepository, "checkDatabase").mockRejectedValueOnce(
        new Error("PostgreSQL pool exhausted"),
      );
      const dbDownRes = await request(app).get("/health/ready");
      expect(dbDownRes.status).toBe(503);
      expect(dbDownRes.body.data.status).toBe("DOWN");
      expect(dbDownRes.body.data.database).toBe("DOWN");

      // 3. Redis unavailable
      vi.spyOn(healthRepository, "checkRedis").mockRejectedValueOnce(
        new Error("Redis ECONNREFUSED"),
      );
      const redisDownRes = await request(app).get("/health/ready");
      expect(redisDownRes.status).toBe(503);
      expect(redisDownRes.body.data.status).toBe("DOWN");
      expect(redisDownRes.body.data.redis).toBe("DOWN");
    });
  });
});
