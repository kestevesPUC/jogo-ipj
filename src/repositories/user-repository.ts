import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export class UserRepository {
  create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    return prisma.user.create({ data });
  }

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }
}

export const userRepository = new UserRepository();
