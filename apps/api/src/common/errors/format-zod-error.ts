import type { ZodError } from "zod";
import type { ValidationErrorItem } from "./validation-error.js";

export const formatZodError = (error: ZodError): ValidationErrorItem[] =>
  error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
