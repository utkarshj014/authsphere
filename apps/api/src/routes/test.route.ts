import { Router } from "express";
import { AppError } from "../common/errors/app-error.js";

const router = Router();

router.get("/", (_req, _res) => {
  throw new AppError("Test Error", 400);
});

export default router;
