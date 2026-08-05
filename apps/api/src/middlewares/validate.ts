import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { asyncHandler } from "../common/errors/async-handler.js";
import { formatZodError } from "../common/errors/format-zod-error.js";
import { ValidationError } from "../common/errors/validation-error.js";

export const validate = (schema: ZodType) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const input = schema.safeParse(req.body);
      if (!input.success) {
        throw new ValidationError(formatZodError(input.error));
      }

      req.body = input.data;

      next();
    },
  );
};
