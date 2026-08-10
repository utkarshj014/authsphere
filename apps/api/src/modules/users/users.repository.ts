import { prisma } from "../../lib/prisma.js";

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

export const usersRepository = {
  findUserById,
};
