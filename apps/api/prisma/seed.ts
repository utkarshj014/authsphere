import dotenv from "dotenv";
import {
  PrismaClient,
  type Permission,
} from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { ROLES, PERMISSIONS } from "@authsphere/shared";
import { hashPassword } from "../src/lib/crypto/password.js";
import {
  emailSchema,
  passwordSchema,
} from "../src/modules/auth/auth.validation.js";

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
    PERMISSIONS.DASHBOARD_VIEW,
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

  // 5. Seed / Promote Bootstrap Administrator (Configured via Environment, No Hardcoded Fallback)
  const rawSeedAdminEmail = process.env.SEED_ADMIN_EMAIL;
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (rawSeedAdminEmail?.trim()) {
    const emailResult = emailSchema.safeParse(rawSeedAdminEmail);
    if (!emailResult.success) {
      throw new Error(
        `Invalid SEED_ADMIN_EMAIL configuration: "${rawSeedAdminEmail}"`,
      );
    }
    const seedAdminEmail = emailResult.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: seedAdminEmail },
      include: { role: true },
    });

    if (existingUser) {
      if (existingUser.roleId !== adminRole.id) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { roleId: adminRole.id },
        });
        console.log(`✓ Promoted existing user ${seedAdminEmail} to ADMIN`);
      } else {
        console.log(`✓ User ${seedAdminEmail} is already an ADMIN`);
      }
    } else if (seedAdminPassword !== undefined && seedAdminPassword !== "") {
      const passwordResult = passwordSchema.safeParse(seedAdminPassword);
      if (!passwordResult.success) {
        throw new Error(
          "SEED_ADMIN_PASSWORD must be between 8 and 128 characters to satisfy login policy.",
        );
      }
      const passwordHash = await hashPassword(passwordResult.data);
      await prisma.user.create({
        data: {
          email: seedAdminEmail,
          passwordHash,
          isEmailVerified: false,
          roleId: adminRole.id,
        },
      });
      console.log(
        `✓ Created new bootstrap ADMIN user (unverified — verify email to claim): ${seedAdminEmail}`,
      );
    } else {
      console.warn(
        `⚠ SEED_ADMIN_EMAIL set to "${seedAdminEmail}", but user does not exist and SEED_ADMIN_PASSWORD was not supplied. Skipping user creation.`,
      );
    }
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
