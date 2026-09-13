import { prisma } from "../../src/lib/prisma.js";
import { redis } from "../../src/lib/redis.js";
import { ROLES, PERMISSIONS } from "@authsphere/shared";

export { prisma, redis };

let isBaselineSeeded = false;

/**
 * Ensures baseline roles (USER, ADMIN) and permissions exist in the test database.
 * Guards against unseeded test databases automatically without manual prisma db seed.
 */
export async function ensureBaselineSeed() {
  if (isBaselineSeeded) return;

  const roleCount = await prisma.role.count();
  const permCount = await prisma.permission.count();

  if (roleCount < 2 || permCount < Object.keys(PERMISSIONS).length) {
    const userRole = await prisma.role.upsert({
      where: { name: ROLES.USER },
      update: {},
      create: { name: ROLES.USER, description: "Default user role" },
    });
    const adminRole = await prisma.role.upsert({
      where: { name: ROLES.ADMIN },
      update: {},
      create: { name: ROLES.ADMIN, description: "System administrator" },
    });

    const permissionsList = Object.values(PERMISSIONS);
    const dbPermissions = [];
    for (const permissionName of permissionsList) {
      const perm = await prisma.permission.upsert({
        where: { name: permissionName },
        update: {},
        create: {
          name: permissionName,
          description: `Permission to ${permissionName.replace(".", " ")}`,
        },
      });
      dbPermissions.push(perm);
    }

    const userRolePermissions = [
      PERMISSIONS.PROFILE_READ,
      PERMISSIONS.PROFILE_UPDATE,
    ];
    for (const permName of userRolePermissions) {
      const perm = dbPermissions.find((p) => p.name === permName);
      if (perm) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: userRole.id,
              permissionId: perm.id,
            },
          },
          update: {},
          create: {
            roleId: userRole.id,
            permissionId: perm.id,
          },
        });
      }
    }

    for (const perm of dbPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      });
    }
  }

  isBaselineSeeded = true;
}

export async function flushRedis() {
  if (redis.status === "ready") {
    await redis.flushdb();
  }
}

export async function cleanDatabase() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "security_events",
      "mfa_challenges",
      "mfa_recovery_codes",
      "magic_link_tokens",
      "password_reset_tokens",
      "email_verification_tokens",
      "oauth_accounts",
      "sessions",
      "users"
    CASCADE;
  `);
}

/**
 * Convenience helper to cleanly reset both database and Redis state in a single call.
 */
export async function cleanTestState() {
  await cleanDatabase();
  await flushRedis();
}
