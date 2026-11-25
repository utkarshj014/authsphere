import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.js";
import { env } from "../../config/env.js";

// Import aggregator to ensure all schemas and routes are registered
import "./routes.js";

type OpenAPIObject = ReturnType<OpenApiGeneratorV31["generateDocument"]>;

let cachedDocument: OpenAPIObject | null = null;

/**
 * Clears the memoized OpenAPI document cache (used in tests or dynamic resets).
 */
export function clearOpenApiCache(): void {
  cachedDocument = null;
}

/**
 * Generates and memoizes the OpenAPI 3.1 document from all registered schemas and paths.
 * In development mode (NODE_ENV === "development"), memoization is bypassed so hot-reloads
 * reflect schema changes immediately without requiring a server restart.
 */
export function getOpenApiDocument(): OpenAPIObject {
  const isDev = env.NODE_ENV === "development";
  if (cachedDocument && !isDev) {
    return cachedDocument;
  }

  const generator = new OpenApiGeneratorV31(registry.definitions);

  const doc = generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "AuthSphere API",
      description:
        "Authentication, authorization, and identity management API.\n\n" +
        "### How to Test in Swagger UI\n" +
        "- **Session Cookies**: AuthSphere uses HttpOnly cookies (`accessToken`, `refreshToken`) for session transport. Authenticating via `/auth/login` (or MFA) sets browser cookies automatically for subsequent requests.\n" +
        "- **MFA Flow**: If a login responds with `mfaRequired: true`, copy the `mfaToken` into `POST /auth/mfa/verify` along with your 6-digit TOTP or recovery code to complete login.\n" +
        "- **Email Tokens**: Verification, magic links, and password resets send one-time tokens out-of-band via email (or worker logs in dev mode). Retrieve the token to submit to the respective `/verify` or `/reset-password` endpoint.\n" +
        "- **OAuth 2.0**: OAuth endpoints issue 302 redirects to identity providers (Google/GitHub). Due to browser CORS policies on AJAX redirects, do not test OAuth via Swagger's 'Execute' button; open the initiation URL directly in a browser tab.",
      version: "1.0.0",
      license: { name: "ISC" },
    },
    servers:
      env.NODE_ENV === "production"
        ? [
            {
              url: "/api",
              description: "AuthSphere API (Production Proxy)",
            },
          ]
        : [
            {
              url: "/api",
              description: "Frontend Proxy (localhost:5173 - Default)",
            },
            {
              url: "/",
              description: "Direct Backend Host (localhost:3000)",
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

  if (!isDev) {
    cachedDocument = doc;
  }

  return doc;
}

// ─── Express Router ────────────────────────────────────────────────

const router = Router();

// Serve raw OpenAPI JSON document with conditional revalidation
router.get("/openapi.json", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  return res.json(getOpenApiDocument());
});

const SWAGGER_UI_CDN_BASE =
  "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.15";
const SWAGGER_CDN_ORIGIN = new URL(SWAGGER_UI_CDN_BASE).origin;

// Relaxed Content Security Policy scoped specifically to Swagger UI CDN assets
const swaggerCsp = helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      SWAGGER_CDN_ORIGIN,
      "'unsafe-inline'",
      "'unsafe-eval'",
    ],
    styleSrc: ["'self'", SWAGGER_CDN_ORIGIN, "'unsafe-inline'"],
    imgSrc: ["'self'", SWAGGER_CDN_ORIGIN, "data:", "https:"],
    connectSrc: ["'self'", "https:", "http:"],
  },
});

const renderSwaggerHtml = (specUrl: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AuthSphere API Reference</title>
  <link rel="stylesheet" href="${SWAGGER_UI_CDN_BASE}/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI_CDN_BASE}/swagger-ui-bundle.js"></script>
  <script src="${SWAGGER_UI_CDN_BASE}/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(specUrl)},
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
      });
    };
  </script>
</body>
</html>`;

// Ensure /docs without trailing slash redirects to /docs/ so relative ../openapi.json resolves properly
router.get("/docs", (req, res, next) => {
  if (!req.path.endsWith("/")) {
    const [pathname, search] = req.originalUrl.split("?");
    return res.redirect(
      301,
      search ? `${pathname}/?${search}` : `${pathname}/`,
    );
  }
  next();
});

// Serve CDN-backed Swagger UI (works identically in Lambda bundle and local Node)
router.get(
  "/docs/",
  swaggerCsp,
  (_req: Request, res: Response, _next: NextFunction) => {
    res.setHeader("Cache-Control", "no-cache");
    res.type("html").send(renderSwaggerHtml("../openapi.json"));
  },
);

export { router as openApiRouter };
