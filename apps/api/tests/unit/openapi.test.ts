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

  // ─── Document structure ───────────────────────────────────────────

  it("generates a valid OpenAPI 3.1 document", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.title).toBe("AuthSphere API");
    expect(doc.info.version).toBe("1.0.0");
  });

  it("defines all expected tags", () => {
    const tagNames = doc.tags?.map((t) => t.name) ?? [];
    const expected = [
      "Health",
      "Auth",
      "MFA",
      "OAuth",
      "Sessions",
      "Users",
      "Roles",
      "Security Events",
    ];
    for (const name of expected) {
      expect(tagNames).toContain(name);
    }
  });

  // ─── Security schemes ─────────────────────────────────────────────

  it("defines cookie-based security schemes", () => {
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
  });

  it("binds the correct security schemes to authenticated routes", () => {
    const paths = doc.paths as Record<string, any>;

    // /auth/me should require accessTokenCookie
    const meGet = paths["/auth/me"]?.get;
    expect(meGet?.security).toEqual([{ accessTokenCookie: [] }]);

    // /auth/refresh-token should require refreshTokenCookie
    const refreshPost = paths["/auth/refresh-token"]?.post;
    expect(refreshPost?.security).toEqual([{ refreshTokenCookie: [] }]);

    // /sessions should require accessTokenCookie
    const sessionsGet = paths["/sessions"]?.get;
    expect(sessionsGet?.security).toEqual([{ accessTokenCookie: [] }]);
  });

  // ─── Express Router ↔ OpenAPI Parity Invariant ───────────────────

  it("maintains strict 1:1 parity with Express router definitions", () => {
    const publicRouters = [
      { prefix: "/health", router: healthRouter },
      { prefix: "/auth", router: authRouter },
      { prefix: "/sessions", router: sessionsRouter },
      { prefix: "/users", router: usersRouter },
      { prefix: "/roles", router: rolesRouter },
    ];

    const expressRoutes: { method: string; path: string }[] = [];
    for (const { prefix, router } of publicRouters) {
      for (const layer of (router as any).stack ?? []) {
        if (layer.route?.path) {
          const rawPath = layer.route.path as string;
          const openApiPath = (
            prefix + (rawPath === "/" ? "" : rawPath)
          ).replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

          for (const method of Object.keys(layer.route.methods ?? {})) {
            expressRoutes.push({
              method: method.toLowerCase(),
              path: openApiPath,
            });
          }
        }
      }
    }

    const docPaths = doc.paths ?? {};
    const documentedPaths = Object.keys(docPaths);
    const uniqueExpressPaths = Array.from(
      new Set(expressRoutes.map((r) => r.path)),
    );

    // 1. Authoritative path count assertion
    expect(documentedPaths.length).toBe(uniqueExpressPaths.length);
    expect(documentedPaths.length).toBe(29);

    // 2. Invariant: Every Express route exists in OpenAPI specification
    for (const route of expressRoutes) {
      const pathItem = docPaths[route.path] as Record<string, any> | undefined;
      expect(
        pathItem,
        `Express path ${route.path} missing from OpenAPI specification`,
      ).toBeDefined();
      expect(
        pathItem?.[route.method],
        `Express route [${route.method.toUpperCase()} ${route.path}] missing from OpenAPI specification`,
      ).toBeDefined();
    }

    // 3. Invariant: Every OpenAPI operation maps back to an active Express route (zero phantom endpoints)
    for (const path of documentedPaths) {
      const operations = Object.keys(docPaths[path] as Record<string, any>);
      for (const method of operations) {
        const matchingRoute = expressRoutes.find(
          (r) => r.path === path && r.method === method.toLowerCase(),
        );
        expect(
          matchingRoute,
          `OpenAPI operation [${method.toUpperCase()} ${path}] has no matching Express route`,
        ).toBeDefined();
      }
    }
  });

  // ─── Component schemas ────────────────────────────────────────────

  it("registers all reusable response and domain component schemas", () => {
    const expectedSchemas = [
      // Generic envelopes
      "SuccessResponse",
      "MessageOnlyResponse",
      "ErrorResponse",
      "ValidationErrorResponse",
      "PaginationMeta",
      // Domain models
      "HealthData",
      "MfaRequiredResponse",
      "CurrentUserProfile",
      "UserProfile",
      "SessionItem",
      "RolePermissions",
      "SecurityEventItem",
    ];

    for (const schemaName of expectedSchemas) {
      expect(
        doc.components?.schemas?.[schemaName],
        `missing component schema: ${schemaName}`,
      ).toBeDefined();
    }
  });

  // ─── Status codes and payload accuracy ────────────────────────────

  it("documents comprehensive status codes for critical operations", () => {
    const paths = doc.paths as Record<string, any>;

    // POST /auth/login must document 200, 400, 401, 403, 429
    const loginResponses = Object.keys(paths["/auth/login"].post.responses);
    expect(loginResponses).toContain("200");
    expect(loginResponses).toContain("400");
    expect(loginResponses).toContain("401");
    expect(loginResponses).toContain("403");
    expect(loginResponses).toContain("429");

    // DELETE /sessions/{id} must document 200, 400, 401, 403, 404, 429
    const deleteSessionResponses = Object.keys(
      paths["/sessions/{id}"].delete.responses,
    );
    expect(deleteSessionResponses).toContain("200");
    expect(deleteSessionResponses).toContain("400");
    expect(deleteSessionResponses).toContain("401");
    expect(deleteSessionResponses).toContain("403");
    expect(deleteSessionResponses).toContain("404");
    expect(deleteSessionResponses).toContain("429");

    // PUT /roles/{roleName}/permissions must document 200, 400, 401, 403, 404, 429
    const rolePutResponses = Object.keys(
      paths["/roles/{roleName}/permissions"].put.responses,
    );
    expect(rolePutResponses).toContain("200");
    expect(rolePutResponses).toContain("400");
    expect(rolePutResponses).toContain("401");
    expect(rolePutResponses).toContain("403");
    expect(rolePutResponses).toContain("404");
    expect(rolePutResponses).toContain("429");

    // GET /users/{id} must document 200, 400, 401, 403, 404, 429
    const userGetResponses = Object.keys(paths["/users/{id}"].get.responses);
    expect(userGetResponses).toContain("200");
    expect(userGetResponses).toContain("400");
    expect(userGetResponses).toContain("401");
    expect(userGetResponses).toContain("403");
    expect(userGetResponses).toContain("404");
    expect(userGetResponses).toContain("429");
  });

  // ─── HTTP endpoints ───────────────────────────────────────────────

  describe("GET /openapi.json", () => {
    it("returns 200 with a valid JSON document", async () => {
      const res = await request(app).get("/openapi.json");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body.openapi).toBe("3.1.0");
      expect(res.body.paths).toBeDefined();
    });
  });

  describe("GET /docs", () => {
    it("returns 200 with HTML containing Swagger UI", async () => {
      const res = await request(app).get("/docs/");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/html/);
      expect(res.text).toContain("swagger");
    });
  });
});
