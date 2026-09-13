/// <reference path="../src/types/express.d.ts" />

import dotenv from "dotenv";
dotenv.config({
  path: new URL("../.env.test", import.meta.url),
  override: true,
  quiet: true,
});

import { vi, beforeAll, afterAll, beforeEach, expect } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";
import {
  resetEmailMocks,
  cleanTestState,
  ensureBaselineSeed,
} from "./helpers/index.js";

// Globally mock the email queue to protect against real Redis/BullMQ and external calls
// and allow tests to spy on enqueued email jobs
vi.mock("../src/modules/email/email.queue.js", async () => {
  const { emailQueueMocks } = await import("./helpers/email.js");
  return emailQueueMocks;
});

function isUnitTestSuite(): boolean {
  const filepath = expect.getState().testPath || "";
  return /[/\\]unit[/\\]/.test(filepath);
}

beforeAll(async () => {
  if (isUnitTestSuite()) return;

  await prisma.$connect();
  if (redis.status !== "ready") {
    await redis.connect();
  }

  // Ensure baseline roles and permissions exist in test database (guards against unseeded test DB)
  await ensureBaselineSeed();
});

beforeEach(async () => {
  resetEmailMocks();

  // Automatically reset database and Redis for integration and E2E tests
  if (!isUnitTestSuite()) {
    await cleanTestState();
  }
});

afterAll(async () => {
  if (isUnitTestSuite()) return;

  await prisma.$disconnect();
  if (redis.status === "ready") {
    await redis.quit();
  }
});
