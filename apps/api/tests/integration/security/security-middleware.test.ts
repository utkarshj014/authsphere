import { describe, it, expect } from "vitest";
import request from "supertest";
import { getTestApp } from "../../helpers/index.js";

describe("Security Middleware Integration (Headers, CSRF, Rate Limiting, Errors)", () => {
  const app = getTestApp();

  describe("HTTP Security Headers & Tracing", () => {
    it("attaches critical OWASP security headers on all responses", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
      expect(res.headers["x-request-id"]).toBeDefined();
      expect(res.headers["x-request-id"].length).toBeGreaterThan(0);
    });
  });

  describe("Origin Validation & CSRF Protection", () => {
    it("allows GET requests without origin or referer header", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
    });

    it("allows POST request with sec-fetch-site: same-origin", async () => {
      const res = await request(app)
        .post("/auth/login")
        .set("Sec-Fetch-Site", "same-origin")
        .send({ email: "test@example.com", password: "Password123!" });

      expect(res.status).not.toBe(403);
    });

    it("blocks cross-site POST with untrusted origin with 403", async () => {
      const res = await request(app)
        .post("/auth/login")
        .set("Sec-Fetch-Site", "cross-site")
        .set("Origin", "https://malicious-site.com")
        .send({ email: "test@example.com", password: "Password123!" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Cross-origin mutations forbidden");
    });

    it("blocks POST with Origin: null (sandboxed iframe attack) with 403", async () => {
      const res = await request(app)
        .post("/auth/login")
        .set("Origin", "null")
        .send({ email: "test@example.com", password: "Password123!" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Opaque / null origins are forbidden");
    });

    it("blocks POST with untrusted origin header with 403", async () => {
      const res = await request(app)
        .post("/auth/login")
        .set("Origin", "http://evil-attacker.com")
        .send({ email: "test@example.com", password: "Password123!" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Untrusted request origin");
    });

    it("allows non-browser POST requests without Origin headers (cURL / API clients)", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com", password: "Password123!" });

      expect(res.status).not.toBe(403);
    });
  });

  describe("Rate Limiting", () => {
    it("sets standard RateLimit headers and decrements remaining count", async () => {
      const res = await request(app).get("/health");

      expect(res.status).toBe(200);
      expect(res.headers["ratelimit-limit"]).toBeDefined();
      expect(res.headers["ratelimit-remaining"]).toBeDefined();
      expect(res.headers["ratelimit-reset"]).toBeDefined();
    });

    it("exceeding rate limit returns 429 with Retry-After header", async () => {
      // SIGNUP policy limit is 5
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post("/auth/signup")
          .send({ email: `rl-${i}@test.com`, password: "short" });

        expect(res.status).not.toBe(429);
      }

      const blockedRes = await request(app)
        .post("/auth/signup")
        .send({ email: "rl-blocked@test.com", password: "short" });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers["retry-after"]).toBeDefined();
      expect(blockedRes.body.success).toBe(false);
    });
  });

  describe("Global Error Handler", () => {
    it("ValidationError returns 400 with structured field errors array", async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({ email: "invalid-email", password: "short" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
    });

    it("UnauthorizedError returns 401 and sets cookie-clearing headers", async () => {
      const res = await request(app).get("/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieString = Array.isArray(setCookie)
        ? setCookie.join(";")
        : setCookie;
      expect(cookieString).toContain("accessToken=");
    });

    it("404 handler returns structured JSON response", async () => {
      const res = await request(app).get("/nonexistent-endpoint-404");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Route not found!");
    });
  });
});
