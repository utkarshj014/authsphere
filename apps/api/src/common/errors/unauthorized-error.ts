import { AppError } from "./app-error.js";

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}
