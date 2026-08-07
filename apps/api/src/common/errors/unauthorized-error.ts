import { AppError } from "./app-error.js";

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized Access") {
    super(message, 401);
  }
}
