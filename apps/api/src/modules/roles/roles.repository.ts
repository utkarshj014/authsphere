import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import type { RoleName, PermissionName } from "@authsphere/shared";
import { AppError } from "../../common/errors/app-error.js";

const updateRolePermissions = async (
  roleName: RoleName,
  permissionNames: PermissionName[],
): Promise<{ role: RoleName; permissions: PermissionName[] }> => {
  try {
    const role = await prisma.role.update({
      where: { name: roleName },
      data: {
        rolePermissions: {
          deleteMany: {},
          create: permissionNames.map((permissionName) => ({
            permission: {
              connect: { name: permissionName },
            },
          })),
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: { name: true },
            },
          },
        },
      },
    });

    return {
      role: role.name,
      permissions: role.rolePermissions.map(
        (rp) => rp.permission.name,
      ) as PermissionName[],
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AppError("Role not found", 404);
    }
    throw error;
  }
};

export const rolesRepository = {
  updateRolePermissions,
};
