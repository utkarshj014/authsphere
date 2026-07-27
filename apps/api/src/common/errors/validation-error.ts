import { AppError } from "./app-error.js";

export interface ValidationErrorItem {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  public readonly errors: ValidationErrorItem[];

  constructor(errors: ValidationErrorItem[]) {
    super("Validation failed", 400);
    this.errors = errors;
  }
}
