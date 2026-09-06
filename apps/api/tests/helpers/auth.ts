import request, { type Response } from "supertest";
import type { Express } from "express";
import app from "../../src/app.js";
import { createVerifiedUser, type CreateUserOptions } from "./factories.js";

export { app };

export function getTestApp(): Express {
  return app;
}
export const createTestApp = getTestApp;

export interface AuthCookies {
  accessToken?: string;
  refreshToken?: string;
}

export function getAuthCookies(response: Response): AuthCookies {
  const setCookie = response.headers["set-cookie"];
  if (!setCookie) return {};

  const cookiesArray = Array.isArray(setCookie) ? setCookie : [setCookie];
  const cookies: AuthCookies = {};

  for (const cookieStr of cookiesArray) {
    const [nameVal] = cookieStr.split(";");
    const [name, ...valParts] = nameVal.split("=");
    const value = valParts.join("=").trim();

    if (name.trim() === "accessToken") {
      cookies.accessToken = value;
    } else if (name.trim() === "refreshToken") {
      cookies.refreshToken = value;
    }
  }

  return cookies;
}

export function formatCookieHeader(cookies: AuthCookies): string {
  const parts: string[] = [];
  if (cookies.accessToken) {
    parts.push(`accessToken=${cookies.accessToken}`);
  }
  if (cookies.refreshToken) {
    parts.push(`refreshToken=${cookies.refreshToken}`);
  }
  return parts.join("; ");
}

export async function login(
  testApp: Express = app,
  email: string,
  password = "Password123!",
) {
  return request(testApp).post("/auth/login").send({ email, password });
}

export async function authenticate(
  testApp: Express = app,
  userOptions?: CreateUserOptions,
) {
  const { user, password } = await createVerifiedUser(userOptions);
  const response = await login(testApp, user.email, password);
  const cookies = getAuthCookies(response);
  const cookieHeader = formatCookieHeader(cookies);

  return {
    user,
    password,
    cookies,
    cookieHeader,
    response,
  };
}
