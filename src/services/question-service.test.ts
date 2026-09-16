import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuestionService } from "./question-service";

function makeQuestionRepoMock() {
  return {
    findAllByTheme: vi.fn(),
    findById: vi.fn(),
    countByTheme: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findRandomByTheme: vi.fn(),
  };
}

function makeThemeServiceMock() {
  return { getOwned: vi.fn() };
}

describe("QuestionService", () => {
  let questionRepo: ReturnType<typeof makeQuestionRepoMock>;
  let themeSvc: ReturnType<typeof makeThemeServiceMock>;
  let service: QuestionService;

  beforeEach(() => {
    questionRepo = makeQuestionRepoMock();
    themeSvc = makeThemeServiceMock();
    service = new QuestionService(questionRepo as any, themeSvc as any);
  });

  it("creates a question when the theme has fewer than 100 questions", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.countByTheme.mockResolvedValue(5);
    questionRepo.create.mockResolvedValue({ id: "q1" });

    const result = await service.create("user_1", "theme_1", {
      prompt: "Quem construiu a arca?",
      answer: "Noé",
      mediaType: "none",
      mediaSource: null,
      mediaValue: null,
    });

    expect(result).toEqual({ id: "q1" });
    expect(questionRepo.create).toHaveBeenCalledWith({
      themeId: "theme_1",
      prompt: "Quem construiu a arca?",
      answer: "Noé",
      mediaType: "none",
      mediaSource: null,
      mediaValue: null,
    });
  });

  it("rejects creating a 101st question in a theme", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.countByTheme.mockResolvedValue(100);

    await expect(
      service.create("user_1", "theme_1", {
        prompt: "x",
        answer: "y",
        mediaType: "none",
        mediaSource: null,
        mediaValue: null,
      })
    ).rejects.toThrow("THEME_QUESTION_LIMIT");
    expect(questionRepo.create).not.toHaveBeenCalled();
  });

  it("lists questions only after confirming theme ownership", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.findAllByTheme.mockResolvedValue([{ id: "q1" }]);

    const result = await service.listByTheme("user_1", "theme_1");

    expect(themeSvc.getOwned).toHaveBeenCalledWith("user_1", "theme_1");
    expect(result).toEqual([{ id: "q1" }]);
  });
});
