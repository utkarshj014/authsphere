import { prisma } from "../../lib/prisma.js";

export const authRepository = {
  findUserbyEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findRoleByName: (name: string) => prisma.role.findUnique({ where: { name } }),

  createUser: (data: {
    email: string;
    passwordHash: string | null;
    firstName?: string;
    lastName?: string;
    roleId: string;
  }) => prisma.user.create({ data }),
};
