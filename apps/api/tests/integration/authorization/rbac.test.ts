/// <reference path="../../../src/types/express.d.ts" />

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import {
  getTestApp,
  createVerifiedUser,
  createAdmin,
  authenticate,
} from "../../helpers/index.js";
import {
  requireRole,
  requirePermission,
  requireSelfOrPermission,
} from "../../../src/modules/authorization/authorization.middleware.js";
import { optionalAuth, auth } from "../../../src/middlewares/auth.js";
import { usersRepository } from "../../../src/modules/users/users.repository.js";
import { ForbiddenError } from "../../../src/common/errors/index.js";
import { ROLES, PERMISSIONS } from "@authsphere/shared";
import type { Request, Response } from "express";

describe("Authorization & RBAC Middleware Integration", () => {
  const app = getTestApp();

  it("unauthenticated request to protected endpoint returns 401", async () => {
    const res = await request(app).get(
      "/users/01912345-6789-7abc-def0-123456789abc",
    );
    expect(res.status).toBe(401);
  });

  it("requireRole(ADMIN) blocks USER role with 403", async () => {
    const { cookieHeader } = await authenticate(app);
    const { user: target } = await createVerifiedUser();

    const res = await request(app)
      .patch(`/users/${target.id}/role`)
      .set("Cookie", cookieHeader)
      .send({ roleName: "ADMIN" });

    expect(res.status).toBe(403);
  });

  it("requireRole(ADMIN) allows ADMIN role", async () => {
    const { cookieHeader } = await authenticate(app, { role: "ADMIN" });
    const { user: target } = await createVerifiedUser();

    const res = await request(app)
      .patch(`/users/${target.id}/role`)
      .set("Cookie", cookieHeader)
      .send({ roleName: "ADMIN" });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("ADMIN");
  });

  it("requireSelfOrPermission allows user to read their own record", async () => {
    const { user, cookieHeader } = await authenticate(app);

    const res = await request(app)
      .get(`/users/${user.id}`)
      .set("Cookie", cookieHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(user.id);
  });

  it("requireSelfOrPermission blocks user from reading another user's record (403)", async () => {
    const { cookieHeader } = await authenticate(app);
    const { user: otherUser } = await createVerifiedUser();

    const res = await request(app)
      .get(`/users/${otherUser.id}`)
      .set("Cookie", cookieHeader);

    expect(res.status).toBe(403);
  });

  it("requireSelfOrPermission allows ADMIN to read any user's record", async () => {
    const { cookieHeader } = await authenticate(app, { role: "ADMIN" });
    const { user: target } = await createVerifiedUser();

    const res = await request(app)
      .get(`/users/${target.id}`)
      .set("Cookie", cookieHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(target.id);
  });

  describe("requireRole Middleware Unit Checks", () => {
    it("rejects request without req.auth with 401 UnauthorizedError", async () => {
      const middleware = requireRole(ROLES.ADMIN);
      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authentication required",
        }),
      );
    });

    it("blocks request missing required role with 403 ForbiddenError", async () => {
      const middleware = requireRole(ROLES.ADMIN);
      const req = {
        auth: {
          userId: "user-1",
          role: ROLES.USER,
          sessionId: "session-1",
          permissions: [],
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining("required role"),
        }),
      );
    });

    it("allows request when user has the required role", async () => {
      const middleware = requireRole(ROLES.ADMIN);
      const req = {
        auth: {
          userId: "admin-1",
          role: ROLES.ADMIN,
          sessionId: "session-1",
          permissions: [],
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("requirePermission Middleware Unit Checks", () => {
    it("rejects request without req.auth with 401 UnauthorizedError", async () => {
      const middleware = requirePermission(PERMISSIONS.PROFILE_READ);
      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authentication required",
        }),
      );
    });

    it("blocks request missing required permission with 403 ForbiddenError", async () => {
      const middleware = requirePermission(PERMISSIONS.PROFILE_UPDATE);
      const req = {
        auth: {
          userId: "user-1",
          role: ROLES.USER,
          sessionId: "session-1",
          permissions: [PERMISSIONS.PROFILE_READ],
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining("required permissions"),
        }),
      );
    });

    it("allows request when all required permissions are present", async () => {
      const middleware = requirePermission(PERMISSIONS.PROFILE_READ);
      const req = {
        auth: {
          userId: "user-1",
          role: ROLES.USER,
          sessionId: "session-1",
          permissions: [PERMISSIONS.PROFILE_READ, PERMISSIONS.PROFILE_UPDATE],
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("requireSelfOrPermission Middleware Unit Checks", () => {
    it("rejects request without req.auth with 401 UnauthorizedError", async () => {
      const middleware = requireSelfOrPermission(PERMISSIONS.USER_READ);
      const req = { params: { id: "user-target" } } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Authentication required",
        }),
      );
    });

    it("allows access when req.params.id matches req.auth.userId (self access)", async () => {
      const middleware = requireSelfOrPermission(PERMISSIONS.USER_READ);
      const req = {
        params: { id: "user-123" },
        auth: {
          userId: "user-123",
          role: ROLES.USER,
          sessionId: "session-1",
          permissions: [],
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it("allows access when user has the permission even if params.id does not match", async () => {
      const middleware = requireSelfOrPermission(PERMISSIONS.USER_READ);
      const req = {
        params: { id: "other-user-456" },
        auth: {
          userId: "admin-user",
          role: ROLES.ADMIN,
          sessionId: "session-1",
          permissions: [PERMISSIONS.USER_READ],
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith();
    });

    it("blocks access with 403 when user is neither self nor has permission", async () => {
      const middleware = requireSelfOrPermission(PERMISSIONS.USER_READ);
      const req = {
        params: { id: "other-user-456" },
        auth: {
          userId: "user-123",
          role: ROLES.USER,
          sessionId: "session-1",
          permissions: [PERMISSIONS.PROFILE_READ],
        },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await middleware(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: expect.stringContaining("required permissions"),
        }),
      );
    });
  });

  describe("optionalAuth Middleware Integration", () => {
    it("passes through without error when no cookie is provided", async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeUndefined();
    });

    it("passes through without error when req.cookies is undefined", async () => {
      const req = {} as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeUndefined();
    });

    it("attaches auth context when valid accessToken cookie is provided", async () => {
      const { cookies } = await authenticate(app);
      const req = {
        cookies: { accessToken: cookies.accessToken },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeDefined();
      expect(req.auth.userId).toBeDefined();
    });

    it("silently proceeds as unauthenticated when accessToken is invalid", async () => {
      const req = {
        cookies: { accessToken: "invalid.jwt.token" },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.auth).toBeUndefined();
    });
  });

  describe("auth Middleware with Invalid or Missing Tokens", () => {
    it("rejects request when no accessToken cookie is present", async () => {
      const req = { cookies: {} } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await auth(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "No access token provided",
        }),
      );
    });

    it("rejects request when req.cookies is undefined", async () => {
      const req = {} as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await auth(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "No access token provided",
        }),
      );
    });

    it("rejects invalid accessToken with 401 UnauthorizedError", async () => {
      const req = {
        cookies: { accessToken: "corrupted.token.value" },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await auth(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: "Invalid or expired access token",
        }),
      );
    });

    it("attaches req.auth context and calls next() on valid accessToken", async () => {
      const { user, cookies } = await authenticate(app);
      const req = {
        cookies: { accessToken: cookies.accessToken },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      await auth(req, res, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.auth).toBeDefined();
      expect(req.auth.userId).toBe(user.id);
      expect(req.auth.role).toBe(ROLES.USER);
    });
  });

  describe("Admin Guard — Self-Demotion & Last Admin Invariants", () => {
    it("admin cannot change/demote their own role (self-demotion blocked with 403)", async () => {
      const { user, cookieHeader } = await authenticate(app, { role: "ADMIN" });

      const res = await request(app)
        .patch(`/users/${user.id}/role`)
        .set("Cookie", cookieHeader)
        .send({ roleName: "USER" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("cannot change your own role");
    });

    it("demoting the last remaining admin is blocked with 403 Forbidden", async () => {
      const { user: onlyAdmin } = await createAdmin();

      const adminCount = await usersRepository.countUsersByRole("ADMIN");
      expect(adminCount).toBe(1);

      await expect(
        usersRepository.updateUserRole(onlyAdmin.id, "USER"),
      ).rejects.toThrowError(ForbiddenError);

      await expect(
        usersRepository.updateUserRole(onlyAdmin.id, "USER"),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Cannot demote the last admin",
      });

      const remainingCount = await usersRepository.countUsersByRole("ADMIN");
      expect(remainingCount).toBe(1);
    });

    it("admin demotion succeeds when multiple admins exist, but blocks subsequent last-admin demotion", async () => {
      const { cookieHeader } = await authenticate(app, { role: "ADMIN" });
      const { user: targetAdmin } = await createAdmin();

      expect(await usersRepository.countUsersByRole("ADMIN")).toBe(2);

      const demoteRes = await request(app)
        .patch(`/users/${targetAdmin.id}/role`)
        .set("Cookie", cookieHeader)
        .send({ roleName: "USER" });

      expect(demoteRes.status).toBe(200);
      expect(demoteRes.body.data.role).toBe("USER");
      expect(await usersRepository.countUsersByRole("ADMIN")).toBe(1);

      const selfDemoteRes = await request(app)
        .patch(`/users/${targetAdmin.id}/role`)
        .set("Cookie", cookieHeader)
        .send({ roleName: "USER" });
      expect(selfDemoteRes.status).toBe(200);

      const dbAdmin = await usersRepository.countUsersByRole("ADMIN");
      expect(dbAdmin).toBe(1);
    });

    it("updating role of non-existent user throws 404 AppError", async () => {
      const nonExistentId = "01912345-6789-7abc-def0-123456789abc";

      await expect(
        usersRepository.updateUserRole(nonExistentId, "USER"),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: "User not found",
      });
    });
  });
});
