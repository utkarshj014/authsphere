import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.js";

// Import aggregator to ensure all schemas and routes are registered
import "./routes.js";

type OpenAPIObject = ReturnType<OpenApiGeneratorV31["generateDocument"]>;

let cachedDocument: OpenAPIObject | null = null;

/**
 * Generates and memoizes the OpenAPI 3.1 document from all registered schemas and paths.
 */
export function getOpenApiDocument(): OpenAPIObject {
  if (cachedDocument) {
    return cachedDocument;
  }

  const generator = new OpenApiGeneratorV31(registry.definitions);

  cachedDocument = generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "AuthSphere API",
      description:
        "Authentication, authorization, and identity management API. Note: AuthSphere uses HttpOnly cookies (accessToken, refreshToken) for session transport rather than Bearer tokens in Authorization headers. In Swagger UI, authenticate via the /auth/login endpoint; browser cookies are automatically attached to same-origin requests.",
      version: "1.0.0",
      license: { name: "ISC" },
    },
    servers: [
      {
        url: "http://localhost:{port}",
        description: "Development",
        variables: {
          port: { default: "3000" },
        },
      },
    ],
    tags: [
      { name: "Health", description: "Service health checks" },
      { name: "Auth", description: "Authentication flows" },
      { name: "MFA", description: "Multi-factor authentication" },
      { name: "OAuth", description: "OAuth 2.0 social login" },
      { name: "Sessions", description: "Session management" },
      { name: "Users", description: "User management" },
      { name: "Roles", description: "Role and permission management" },
      {
        name: "Security Events",
        description: "Security audit log",
      },
    ],
  });

  return cachedDocument;
}

// ─── Express Router ────────────────────────────────────────────────

const router = Router();

// Serve raw OpenAPI JSON document
router.get("/openapi.json", (_req, res) => {
  return res.json(getOpenApiDocument());
});

// Serve Swagger UI
router.use("/docs", swaggerUi.serve, swaggerUi.setup(getOpenApiDocument()));

export { router as openApiRouter };
