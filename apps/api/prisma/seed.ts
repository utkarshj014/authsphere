import dotenv from "dotenv";
import {
  PrismaClient,
  type Permission,
} from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { ROLES, PERMISSIONS } from "@authsphere/shared";

// Always loads apps/api/.env regardless of current working directory
dotenv.config({ path: new URL("../.env", import.meta.url) });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment variables.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Seed Roles
  const userRole = await prisma.role.upsert({
    where: { name: ROLES.USER },
    update: {},
    create: {
      name: ROLES.USER,
      description: "Default user role",
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: ROLES.ADMIN },
    update: {},
    create: {
      name: ROLES.ADMIN,
      description: "System administrator",
    },
  });

  // 2. Seed all Permissions
  const permissionsList = Object.values(PERMISSIONS);
  const dbPermissions: Permission[] = [];

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

  // 3. Map permissions to USER role
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

  // 4. Map all permissions to ADMIN role
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
