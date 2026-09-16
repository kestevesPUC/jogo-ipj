import { describe, it, expect, vi, beforeEach } from "vitest";
import { GameplayService } from "./gameplay-service";

function makeGameRepoMock() {
  return {
    findBlockById: vi.fn(),
    markBlockRevealed: vi.fn(),
    findTeamById: vi.fn(),
    setTeamScore: vi.fn(),
    incrementAllTeamScores: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function makeGameServiceMock() {
  return { getOwned: vi.fn() };
}

describe("GameplayService", () => {
  let gameRepo: ReturnType<typeof makeGameRepoMock>;
  let gameSvc: ReturnType<typeof makeGameServiceMock>;
  let service: GameplayService;

  beforeEach(() => {
    gameRepo = makeGameRepoMock();
    gameSvc = makeGameServiceMock();
    service = new GameplayService(gameRepo as any, gameSvc as any);
  });

  it("reveals a question block without touching scores", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1", status: "in_progress" });
    gameRepo.findBlockById.mockResolvedValue({ id: "b1", gameId: "game_1", type: "question", pointsValue: null });
    gameRepo.markBlockRevealed.mockResolvedValue({ id: "b1", revealed: true });

    const result = await service.revealBlock("user_1", "game_1", "b1");

    expect(result.revealed).toBe(true);
    expect(gameRepo.incrementAllTeamScores).not.toHaveBeenCalled();
  });

  it("applies bonus points to every team when a bonus_points block is revealed and no active team is given", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1", status: "in_progress" });
    gameRepo.findBlockById.mockResolvedValue({
      id: "b2",
      gameId: "game_1",
      type: "bonus_points",
      pointsValue: 50,
    });
    gameRepo.markBlockRevealed.mockResolvedValue({ id: "b2", revealed: true });

    await service.revealBlock("user_1", "game_1", "b2");

    expect(gameRepo.incrementAllTeamScores).toHaveBeenCalledWith("game_1", 50);
  });

  it("applies bonus points only to the active team when activeTeamId is given", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1", status: "in_progress" });
    gameRepo.findBlockById.mockResolvedValue({
      id: "b2",
      gameId: "game_1",
      type: "bonus_points",
      pointsValue: 50,
    });
    gameRepo.markBlockRevealed.mockResolvedValue({ id: "b2", revealed: true });
    gameRepo.findTeamById.mockResolvedValue({ id: "team_1", gameId: "game_1", score: 100 });
    gameRepo.setTeamScore.mockResolvedValue({ id: "team_1", score: 150 });

    await service.revealBlock("user_1", "game_1", "b2", "team_1");

    expect(gameRepo.setTeamScore).toHaveBeenCalledWith("team_1", 150);
    expect(gameRepo.incrementAllTeamScores).not.toHaveBeenCalled();
  });

  it("applies lose points only to the active team when activeTeamId is given", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1", status: "in_progress" });
    gameRepo.findBlockById.mockResolvedValue({
      id: "b3",
      gameId: "game_1",
      type: "lose_points",
      pointsValue: -50,
    });
    gameRepo.markBlockRevealed.mockResolvedValue({ id: "b3", revealed: true });
    gameRepo.findTeamById.mockResolvedValue({ id: "team_1", gameId: "game_1", score: 100 });
    gameRepo.setTeamScore.mockResolvedValue({ id: "team_1", score: 50 });

    await service.revealBlock("user_1", "game_1", "b3", "team_1");

    expect(gameRepo.setTeamScore).toHaveBeenCalledWith("team_1", 50);
    expect(gameRepo.incrementAllTeamScores).not.toHaveBeenCalled();
  });

  it("rejects an activeTeamId that does not belong to the game", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1", status: "in_progress" });
    gameRepo.findBlockById.mockResolvedValue({
      id: "b2",
      gameId: "game_1",
      type: "bonus_points",
      pointsValue: 50,
    });
    gameRepo.markBlockRevealed.mockResolvedValue({ id: "b2", revealed: true });
    gameRepo.findTeamById.mockResolvedValue({ id: "team_1", gameId: "other_game", score: 100 });

    await expect(service.revealBlock("user_1", "game_1", "b2", "team_1")).rejects.toThrow("TEAM_NOT_FOUND");
  });

  it("rejects revealing a block that belongs to a different game", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1", status: "in_progress" });
    gameRepo.findBlockById.mockResolvedValue({ id: "b1", gameId: "other_game", type: "question" });

    await expect(service.revealBlock("user_1", "game_1", "b1")).rejects.toThrow("BLOCK_NOT_FOUND");
  });

  it("transitions a draft game to in_progress on first reveal", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1", status: "draft" });
    gameRepo.findBlockById.mockResolvedValue({ id: "b1", gameId: "game_1", type: "question", pointsValue: null });
    gameRepo.markBlockRevealed.mockResolvedValue({ id: "b1", revealed: true });

    await service.revealBlock("user_1", "game_1", "b1");

    expect(gameRepo.updateStatus).toHaveBeenCalledWith("game_1", "in_progress");
  });

  it("does not transition status again once the game is already in_progress", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1", status: "in_progress" });
    gameRepo.findBlockById.mockResolvedValue({ id: "b1", gameId: "game_1", type: "question", pointsValue: null });
    gameRepo.markBlockRevealed.mockResolvedValue({ id: "b1", revealed: true });

    await service.revealBlock("user_1", "game_1", "b1");

    expect(gameRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("adjusts a single team's score by a delta", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1" });
    gameRepo.findTeamById.mockResolvedValue({ id: "team_1", gameId: "game_1", score: 100 });
    gameRepo.setTeamScore.mockResolvedValue({ id: "team_1", score: 130 });

    const result = await service.adjustScore("user_1", "game_1", "team_1", 30);

    expect(gameRepo.setTeamScore).toHaveBeenCalledWith("team_1", 130);
    expect(result.score).toBe(130);
  });

  it("finishes a game", async () => {
    gameSvc.getOwned.mockResolvedValue({ id: "game_1", ownerId: "user_1" });
    gameRepo.updateStatus.mockResolvedValue({ id: "game_1", status: "finished" });

    const result = await service.finish("user_1", "game_1");

    expect(gameRepo.updateStatus).toHaveBeenCalledWith("game_1", "finished", expect.any(Date));
    expect(result.status).toBe("finished");
  });
});
