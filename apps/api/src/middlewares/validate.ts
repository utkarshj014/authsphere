import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import {
  asyncHandler,
  ValidationError,
  formatZodError,
} from "../common/errors/index.js";

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
