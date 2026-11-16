import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { redis } from "../../src/lib/redis.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import { authService } from "../../src/modules/auth/auth.service.js";
import { signRefreshToken } from "../../src/lib/jwt/index.js";
import { UnauthorizedError } from "../../src/common/errors/index.js";

const mockSession = {
  id: "018f0000-0000-7000-8000-000000000001",
  userId: "018f0000-0000-7000-8000-000000000002",
  tokenHash: "initial-token-hash",
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  user: {
    role: {
      name: "USER" as const,
    },
  },
};

describe("ADR-076 Refresh Token Rotation Concurrency & Failure Invariants", () => {
  let redisStorage: Map<string, string>;
  let redisStatus: string;
  const originalStatusDescriptor = Object.getOwnPropertyDescriptor(
    redis,
    "status",
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    redisStorage = new Map<string, string>();
    redisStatus = "ready";

    Object.defineProperty(redis, "status", {
      get: () => redisStatus,
      configurable: true,
    });

    vi.spyOn(authRepository, "findSessionById").mockResolvedValue(
      mockSession as any,
    );
    vi.spyOn(authRepository, "deleteSessionById").mockResolvedValue(
      undefined as any,
    );
    vi.spyOn(authRepository, "deleteAllSessionsByUserId").mockResolvedValue(
      undefined as any,
    );
    vi.spyOn(authRepository, "createSecurityEvent").mockResolvedValue(
      undefined as any,
    );

    vi.spyOn(redis, "get").mockImplementation(async (key: string) => {
      if (redisStatus !== "ready") return null;
      return redisStorage.get(key) ?? null;
    });

    vi.spyOn(redis, "set").mockImplementation(
      async (key: string, value: string) => {
        if (redisStatus !== "ready") return "OK" as any;
        redisStorage.set(key, value);
        return "OK" as any;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalStatusDescriptor) {
      Object.defineProperty(redis, "status", originalStatusDescriptor);
    }
  });

  it("deterministic race: pauses winner after CAS until loser checks cache, then resolves cleanly via bounded retry", async () => {
    const token = await signRefreshToken({
      sub: mockSession.userId,
      sid: mockSession.id,
      role: mockSession.user.role.name,
    });

    // Winner wins CAS; Loser loses CAS
    let casExecutionCount = 0;
    let loserCasFailed = false;

    vi.spyOn(authRepository, "rotateSession").mockImplementation(async () => {
      casExecutionCount++;
      if (casExecutionCount === 1) {
        return true; // Winner wins CAS
      }
      loserCasFailed = true; // Loser loses CAS
      return false;
    });

    // Synchronization primitives to orchestrate deterministic interleaving
    let releaseWinner: () => void;
    const winnerPaused = new Promise<void>((resolve) => {
      releaseWinner = resolve;
    });

    let loserReachedPostCasCacheCheck: () => void;
    const loserAtPostCasCache = new Promise<void>((resolve) => {
      loserReachedPostCasCacheCheck = resolve;
    });

    // Winner enters setLeewayCache -> redis.set
    // Pause winner right after CAS before the cache is committed to Redis
    vi.spyOn(redis, "set").mockImplementation(
      async (key: string, value: string) => {
        await winnerPaused;
        redisStorage.set(key, value);
        return "OK" as any;
      },
    );

    // Loser calls getLeewayCache
    vi.spyOn(redis, "get").mockImplementation(async (key: string) => {
      const val = redisStorage.get(key) ?? null;
      // Only signal when the loser checks the cache AFTER losing CAS
      if (loserCasFailed && val === null) {
        loserReachedPostCasCacheCheck();
      }
      return val;
    });

    // Start winner request
    const winnerPromise = authService.refreshToken(
      "127.0.0.1",
      "Winner-Agent",
      token,
    );

    // Start loser request concurrently
    const loserPromise = (async () => {
      // Small tick to ensure winner enters refreshToken first
      await new Promise((r) => setTimeout(r, 10));
      return authService.refreshToken("127.0.0.1", "Loser-Agent", token);
    })();

    // Await loser reaching the post-CAS leeway cache lookup (finding null and entering 150ms sleep)
    await loserAtPostCasCache;

    // Release winner to write the cached tokens and finish
    releaseWinner!();

    // Both requests must complete successfully
    const [winnerRes, loserRes] = await Promise.all([
      winnerPromise,
      loserPromise,
    ]);

    expect(winnerRes.accessToken).toBeDefined();
    expect(loserRes.accessToken).toBeDefined();
    // Loser must cleanly retrieve the winner's cached tokens on retry
    expect(loserRes.refreshToken).toBe(winnerRes.refreshToken);
    expect(loserRes.accessToken).toBe(winnerRes.accessToken);

    // Verify session was NOT revoked
    expect(authRepository.deleteSessionById).not.toHaveBeenCalled();
    expect(authRepository.deleteAllSessionsByUserId).not.toHaveBeenCalled();
  });

  it("redis-unavailable path: when Redis is down, CAS loser cannot retrieve cached tokens and revokes session", async () => {
    const token = await signRefreshToken({
      sub: mockSession.userId,
      sid: mockSession.id,
      role: mockSession.user.role.name,
    });

    // Winner succeeds in PostgreSQL CAS
    vi.spyOn(authRepository, "rotateSession").mockResolvedValueOnce(true);

    const winnerTokens = await authService.refreshToken(
      "127.0.0.1",
      "Winner-Agent",
      token,
    );
    expect(winnerTokens.refreshToken).toBeDefined();

    // Simulate Redis status as disconnected/closed before loser runs
    redisStatus = "close";

    // Now loser presents the consumed token.
    // PostgreSQL CAS fails because token was already rotated.
    vi.spyOn(authRepository, "rotateSession").mockResolvedValueOnce(false);

    // Loser cannot read leeway cache because Redis is down,
    // so it must classify this as a replay attack, revoke the session, and reject.
    await expect(
      authService.refreshToken("127.0.0.1", "Loser-Agent", token),
    ).rejects.toThrowError(UnauthorizedError);

    // Verify session was revoked to mitigate potential token theft
    expect(authRepository.deleteSessionById).toHaveBeenCalledWith(
      mockSession.id,
    );
  });

  it("security guard: rejects leeway cache hits if session was explicitly revoked in DB after rotation", async () => {
    const token = await signRefreshToken({
      sub: mockSession.userId,
      sid: mockSession.id,
      role: mockSession.user.role.name,
    });

    // 1. Initial refresh succeeds and caches rotated token pair in Redis leeway cache
    vi.spyOn(authRepository, "rotateSession").mockResolvedValueOnce(true);
    const winnerTokens = await authService.refreshToken(
      "127.0.0.1",
      "Winner-Agent",
      token,
    );
    expect(winnerTokens.refreshToken).toBeDefined();

    // 2. Explicit session revocation occurs (e.g. user logs out or session is remotely terminated)
    vi.spyOn(authRepository, "findSessionById").mockResolvedValue(null);

    // 3. Replay old token during the remaining leeway cache TTL (cache hit in Redis)
    // Must NOT return cached credentials; must detect that the session was revoked and throw 401
    await expect(
      authService.refreshToken("127.0.0.1", "Replay-Agent", token),
    ).rejects.toThrowError(new UnauthorizedError("Invalid session"));
  });

  it("redis-unavailable path under GLOBAL mode: revokes all sessions across all devices on replay", async () => {
    const token = await signRefreshToken({
      sub: mockSession.userId,
      sid: mockSession.id,
      role: mockSession.user.role.name,
    });

    // Configure GLOBAL revocation mode
    const { env } = await import("../../src/config/env.js");
    const originalMode = env.AUTH_REUSE_DELETION_MODE;
    (env as any).AUTH_REUSE_DELETION_MODE = "GLOBAL";

    try {
      // Rotate first
      vi.spyOn(authRepository, "rotateSession").mockResolvedValueOnce(true);
      await authService.refreshToken("127.0.0.1", "Winner-Agent", token);

      // Simulate Redis outage
      redisStatus = "close";

      // CAS fails for loser
      vi.spyOn(authRepository, "rotateSession").mockResolvedValueOnce(false);

      await expect(
        authService.refreshToken("127.0.0.1", "Loser-Agent", token),
      ).rejects.toThrowError(UnauthorizedError);

      // In GLOBAL mode, deleteAllSessionsByUserId must be invoked
      expect(authRepository.deleteAllSessionsByUserId).toHaveBeenCalledWith(
        mockSession.userId,
      );
    } finally {
      (env as any).AUTH_REUSE_DELETION_MODE = originalMode;
    }
  });
});
