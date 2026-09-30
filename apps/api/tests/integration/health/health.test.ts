import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import { getTestApp, prisma, redis } from "../../helpers/index.js";
import { healthRepository } from "../../../src/modules/health/health.repository.js";

describe("Health Module Integration (/health, /health/live, /health/ready)", () => {
  const app = getTestApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /health/live (Lightweight ALB Liveness Probe)", () => {
    it("returns 200 OK with UP status and ISO timestamp with zero external I/O", async () => {
      const dbSpy = vi.spyOn(prisma, "$queryRaw");
      const redisSpy = vi.spyOn(redis, "ping");

      const res = await request(app).get("/health/live");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("AuthSphere API is live");
      expect(res.body.data.status).toBe("UP");
      expect(typeof res.body.data.timestamp).toBe("string");
      expect(new Date(res.body.data.timestamp).toISOString()).toBe(
        res.body.data.timestamp,
      );

      // Invariant: zero external I/O on liveness probe
      expect(dbSpy).not.toHaveBeenCalled();
      expect(redisSpy).not.toHaveBeenCalled();
    });

    it("still returns 200 OK even if database and Redis are completely unreachable", async () => {
      vi.spyOn(healthRepository, "checkDatabase").mockRejectedValue(
        new Error("Connection refused"),
      );
      vi.spyOn(healthRepository, "checkRedis").mockRejectedValue(
        new Error("Redis offline"),
      );

      const res = await request(app).get("/health/live");

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("UP");
    });
  });

  describe("GET /health (Root Alias)", () => {
    it("delegates to liveness probe and returns 200 OK for backward compatibility", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("UP");
    });
  });

  describe("GET /health/ready (Dependency Readiness Probe)", () => {
    it("returns 200 OK when both PostgreSQL and Redis are available", async () => {
      const res = await request(app).get("/health/ready");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("All dependencies are available");
      expect(res.body.data).toEqual({
        status: "UP",
        database: "UP",
        redis: "UP",
        timestamp: expect.any(String),
      });
    });

    it("returns 503 Service Unavailable when PostgreSQL is unreachable", async () => {
      vi.spyOn(healthRepository, "checkDatabase").mockRejectedValue(
        new Error("PostgreSQL pool exhausted / network down"),
      );

      const res = await request(app).get("/health/ready");

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("One or more dependencies are unavailable");
      expect(res.body.data.status).toBe("DOWN");
      expect(res.body.data.database).toBe("DOWN");
      expect(res.body.data.redis).toBe("UP");
    });

    it("returns 503 Service Unavailable when Redis is unreachable", async () => {
      vi.spyOn(healthRepository, "checkRedis").mockRejectedValue(
        new Error("Redis ECONNREFUSED"),
      );

      const res = await request(app).get("/health/ready");

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("One or more dependencies are unavailable");
      expect(res.body.data.status).toBe("DOWN");
      expect(res.body.data.database).toBe("UP");
      expect(res.body.data.redis).toBe("DOWN");
    });

    it("returns 503 Service Unavailable when both dependencies are unreachable", async () => {
      vi.spyOn(healthRepository, "checkDatabase").mockRejectedValue(
        new Error("Database offline"),
      );
      vi.spyOn(healthRepository, "checkRedis").mockRejectedValue(
        new Error("Redis offline"),
      );

      const res = await request(app).get("/health/ready");

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data.status).toBe("DOWN");
      expect(res.body.data.database).toBe("DOWN");
      expect(res.body.data.redis).toBe("DOWN");
    });
  });
});
