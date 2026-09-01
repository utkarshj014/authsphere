import { prisma } from "../../lib/prisma.js";
import { Prisma, type OAuthProvider } from "../../generated/prisma/client.js";
import { AppError, UnauthorizedError } from "../../common/errors/index.js";
import type { RoleName, SecurityEventTypeName } from "@authsphere/shared";

const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

const findRoleByName = (name: RoleName) =>
  prisma.role.findUnique({ where: { name } });

const createUserWithVerificationToken = async (
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
  try {
    return await prisma.user.create({
      data: {
        ...data,
        emailVerificationToken: {
          create: {
            tokenHash,
            expiresAt,
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Email already in use", 409);
    }
    throw error;
  }
};

const verifyEmailAndDeleteToken = async (tokenHash: string) => {
  const verificationToken = await prisma.emailVerificationToken.findFirst({
    where: { tokenHash, expiresAt: { gte: new Date() } },
  });

  if (!verificationToken) {
    throw new AppError("Invalid or expired verification token", 400);
  }

  try {
    await prisma.user.update({
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
    include: {
      role: {
        select: {
          name: true,
        },
      },
    },
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

const deleteSessionById = (sessionId: string) =>
  prisma.session.deleteMany({ where: { id: sessionId } });

const deleteAllSessionsByUserId = (userId: string) =>
  prisma.session.deleteMany({ where: { userId } });

const rotateSession = async (
  sessionId: string,
  sessionUpdateData: {
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  },
) => {
  try {
    return await prisma.session.update({
      where: { id: sessionId },
      data: { ...sessionUpdateData },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new UnauthorizedError("Session invalidated");
    }
    throw error;
  }
};

const findUserById = (userId: string) =>
  prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        select: {
          name: true,
        },
      },
    },
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

const findPasswordResetTokenWithUser = (tokenHash: string) =>
  prisma.passwordResetToken.findFirst({
    where: { tokenHash, expiresAt: { gte: new Date() } },
    include: { user: true },
  });

const resetPasswordAndDeleteToken = async (
  userId: string,
  passwordHash: string,
) => {
  try {
    await prisma.user.update({
      where: { id: userId },
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

const disableMfaAndRevokeSessions = (userId: string) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
      mfaLastUsedWindow: null,
      mfaRecoveryCodes: {
        deleteMany: {},
      },
      mfaChallenges: {
        deleteMany: {},
      },
      sessions: {
        deleteMany: {},
      },
    },
  });

const replaceRecoveryCodes = (userId: string, recoveryCodeHashes: string[]) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      mfaRecoveryCodes: {
        deleteMany: {},
        create: recoveryCodeHashes.map((codeHash) => ({
          codeHash,
        })),
      },
    },
  });

const countUnusedRecoveryCodes = (userId: string) =>
  prisma.mfaRecoveryCode.count({
    where: { userId, usedAt: null },
  });

const findOAuthAccount = (provider: OAuthProvider, providerId: string) =>
  prisma.oAuthAccount.findUnique({
    where: {
      provider_providerId: {
        provider,
        providerId,
      },
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

const createUserWithOAuthAccount = async (
  data: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    roleId: string;
  },
  provider: OAuthProvider,
  providerId: string,
) => {
  try {
    return await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: null,
        isEmailVerified: true,
        verifiedAt: new Date(),
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        roleId: data.roleId,
        oauthAccounts: {
          create: {
            provider,
            providerId,
          },
        },
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "An account with this email or OAuth provider ID already exists",
        409,
      );
    }
    throw error;
  }
};

const createOAuthAccount = async (
  userId: string,
  provider: OAuthProvider,
  providerId: string,
) => {
  try {
    return await prisma.oAuthAccount.create({
      data: {
        userId,
        provider,
        providerId,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("This OAuth account is already linked to a user", 409);
    }
    throw error;
  }
};

const createMagicLinkToken = (
  tokenHash: string,
  userId: string,
  expiresAt: Date,
) =>
  prisma.magicLinkToken.upsert({
    where: { userId },
    update: { tokenHash, expiresAt, createdAt: new Date() },
    create: { tokenHash, userId, expiresAt },
  });

const findMagicLinkTokenWithUser = (tokenHash: string) =>
  prisma.magicLinkToken.findFirst({
    where: {
      tokenHash,
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

const consumeMagicLinkToken = async (
  userId: string,
  isEmailVerified: boolean,
) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(isEmailVerified
          ? {}
          : { isEmailVerified: true, verifiedAt: new Date() }),
        magicLinkToken: { delete: {} },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new AppError("Invalid or expired magic link token", 400);
    }
    throw error;
  }
};

const createSecurityEvent = async (data: {
  userId: string;
  type: SecurityEventTypeName;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) =>
  prisma.securityEvent.create({
    data: {
      ...data,
      metadata: data.metadata
        ? (data.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

const findSecurityEventsByUserId = (
  userId: string,
  skip: number,
  take: number,
) =>
  prisma.securityEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      type: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
    },
  });

const countSecurityEventsByUserId = (userId: string) =>
  prisma.securityEvent.count({
    where: { userId },
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
  findPasswordResetTokenWithUser,
  resetPasswordAndDeleteToken,
  changePassword,
  savePendingMfaSecret,
  enableMfaAndSaveRecoveryCodes,
  createMfaChallenge,
  findMfaChallengeById,
  updateMfaLastUsedWindow,
  verifyAndConsumeRecoveryCode,
  deleteMfaChallenge,
  disableMfaAndRevokeSessions,
  replaceRecoveryCodes,
  countUnusedRecoveryCodes,
  findOAuthAccount,
  createUserWithOAuthAccount,
  createOAuthAccount,
  createMagicLinkToken,
  findMagicLinkTokenWithUser,
  consumeMagicLinkToken,
  createSecurityEvent,
  findSecurityEventsByUserId,
  countSecurityEventsByUserId,
};
