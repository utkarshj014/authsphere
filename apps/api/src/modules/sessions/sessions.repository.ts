import { prisma } from "../../lib/prisma.js";

const findActiveSessionsByUserId = (userId: string) =>
  prisma.session.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  });

const findSessionById = (sessionId: string) =>
  prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
    },
  });

const deleteSessionByIdAndUserId = (sessionId: string, userId: string) =>
  prisma.session.deleteMany({
    where: {
      id: sessionId,
      userId,
    },
  });

export const sessionsRepository = {
  findActiveSessionsByUserId,
  findSessionById,
  deleteSessionByIdAndUserId,
};
