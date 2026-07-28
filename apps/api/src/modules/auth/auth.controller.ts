import type { Request, Response } from "express";
import { asyncHandler } from "../../common/errors/async-handler.js";
import { authService } from "./auth.service.js";
import { signupSchema, verifyEmailSchema } from "./auth.validation.js";
import { ApiResponse } from "../../common/responses/api-response.js";
import { ValidationError } from "../../common/errors/validation-error.js";
import { formatZodError } from "../../common/errors/format-zod-error.js";

export const signupController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = signupSchema.safeParse(req.body);
    if (!input.success) {
      throw new ValidationError(formatZodError(input.error));
    }

    await authService.signup(input.data);

    return ApiResponse.success(
      res,
      null,
      "Signed up successfully. Please verify your email",
      201,
    );
  },
);

export const verifyEmailController = asyncHandler(
  async (req: Request, res: Response) => {
    const input = verifyEmailSchema.safeParse(req.body);
    if (!input.success) {
      throw new ValidationError(formatZodError(input.error));
    }

    await authService.verifyEmail(input.data.token);

    return ApiResponse.success(res, null, "Email verified successfully", 200);
  },
);
