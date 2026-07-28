import { prisma } from "../../lib/prisma.js";

export const authRepository = {
  findUserbyEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findRoleByName: (name: string) => prisma.role.findUnique({ where: { name } }),

  createUserWithVerificationToken: (
    data: {
      email: string;
      passwordHash: string | null;
      firstName?: string;
      lastName?: string;
      roleId: string;
    },
    hashedToken: string,
    expiresAt: Date,
  ) => {
    return prisma.$transaction(async (prisma) => {
      const user = await prisma.user.create({
        data,
      });

      const emailVerificationToken = await prisma.emailVerificationToken.create(
        {
          data: {
            tokenHash: hashedToken,
            userId: user.id,
            expiresAt,
          },
        },
      );

      return {
        user,
        emailVerificationToken,
      };
    });
  },
};
