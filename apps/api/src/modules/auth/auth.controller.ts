import type { Request, Response } from "express";
import { asyncHandler } from "../../common/errors/async-handler.js";
import { authService } from "./auth.service.js";
import { signupSchema } from "./auth.validation.js";
import { ApiResponse } from "../../common/responses/api-response.js";
import { ValidationError } from "../../common/errors/validation-error.js";

export const signupController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = signupSchema.safeParse(req.body);
    if (!input.success) {
      const formattedErrors = input.error.issues.map(err => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw new ValidationError(formattedErrors);
    }
    const user = await authService.signup(input.data);

    return ApiResponse.success(res, user, "User created successfully", 201);
  },
);
