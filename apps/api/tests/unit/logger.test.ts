import { describe, it, expect } from "vitest";
import pino from "pino";
import { loggerRedactionConfig } from "../../src/lib/logger.js";

describe("Logger Security & Redaction", () => {
  it("redacts sensitive authentication headers and credentials across requests and responses", () => {
    let output = "";
    const stream = {
      write: (chunk: string) => {
        output += chunk;
      },
    };

    const testLogger = pino({ redact: loggerRedactionConfig }, stream);

    testLogger.info({
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

    const parsed = JSON.parse(output.trim());

    // 1. Inbound credentials: authorization and cookie are completely redacted
    expect(parsed.req.headers.cookie).toBe("[REDACTED]");
    expect(parsed.req.headers.authorization).toBe("[REDACTED]");

    // 2. Outbound credentials: set-cookie and location redirect query are completely redacted
    expect(parsed.res.headers["set-cookie"]).toBe("[REDACTED]");
    expect(parsed.res.headers.location).toBe("[REDACTED]");

    // 3. Non-sensitive headers remain intact
    expect(parsed.req.headers.host).toBe("api.authsphere.dev");

    // 4. Invariant: Absolute zero leakage of raw secrets in serialized log output
    expect(output).not.toContain("raw_access_jwt_secret");
    expect(output).not.toContain("raw_refresh_jwt_secret");
    expect(output).not.toContain("raw_bearer_token_secret");
    expect(output).not.toContain("new_access_jwt_secret");
    expect(output).not.toContain("new_refresh_jwt_secret");
    expect(output).not.toContain("oauth_state_secret");
    expect(output).not.toContain("challenge_secret");
  });
});
