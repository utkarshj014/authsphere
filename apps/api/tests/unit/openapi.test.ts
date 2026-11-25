import { describe, it, expect } from "vitest";
import {
  getOpenApiDocument,
  clearOpenApiCache,
} from "../../src/common/openapi/index.js";
import { env } from "../../src/config/env.js";
import { healthRouter } from "../../src/modules/health/index.js";
import { authRouter } from "../../src/modules/auth/index.js";
import { sessionsRouter } from "../../src/modules/sessions/index.js";
import { usersRouter } from "../../src/modules/users/index.js";
import { rolesRouter } from "../../src/modules/roles/index.js";

describe("OpenAPI Specification Unit Tests", () => {
  const doc = getOpenApiDocument();
  const paths = (doc.paths ?? {}) as Record<string, any>;

  it("generates a valid OpenAPI 3.1 specification with cookie security", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.title).toBe("AuthSphere API");
    expect(doc.servers).toEqual([
      {
        url: "/api",
        description: "Frontend Proxy (localhost:5173 - Default)",
      },
      {
        url: "/",
        description: "Direct Backend Host (localhost:3000)",
      },
    ]);
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

  it("configures /api proxy server in production mode", () => {
    const originalEnv = env.NODE_ENV;
    try {
      (env as any).NODE_ENV = "production";
      clearOpenApiCache();
      const prodDoc = getOpenApiDocument();
      expect(prodDoc.servers).toEqual([
        {
          url: "/api",
          description: "AuthSphere API (Production Proxy)",
        },
      ]);
    } finally {
      (env as any).NODE_ENV = originalEnv;
      clearOpenApiCache();
    }
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

    // Invariant: Exact count equality (34 operations) and identical operation set
    expect(openApiOperations).toHaveLength(34);
    expect(openApiOperations.sort()).toEqual(expressOperations.sort());
  });
});
