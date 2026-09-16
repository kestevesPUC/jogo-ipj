import { questionRepository, QuestionRepository, CreateQuestionData } from "@/repositories/question-repository";
import { themeService, ThemeService } from "@/services/theme-service";
import type { MediaType, MediaSource } from "@prisma/client";

const MAX_QUESTIONS_PER_THEME = 100;

export interface QuestionInput {
  prompt: string;
  answer: string;
  mediaType: MediaType;
  mediaSource: MediaSource | null;
  mediaValue: string | null;
}

export class QuestionService {
  constructor(
    private repo: QuestionRepository = questionRepository,
    private themes: Pick<ThemeService, "getOwned"> = themeService
  ) {}

  async listByTheme(ownerId: string, themeId: string) {
    await this.themes.getOwned(ownerId, themeId);
    return this.repo.findAllByTheme(themeId);
  }

  async create(ownerId: string, themeId: string, input: QuestionInput) {
    await this.themes.getOwned(ownerId, themeId);
    const currentCount = await this.repo.countByTheme(themeId);
    if (currentCount >= MAX_QUESTIONS_PER_THEME) {
      throw new Error("THEME_QUESTION_LIMIT");
    }
    const data: CreateQuestionData = { themeId, ...input };
    return this.repo.create(data);
  }

  async update(ownerId: string, questionId: string, input: Partial<QuestionInput>) {
    const question = await this.repo.findById(questionId);
    if (!question) throw new Error("QUESTION_NOT_FOUND");
    await this.themes.getOwned(ownerId, question.themeId);
    return this.repo.update(questionId, input);
  }

  async remove(ownerId: string, questionId: string) {
    const question = await this.repo.findById(questionId);
    if (!question) throw new Error("QUESTION_NOT_FOUND");
    await this.themes.getOwned(ownerId, question.themeId);
    await this.repo.delete(questionId);
  }
}

export const questionService = new QuestionService();
