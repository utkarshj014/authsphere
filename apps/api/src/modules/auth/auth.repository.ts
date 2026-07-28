import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/app-error.js";

export const authRepository = {
  findUserbyEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findRoleByName: (name: string) => prisma.role.findUnique({ where: { name } }),

  createUserWithEmailVerificationToken: (
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
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data,
      });

      const emailVerificationToken = await tx.emailVerificationToken.create({
        data: {
          tokenHash: hashedToken,
          userId: user.id,
          expiresAt,
        },
      });

      return {
        user,
        emailVerificationToken,
      };
    });
  },

  findEmailVerificationToken: (tokenHash: string) =>
    prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    }),

  markVerifiedAndDeleteEmailVerificationToken: async (userId: string) => {
    try {
      await prisma.user.update({
        where: { id: userId, isEmailVerified: false },
        data: {
          isEmailVerified: true,
          verifiedAt: new Date(),
          verificationTokens: { deleteMany: {} },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new AppError("Email is already verified", 400);
      }
      throw error;
    }
  },
};
