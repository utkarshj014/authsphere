import { z } from "zod";
import {
  registry,
  accessTokenSecurity,
  refreshTokenSecurity,
} from "./registry.js";

// ─── Security Helpers ──────────────────────────────────────────────
export const cookieSecurity = [{ [accessTokenSecurity.name]: [] }];
export const refreshCookieSecurity = [{ [refreshTokenSecurity.name]: [] }];

// ─── Reusable Response Schemas ─────────────────────────────────────
// These mirror the shapes produced by ApiResponse and the error handler.

export const MessageOnlyResponseSchema = registry.register(
  "MessageOnlyResponse",
  z
    .object({
      success: z.literal(true),
      message: z.string(),
      data: z.null(),
    })
    .openapi("MessageOnlyResponse", {
      description: "Standard success response envelope with no data payload",
    }),
);

export const ErrorResponseSchema = registry.register(
  "ErrorResponse",
  z
    .object({
      success: z.literal(false),
      message: z.string(),
    })
    .openapi("ErrorResponse", {
      description: "Standard error response envelope",
    }),
);

export const ValidationErrorResponseSchema = registry.register(
  "ValidationErrorResponse",
  z
    .object({
      success: z.literal(false),
      message: z.literal("Validation failed"),
      errors: z.array(
        z.object({
          field: z.string(),
          message: z.string(),
        }),
      ),
    })
    .openapi("ValidationErrorResponse", {
      description: "Validation error with per-field details",
    }),
);

// ─── Content & Response Builders (DRY Helpers) ─────────────────────

/**
 * Wraps a Zod schema in the standard OpenAPI "application/json" content object.
 */
export const jsonContent = <T extends z.ZodTypeAny>(schema: T) => ({
  "application/json": { schema },
});

/**
 * Creates the standard AuthSphere API success envelope schema for any data type.
 */
export const successEnvelope = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  });

/**
 * Returns a complete OpenAPI 200 response with data wrapped in the standard success envelope.
 */
export const successResponse = <T extends z.ZodTypeAny>(
  description: string,
  dataSchema: T,
) => ({
  description,
  content: jsonContent(successEnvelope(dataSchema)),
});

/**
 * Returns a complete OpenAPI success response with data: null (MessageOnlyResponse).
 */
export const messageResponse = (description: string) => ({
  description,
  content: jsonContent(MessageOnlyResponseSchema),
});

/**
 * Returns a complete OpenAPI error response using ErrorResponseSchema.
 */
export const errorResponse = (description: string) => ({
  description,
  content: jsonContent(ErrorResponseSchema),
});

/**
 * Creates a standard required JSON request body object.
 */
export const jsonBody = <T extends z.ZodTypeAny>(schema: T) => ({
  required: true,
  content: jsonContent(schema),
});

// ─── Common Error Responses ────────────────────────────────────────

export const standardErrors = {
  400: {
    description: "Validation error",
    content: jsonContent(ValidationErrorResponseSchema),
  },
  429: {
    description: "Rate limit exceeded",
    content: jsonContent(ErrorResponseSchema),
  },
  500: {
    description: "Internal server error",
    content: jsonContent(ErrorResponseSchema),
  },
} as const;

export const authedErrors = {
  ...standardErrors,
  401: {
    description: "Unauthorized — missing or invalid access token cookie",
    content: jsonContent(ErrorResponseSchema),
  },
} as const;
