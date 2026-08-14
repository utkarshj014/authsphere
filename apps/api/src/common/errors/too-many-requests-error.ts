import { AppError } from "./app-error.js";

export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests, please try again later") {
    super(message, 429);
  }
}
