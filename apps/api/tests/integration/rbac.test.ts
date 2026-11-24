import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  app,
  createVerifiedUser,
  createAdmin,
  authenticate,
} from "../helpers/index.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";

describe("RBAC & Authorization Integration Suite", () => {
  it("protected endpoint without cookie returns 401", async () => {
    const res = await request(app).get(
      "/users/01912345-6789-7abc-def0-123456789abc",
    );
    expect(res.status).toBe(401);
  });

  describe("requireRole(ADMIN)", () => {
    it("requireRole(ADMIN) rejects USER role with 403", async () => {
      const { cookieHeader } = await authenticate(app, { role: "USER" });
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
  });

  describe("requireSelfOrPermission", () => {
    it("requireSelfOrPermission allows user to read their own record", async () => {
      const { user, cookieHeader } = await authenticate(app);

      const res = await request(app)
        .get(`/users/${user.id}`)
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(user.id);
    });

    it("requireSelfOrPermission blocks user from reading another user's record with 403", async () => {
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
  });

  describe("Admin Listing", () => {
    it("GET /users returns paginated user list with mfaEnabled for admin, rejects non-admin with 403", async () => {
      // Non-admin check
      const { cookieHeader: userCookie } = await authenticate(app, {
        role: "USER",
      });
      const userRes = await request(app)
        .get("/users")
        .set("Cookie", userCookie);
      expect(userRes.status).toBe(403);

      // Admin check
      const { cookieHeader: adminCookie, user: adminUser } = await authenticate(
        app,
        { role: "ADMIN" },
      );

      const res = await request(app)
        .get("/users?page=1&limit=10")
        .set("Cookie", adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);

      const selfInList = res.body.data.users.find(
        (u: any) => u.id === adminUser.id,
      );
      expect(selfInList).toBeDefined();
      expect(selfInList.mfaEnabled).toBeDefined();
      expect(selfInList.role).toBe("ADMIN");
    });
  });

  describe("Last-Admin Demotion Prevention", () => {
    it("admin cannot demote themselves (self-demotion blocked with 403)", async () => {
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
      ).rejects.toMatchObject({
        statusCode: 403,
        message: "Cannot demote the last admin",
      });

      const remainingCount = await usersRepository.countUsersByRole("ADMIN");
      expect(remainingCount).toBe(1);
    });
  });
});
