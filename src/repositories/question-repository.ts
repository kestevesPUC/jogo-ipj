import { prisma } from "@/lib/prisma";
import type { Question, MediaType, MediaSource } from "@prisma/client";

export interface CreateQuestionData {
  themeId: string;
  prompt: string;
  answer: string;
  mediaType: MediaType;
  mediaSource: MediaSource | null;
  mediaValue: string | null;
}

export class QuestionRepository {
  findAllByTheme(themeId: string): Promise<Question[]> {
    return prisma.question.findMany({ where: { themeId }, orderBy: { createdAt: "desc" } });
  }

  findById(id: string): Promise<Question | null> {
    return prisma.question.findUnique({ where: { id } });
  }

  countByTheme(themeId: string): Promise<number> {
    return prisma.question.count({ where: { themeId } });
  }

  create(data: CreateQuestionData): Promise<Question> {
    return prisma.question.create({ data });
  }

  update(id: string, data: Partial<CreateQuestionData>): Promise<Question> {
    return prisma.question.update({ where: { id }, data });
  }

  delete(id: string): Promise<Question> {
    return prisma.question.delete({ where: { id } });
  }

  /** Returns up to `count` random questions from the theme (SQLite RANDOM()). */
  async findRandomByTheme(themeId: string, count: number): Promise<Question[]> {
    return prisma.$queryRawUnsafe<Question[]>(
      `SELECT * FROM "Question" WHERE "themeId" = ? ORDER BY RANDOM() LIMIT ?`,
      themeId,
      count
    );
  }
}

export const questionRepository = new QuestionRepository();
