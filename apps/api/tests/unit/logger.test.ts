import type { IncomingMessage } from "node:http";
import { describe, it, expect } from "vitest";
import pino from "pino";
import { loggerRedactionConfig, reqSerializer } from "../../src/lib/logger.js";

function createCaptureLogger() {
  const chunks: string[] = [];
  const logger = pino(
    {
      redact: loggerRedactionConfig,
      serializers: { req: reqSerializer },
    },
    { write: (chunk: string) => chunks.push(chunk) },
  );

  return {
    logger,
    readOutput: () => chunks.join(""),
  };
}

describe("Logger Security & Redaction", () => {
  it("redacts sensitive authentication headers and credentials across requests and responses", () => {
    const { logger, readOutput } = createCaptureLogger();

    logger.info({
      req: {
        id: "req-trace-1",
        headers: {
          cookie:
            "accessToken=raw_access_jwt_secret; refreshToken=raw_refresh_jwt_secret; theme=dark",
          authorization: "Bearer raw_bearer_token_secret",
          host: "api.authsphere.dev",
        },
      },
      res: {
        statusCode: 302,
        headers: {
          "set-cookie": [
            "accessToken=new_access_jwt_secret; Path=/; HttpOnly; SameSite=Lax",
            "refreshToken=new_refresh_jwt_secret; Path=/auth; HttpOnly",
          ],
          location:
            "https://accounts.google.com/o/oauth2/v2/auth?client_id=client_1&state=oauth_state_secret&code_challenge=challenge_secret",
        },
      },
    });

    const output = readOutput();
    const parsed = JSON.parse(output.trim());

    expect(parsed.req.headers.cookie).toBe("[REDACTED]");
    expect(parsed.req.headers.authorization).toBe("[REDACTED]");
    expect(parsed.res.headers["set-cookie"]).toBe("[REDACTED]");
    expect(parsed.res.headers.location).toBe("[REDACTED]");
    expect(parsed.req.headers.host).toBe("api.authsphere.dev");

    expect(output).not.toContain("raw_access_jwt_secret");
    expect(output).not.toContain("raw_refresh_jwt_secret");
    expect(output).not.toContain("raw_bearer_token_secret");
    expect(output).not.toContain("new_access_jwt_secret");
    expect(output).not.toContain("new_refresh_jwt_secret");
    expect(output).not.toContain("oauth_state_secret");
    expect(output).not.toContain("challenge_secret");
  });

  it("omits sensitive OAuth query parameters and sanitizes request URLs to paths", () => {
    const { logger, readOutput } = createCaptureLogger();

    const callbackRequest = {
      id: "req-oauth-callback-1",
      method: "GET",
      // Simulate Express sub-router mutation where req.url/path drop the /auth/oauth mount prefix
      originalUrl:
        "/auth/oauth/github/callback?code=sensitive_oauth_code_xyz&state=sensitive_oauth_state_abc",
      url: "/github/callback?code=sensitive_oauth_code_xyz&state=sensitive_oauth_state_abc",
      query: {
        code: "sensitive_oauth_code_xyz",
        state: "sensitive_oauth_state_abc",
      },
      headers: {
        host: "api.authsphere.dev",
      },
    } as unknown as IncomingMessage;

    logger.info({ req: callbackRequest });

    const output = readOutput();
    const parsed = JSON.parse(output.trim());

    expect(parsed.req.url).toBe("/auth/oauth/github/callback");
    expect(parsed.req.query).toBeUndefined();
    expect(output).not.toContain("sensitive_oauth_code_xyz");
    expect(output).not.toContain("sensitive_oauth_state_abc");
  });
});
