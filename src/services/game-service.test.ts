import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameService } from "./game-service";

function makeGameRepoMock() {
  return {
    createWithBlocksAndTeams: vi.fn(),
    findByIdAndOwner: vi.fn(),
    findAllByOwner: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function makeQuestionRepoMock() {
  return { findRandomByTheme: vi.fn(), countByTheme: vi.fn() };
}

function makeThemeServiceMock() {
  return { getOwned: vi.fn() };
}

describe("GameService.create", () => {
  let gameRepo: ReturnType<typeof makeGameRepoMock>;
  let questionRepo: ReturnType<typeof makeQuestionRepoMock>;
  let themeSvc: ReturnType<typeof makeThemeServiceMock>;
  let service: GameService;

  beforeEach(() => {
    gameRepo = makeGameRepoMock();
    questionRepo = makeQuestionRepoMock();
    themeSvc = makeThemeServiceMock();
    service = new GameService(gameRepo as any, questionRepo as any, themeSvc as any);
  });

  it("rejects when the theme has fewer questions than requested", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.countByTheme.mockResolvedValue(5);

    await expect(
      service.create("user_1", {
        title: "Gênesis Quiz",
        themeId: "theme_1",
        questionCount: 10,
        specialBlockPercent: 0,
        teams: [{ name: "A", color: "#f00" }, { name: "B", color: "#00f" }],
      })
    ).rejects.toThrow("NOT_ENOUGH_QUESTIONS");
    expect(gameRepo.createWithBlocksAndTeams).not.toHaveBeenCalled();
  });

  it("builds exactly N question blocks plus special blocks from the percentage, all shuffled positions 0..N-1", async () => {
    themeSvc.getOwned.mockResolvedValue({ id: "theme_1", ownerId: "user_1" });
    questionRepo.countByTheme.mockResolvedValue(20);
    const drawnQuestions = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}` }));
    questionRepo.findRandomByTheme.mockResolvedValue(drawnQuestions);
    gameRepo.createWithBlocksAndTeams.mockImplementation(async (params: any) => ({
      id: "game_1",
      ...params,
    }));

    await service.create("user_1", {
      title: "Gênesis Quiz",
      themeId: "theme_1",
      questionCount: 10,
      specialBlockPercent: 20,
      teams: [{ name: "A", color: "#f00" }, { name: "B", color: "#00f" }],
    });

    expect(questionRepo.findRandomByTheme).toHaveBeenCalledWith("theme_1", 10);
    const callArg = gameRepo.createWithBlocksAndTeams.mock.calls[0][0];
    // 10 question blocks + 20% of 10 = 2 special blocks = 12 total
    expect(callArg.blocks).toHaveLength(12);
    const positions = callArg.blocks.map((b: any) => b.position).sort((a: number, b: number) => a - b);
    expect(positions).toEqual(Array.from({ length: 12 }, (_, i) => i));
    const questionBlocks = callArg.blocks.filter((b: any) => b.type === "question");
    expect(questionBlocks).toHaveLength(10);
    const specialBlocks = callArg.blocks.filter((b: any) => b.type !== "question");
    expect(specialBlocks).toHaveLength(2);
    specialBlocks.forEach((b: any) => {
      expect(["bonus_points", "lose_points", "skip_turn"]).toContain(b.type);
      expect(b.questionId).toBeNull();
    });
  });
});
