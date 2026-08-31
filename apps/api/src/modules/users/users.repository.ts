import { prisma } from "../../lib/prisma.js";
import { ROLES, type RoleName } from "@authsphere/shared";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError, ForbiddenError } from "../../common/errors/index.js";

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

/**
 * Updates a user's role with an atomic last-admin demotion guard.
 *
 * Concurrency & Race-Condition Defense:
 * In PostgreSQL, checking admin count and updating across different rows under default
 * READ COMMITTED isolation creates a write-skew race condition (e.g. two admins demoting
 * each other concurrently can both read count = 2 and both succeed, leaving 0 admins).
 *
 * To eliminate write-skew cleanly without raw SQL, this method runs inside an interactive
 * transaction (`prisma.$transaction`). When demoting away from ADMIN, it updates the single
 * 'ADMIN' role row (`tx.role.update`), acquiring an exclusive row-level lock on the role record.
 * This forces any concurrent admin-demotion transactions to serialize. Under the lock, it
 * re-evaluates the admin count and safely rejects demoting the last remaining admin.
 */
const updateUserRole = async (userId: string, roleName: RoleName) => {
  return await prisma.$transaction(async (tx) => {
    // 1. If demoting away from ADMIN, acquire an exclusive row lock on the ADMIN role record
    // to serialize all concurrent demotion attempts.
    if (roleName !== ROLES.ADMIN) {
      await tx.role.update({
        where: { name: ROLES.ADMIN },
        data: { updatedAt: new Date() },
      });
    }

    // 2. Fetch the target user inside the transaction
    const targetUser = await tx.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!targetUser) {
      throw new AppError("User not found", 404);
    }

    // 3. If target user is an ADMIN and being demoted, evaluate admin count under the lock
    if (targetUser.role.name === ROLES.ADMIN && roleName !== ROLES.ADMIN) {
      const adminCount = await tx.user.count({
        where: {
          role: {
            name: ROLES.ADMIN,
          },
        },
      });

      if (adminCount <= 1) {
        throw new ForbiddenError("Cannot demote the last admin");
      }
    }

    // 4. Update the user's role
    try {
      return await tx.user.update({
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
      // Note: P2025 indicates record not found. Since roleName is pre-validated against
      // seeded ROLES enum by Zod, P2025 specifically reflects target user non-existence.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new AppError("User not found", 404);
      }

      throw error;
    }
  });
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
