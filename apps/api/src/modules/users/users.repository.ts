import { prisma } from "../../lib/prisma.js";
import type { RoleName } from "@authsphere/shared";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../common/errors/app-error.js";

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

const updateUserRole = async (userId: string, roleName: RoleName) => {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: {
        role: {
          connect: {
            name: roleName,
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
      error.code === "P2025"
    ) {
      throw new AppError("User not found", 404);
    }

    throw error;
  }
};

const countUsersByRole = (roleName: RoleName) =>
  prisma.user.count({
    where: {
      role: {
        name: roleName,
      },
    },
  });

export const usersRepository = {
  findUserById,
  updateUserRole,
  countUsersByRole,
};
