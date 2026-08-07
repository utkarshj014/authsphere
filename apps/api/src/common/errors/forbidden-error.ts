import { AppError } from "./app-error.js";

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden resource or action") {
    super(message, 403);
  }
}
