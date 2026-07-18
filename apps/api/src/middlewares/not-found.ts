import type { Request, Response } from "express";

export const notFoundHandler = (_req: Request, res: Response) => {
  return res.status(404).json({ success: false, message: "Route not found!" });
};
