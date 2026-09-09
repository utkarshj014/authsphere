import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { getOpenApiDocument } from "../../src/common/openapi/index.js";
import { healthRouter } from "../../src/modules/health/index.js";
import { authRouter } from "../../src/modules/auth/index.js";
import { sessionsRouter } from "../../src/modules/sessions/index.js";
import { usersRouter } from "../../src/modules/users/index.js";
import { rolesRouter } from "../../src/modules/roles/index.js";

describe("OpenAPI specification", () => {
  const doc = getOpenApiDocument();
  const paths = (doc.paths ?? {}) as Record<string, any>;

  it("generates a valid OpenAPI 3.1 specification with cookie security", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.title).toBe("AuthSphere API");
    expect(doc.components?.securitySchemes).toMatchObject({
      accessTokenCookie: {
        type: "apiKey",
        in: "cookie",
        name: "accessToken",
      },
      refreshTokenCookie: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
      },
    });

    // Verify security schemes are bound to protected endpoints
    expect(paths["/auth/me"]?.get?.security).toEqual([
      { accessTokenCookie: [] },
    ]);
    expect(paths["/auth/refresh-token"]?.post?.security).toEqual([
      { refreshTokenCookie: [] },
    ]);
    expect(paths["/sessions"]?.get?.security).toEqual([
      { accessTokenCookie: [] },
    ]);
  });

  it("maintains strict 1:1 bidirectional parity with Express router definitions", () => {
    const publicRouters = [
      { prefix: "/health", router: healthRouter },
      { prefix: "/auth", router: authRouter },
      { prefix: "/sessions", router: sessionsRouter },
      { prefix: "/users", router: usersRouter },
      { prefix: "/roles", router: rolesRouter },
    ];

    const expressOperations: string[] = [];
    for (const { prefix, router } of publicRouters) {
      for (const layer of (router as any).stack ?? []) {
        if (layer.route?.path) {
          const rawPath = layer.route.path as string;
          const routePath = (prefix + (rawPath === "/" ? "" : rawPath)).replace(
            /:([a-zA-Z0-9_]+)/g,
            "{$1}",
          );

          for (const method of Object.keys(layer.route.methods ?? {})) {
            expressOperations.push(`${method.toUpperCase()} ${routePath}`);
          }
        }
      }
    }

    const openApiOperations = Object.entries(paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    );

    // Invariant: Exact count equality (29 operations) and identical operation set
    expect(openApiOperations).toHaveLength(29);
    expect(openApiOperations.sort()).toEqual(expressOperations.sort());
  });

  describe("HTTP endpoints", () => {
    it("GET /openapi.json returns 200 with valid OpenAPI JSON", async () => {
      const res = await request(app).get("/openapi.json");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.openapi).toBe("3.1.0");
      expect(res.body.paths).toBeDefined();
    });

    it("GET /docs returns 200 with Swagger UI HTML", async () => {
      const res = await request(app).get("/docs/");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/html/);
      expect(res.text).toContain("swagger");
    });
  });
});
