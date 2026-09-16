import { prisma } from "@/lib/prisma";
import type { Theme } from "@prisma/client";

export class ThemeRepository {
  findAllByOwner(ownerId: string): Promise<Theme[]> {
    return prisma.theme.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
  }

  findByIdAndOwner(id: string, ownerId: string): Promise<Theme | null> {
    return prisma.theme.findFirst({ where: { id, ownerId } });
  }

  create(data: { name: string; ownerId: string }): Promise<Theme> {
    return prisma.theme.create({ data });
  }

  delete(id: string): Promise<Theme> {
    return prisma.theme.delete({ where: { id } });
  }
}

export const themeRepository = new ThemeRepository();
