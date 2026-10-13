import { prisma } from "../prisma/client";

export const importService = {
  async getById(id: string) {
    return prisma.datasetImport.findUnique({
      where: { id },
      include: { rowErrors: true },
    });
  },
};
