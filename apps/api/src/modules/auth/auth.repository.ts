import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/index.js";
import type { RoleName } from "@authsphere/shared";

const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

const findRoleByName = (name: RoleName) =>
  prisma.role.findUnique({ where: { name } });

const createUserWithVerificationToken = (
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
};

const verifyEmailAndDeleteToken = (tokenHash: string) => {
  return prisma.$transaction(async (tx) => {
    const verificationToken = await tx.emailVerificationToken.findFirst({
      where: { tokenHash, expiresAt: { gte: new Date() } },
    });

    if (!verificationToken) {
      throw new AppError("Invalid or expired verification token", 400);
    }

    try {
      await tx.user.update({
        where: { id: verificationToken.userId, isEmailVerified: false },
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
  });
};

const reCreateVerificationToken = (
  tokenHash: string,
  userId: string,
  expiresAt: Date,
) =>
  prisma.emailVerificationToken.upsert({
    where: { userId },
    update: { tokenHash, expiresAt, createdAt: new Date() },
    create: { tokenHash, userId, expiresAt },
  });

const findUserByEmailWithRole = (email: string) =>
  prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

const createSession = (
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
  });

const findSessionById = (sessionId: string) =>
  prisma.session.findFirst({
    where: { id: sessionId, expiresAt: { gt: new Date() } },
    include: { user: { include: { role: true } } },
  });

const deleteSessionById = (sessionId: string) =>
  prisma.session.deleteMany({ where: { id: sessionId } });

const deleteAllSessionsByUserId = (userId: string) =>
  prisma.session.deleteMany({ where: { userId } });

const rotateSession = (
  sessionId: string,
  sessionUpdateData: {
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  },
) =>
  prisma.session.update({
    where: { id: sessionId },
    data: { ...sessionUpdateData },
  });

const findUserById = (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

const createPasswordResetToken = (
  tokenHash: string,
  userId: string,
  expiresAt: Date,
) =>
  prisma.passwordResetToken.upsert({
    where: { userId },
    update: { tokenHash, expiresAt, createdAt: new Date() },
    create: { tokenHash, userId, expiresAt },
  });

const resetPasswordAndDeleteToken = (
  tokenHash: string,
  passwordHash: string,
) => {
  return prisma.$transaction(async (tx) => {
    const passwordResetToken = await tx.passwordResetToken.findFirst({
      where: { tokenHash, expiresAt: { gte: new Date() } },
    });

    if (!passwordResetToken) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    try {
      await tx.user.update({
        where: { id: passwordResetToken.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          passwordResetToken: { delete: {} },
          sessions: { deleteMany: {} },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new AppError("Invalid or expired reset token", 400);
      }
      throw error;
    }
  });
};

const changePassword = (userId: string, newPasswordHash: string) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date(),
      sessions: { deleteMany: {} },
    },
  });

const savePendingMfaSecret = (userId: string, mfaSecret: string) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      mfaSecret,
      mfaEnabled: false,
    },
  });

const enableMfaAndSaveRecoveryCodes = (
  userId: string,
  recoveryCodeHashes: string[],
) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: true,
      mfaRecoveryCodes: {
        deleteMany: {},
        create: recoveryCodeHashes.map((codeHash) => ({
          codeHash,
        })),
      },
    },
  });

const createMfaChallenge = (userId: string, expiresAt: Date) =>
  prisma.mfaChallenge.create({
    data: {
      userId,
      expiresAt,
    },
  });

const findMfaChallengeById = (mfaToken: string) =>
  prisma.mfaChallenge.findFirst({
    where: {
      id: mfaToken,
      expiresAt: { gte: new Date() },
    },
    include: {
      user: {
        include: {
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

const updateMfaLastUsedWindow = async (
  userId: string,
  matchedWindow: number,
): Promise<boolean> => {
  const result = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { mfaLastUsedWindow: null },
        { mfaLastUsedWindow: { lt: matchedWindow } },
      ],
    },
    data: {
      mfaLastUsedWindow: matchedWindow,
    },
  });

  return result.count > 0;
};

const verifyAndConsumeRecoveryCode = async (
  userId: string,
  codeHash: string,
) => {
  const result = await prisma.mfaRecoveryCode.updateMany({
    where: {
      userId,
      codeHash,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  return result.count > 0;
};

/**
 * Deletes an MFA challenge by ID.
 *
 * Uses `deleteMany` for idempotent deletion (ADR-029). Returns `{ count: 0 }` instead
 * of throwing Prisma P2025 if the challenge record is missing or already deleted.
 * However, upstream code verification guarantees that only a single
 * valid request reaches this point while the challenge exists.
 * We could have used delete here.
 */
const deleteMfaChallenge = (mfaToken: string) =>
  prisma.mfaChallenge.deleteMany({
    where: { id: mfaToken },
  });

export const authRepository = {
  findUserByEmail,
  findRoleByName,
  createUserWithVerificationToken,
  verifyEmailAndDeleteToken,
  reCreateVerificationToken,
  findUserByEmailWithRole,
  createSession,
  findSessionById,
  deleteSessionById,
  deleteAllSessionsByUserId,
  rotateSession,
  findUserById,
  createPasswordResetToken,
  resetPasswordAndDeleteToken,
  changePassword,
  savePendingMfaSecret,
  enableMfaAndSaveRecoveryCodes,
  createMfaChallenge,
  findMfaChallengeById,
  updateMfaLastUsedWindow,
  verifyAndConsumeRecoveryCode,
  deleteMfaChallenge,
};
