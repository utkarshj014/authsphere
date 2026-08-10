import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import {
  asyncHandler,
  ValidationError,
  formatZodError,
} from "../common/errors/index.js";

export enum ValidationTarget {
  BODY = "body",
  PARAMS = "params",
  QUERY = "query",
}

export const validate = (
  schema: ZodType,
  target: ValidationTarget = ValidationTarget.BODY,
) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      const input = schema.safeParse(req[target]);
      if (!input.success) {
        throw new ValidationError(formatZodError(input.error));
      }

      req[target] = input.data;

      next();
    },
  );
};
