import { describe, it, expect } from "vitest";
import request from "supertest";
import { getTestApp, authenticate, prisma } from "../../helpers/index.js";
import { PERMISSIONS } from "@authsphere/shared";

describe("Roles Module Integration", () => {
  const app = getTestApp();

  describe("GET /roles/:roleName/permissions", () => {
    it("unauthenticated request to get role permissions returns 401", async () => {
      const res = await request(app).get("/roles/USER/permissions");

      expect(res.status).toBe(401);
    });

    it("non-admin user is rejected with 403 Forbidden", async () => {
      const { cookieHeader } = await authenticate(app, { role: "USER" });

      const res = await request(app)
        .get("/roles/USER/permissions")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(403);
    });

    it("admin successfully retrieves USER role permissions", async () => {
      const { cookieHeader } = await authenticate(app, { role: "ADMIN" });

      const res = await request(app)
        .get("/roles/USER/permissions")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("USER");
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
    });

    it("admin successfully retrieves ADMIN role permissions", async () => {
      const { cookieHeader } = await authenticate(app, { role: "ADMIN" });

      const res = await request(app)
        .get("/roles/ADMIN/permissions")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("ADMIN");
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
    });

    it("rejects invalid role name with 400 Validation error", async () => {
      const { cookieHeader } = await authenticate(app, { role: "ADMIN" });

      const res = await request(app)
        .get("/roles/SUPERADMIN/permissions")
        .set("Cookie", cookieHeader);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("PUT /roles/:roleName/permissions", () => {
    it("unauthenticated request to update role permissions returns 401", async () => {
      const res = await request(app)
        .put("/roles/USER/permissions")
        .send({ permissions: [PERMISSIONS.PROFILE_READ] });

      expect(res.status).toBe(401);
    });

    it("non-admin user is rejected with 403 Forbidden", async () => {
      const { cookieHeader } = await authenticate(app, { role: "USER" });

      const res = await request(app)
        .put("/roles/USER/permissions")
        .set("Cookie", cookieHeader)
        .send({ permissions: [PERMISSIONS.PROFILE_READ] });

      expect(res.status).toBe(403);
    });

    it("admin attempting to modify ADMIN role permissions is blocked with 403", async () => {
      const { cookieHeader } = await authenticate(app, { role: "ADMIN" });

      const res = await request(app)
        .put("/roles/ADMIN/permissions")
        .set("Cookie", cookieHeader)
        .send({ permissions: [PERMISSIONS.PROFILE_READ] });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain(
        "Cannot update permissions for the admin role",
      );
    });

    it("admin successfully updates USER role permissions and invalidates cache", async () => {
      const { cookieHeader } = await authenticate(app, { role: "ADMIN" });

      const updatedPermissions = [PERMISSIONS.PROFILE_READ];

      const res = await request(app)
        .put("/roles/USER/permissions")
        .set("Cookie", cookieHeader)
        .send({ permissions: updatedPermissions });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("USER");
      expect(res.body.data.permissions).toEqual(updatedPermissions);

      // Verify persisted in PostgreSQL
      const userRole = await prisma.role.findUniqueOrThrow({
        where: { name: "USER" },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });

      const persistedPermNames = userRole.rolePermissions.map(
        (rp) => rp.permission.name,
      );
      expect(persistedPermNames).toEqual(updatedPermissions);
    });

    it("rejects invalid permission names with 400 Validation error", async () => {
      const { cookieHeader } = await authenticate(app, { role: "ADMIN" });

      const res = await request(app)
        .put("/roles/USER/permissions")
        .set("Cookie", cookieHeader)
        .send({ permissions: ["invalid.fake.permission"] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
