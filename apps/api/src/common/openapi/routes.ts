// Aggregator — importing each *.openapi.ts triggers its side-effect
// registrations on the shared OpenAPIRegistry.

// Common schemas (SuccessResponse, ErrorResponse, etc.)
import "./schemas.js";

// Per-module route registrations
import "../../modules/health/health.openapi.js";
import "../../modules/auth/auth.openapi.js";
import "../../modules/sessions/sessions.openapi.js";
import "../../modules/users/users.openapi.js";
import "../../modules/roles/roles.openapi.js";
