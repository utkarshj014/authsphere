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
    prisma.emailVerificationToken.findFirst({
      where: { tokenHash, expiresAt: { gte: new Date() } },
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

  createSession: (
    userId: string,
    sessionData: {
      id: string;
      tokenHash: string;
      expiresAt: Date;
      ipAddress?: string;
      userAgent?: string;
    },
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
      },
    }),

  findSessionById: (sessionId: string) =>
    prisma.session.findFirst({
      where: { id: sessionId, expiresAt: { gt: new Date() } },
      include: { user: { include: { role: true } } },
    }),

  deleteSessionById: (sessionId: string) =>
    prisma.session.delete({ where: { id: sessionId } }),

  deleteAllSessionsByUserId: (userId: string) =>
    prisma.session.deleteMany({ where: { userId } }),

  rotateSession: (sessionData: {
    id: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) =>
    prisma.session.update({
      where: { id: sessionData.id },
      data: {
        ...sessionData,
      },
    }),
};
