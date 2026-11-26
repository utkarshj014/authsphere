import { describe, it, expect, vi, afterEach } from "vitest";
import { redis } from "../../src/lib/redis.js";
import { handler } from "../../src/lambda.js";

interface LambdaHttpResponse {
  statusCode: number;
  body: string;
}

const createHttpV2Event = (
  method: "GET" | "POST",
  path: string,
  body?: string,
) => ({
  version: "2.0",
  routeKey: `${method} ${path}`,
  rawPath: path,
  rawQueryString: "",
  headers: {
    host: "api.authsphere.test",
    ...(body !== undefined && { "content-type": "application/json" }),
  },
  requestContext: {
    http: {
      method,
      path,
      protocol: "HTTP/1.1",
      sourceIp: "127.0.0.1",
      userAgent: "vitest",
    },
  },
  ...(body !== undefined && { body }),
  isBase64Encoded: false,
});

const stubDisconnectedRedis = () => {
  Object.defineProperty(redis, "status", {
    value: "end",
    configurable: true,
  });
  return vi.spyOn(redis, "connect").mockImplementation(async () => {
    redis.emit("end");
    throw new Error("Simulated Redis outage");
  });
};

describe("Lambda & Redis Connection Resilience", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(redis, "status");
  });

  it("handles emitted Redis socket errors without crashing the process", () => {
    expect(() =>
      redis.emit("error", new Error("Simulated idle TLS disconnect")),
    ).not.toThrow();
  });

  it("serves requests in degraded mode when Redis reconnect fails and avoids re-dialing during cooldown", async () => {
    const connectSpy = stubDisconnectedRedis();

    const firstRes = (await handler(
      createHttpV2Event("GET", "/health/live"),
      {},
    )) as LambdaHttpResponse;
    expect(firstRes.statusCode).toBe(200);
    expect(connectSpy).toHaveBeenCalledTimes(1);

    const secondRes = (await handler(
      createHttpV2Event("GET", "/health/live"),
      {},
    )) as LambdaHttpResponse;
    expect(secondRes.statusCode).toBe(200);
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it("parses JSON bodies and enforces 400 / 413 limits end-to-end through the Lambda Express pipeline", async () => {
    stubDisconnectedRedis();

    // Malformed JSON Buffer -> 400
    const badJsonRes = (await handler(
      createHttpV2Event("POST", "/auth/login", "{bad-json"),
      {},
    )) as LambdaHttpResponse;
    expect(badJsonRes.statusCode).toBe(400);
    expect(JSON.parse(badJsonRes.body)).toMatchObject({
      success: false,
      message: "Invalid JSON payload",
    });

    // Oversized JSON Buffer (> 16KB) -> 413
    const oversizedRes = (await handler(
      createHttpV2Event(
        "POST",
        "/auth/login",
        JSON.stringify({ padding: "a".repeat(16 * 1024 + 1) }),
      ),
      {},
    )) as LambdaHttpResponse;
    expect(oversizedRes.statusCode).toBe(413);
    expect(JSON.parse(oversizedRes.body)).toMatchObject({
      success: false,
      message: "Request payload too large",
    });

    // Valid JSON reaches Express Zod validation middleware cleanly
    const validationRes = (await handler(
      createHttpV2Event(
        "POST",
        "/auth/login",
        JSON.stringify({ email: "not-an-email" }),
      ),
      {},
    )) as LambdaHttpResponse;
    expect(validationRes.statusCode).toBe(400);
    expect(JSON.parse(validationRes.body)).toMatchObject({
      success: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: "email" }),
      ]),
    });
  });
});
