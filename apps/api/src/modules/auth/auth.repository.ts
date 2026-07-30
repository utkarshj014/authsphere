import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/app-error.js";
import type { RoleName } from "@authsphere/shared";

export const authRepository = {
  findUserByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findRoleByName: (name: RoleName) =>
    prisma.role.findUnique({ where: { name } }),

  createUserWithVerificationToken: (
    data: {
      email: string;
      passwordHash: string | null;
      firstName?: string;
      lastName?: string;
      roleId: string;
    },
    tokenHash: string,
    expiresAt: Date,
  ) => {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data,
      });

      await tx.emailVerificationToken.create({
        data: {
          tokenHash,
          userId: user.id,
          expiresAt,
        },
      });

      return user;
    });
  },

  findVerificationToken: (tokenHash: string) =>
    prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    }),

  markVerifiedAndDeleteVerificationToken: async (userId: string) => {
    try {
      await prisma.user.update({
        where: { id: userId, isEmailVerified: false },
        data: {
          isEmailVerified: true,
          verifiedAt: new Date(),
          emailVerificationToken: { delete: {} },
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

  reCreateVerificationToken: (
    tokenHash: string,
    userId: string,
    expiresAt: Date,
  ) =>
    prisma.emailVerificationToken.upsert({
      where: { userId },
      update: { tokenHash, expiresAt, createdAt: new Date() },
      create: { tokenHash, userId, expiresAt },
    }),

  findUserByEmailWithRole: (email: string) =>
    prisma.user.findUnique({
      where: { email },
      include: { role: true },
    }),

  createSessionWithRefreshToken: (
    userId: string,
    sessionData: {
      id: string;
      expiresAt: Date;
      ipAddress?: string;
      userAgent?: string;
    },
    tokenHash: string,
    refreshTokenExpiresAt: Date,
  ) =>
    prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        sessions: {
          create: {
            ...sessionData,
          },
        },
        refreshTokens: {
          create: {
            tokenHash,
            sessionId: sessionData.id,
            expiresAt: refreshTokenExpiresAt,
          },
        },
      },
    }),
};
