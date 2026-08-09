import { prisma } from "../../lib/prisma.js";
import type { RoleName, PermissionName } from "@authsphere/shared";

const findPermissionsByRole = async (
  roleName: RoleName,
): Promise<PermissionName[]> => {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
    include: {
      rolePermissions: {
        include: {
          permission: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  return (role?.rolePermissions.map((rp) => rp.permission.name) ??
    []) as PermissionName[];
};

export const authorizationRepository = {
  findPermissionsByRole,
};
