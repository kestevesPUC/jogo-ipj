import { gameRepository, GameRepository } from "@/repositories/game-repository";
import { gameService, GameService } from "@/services/game-service";

export class GameplayService {
  constructor(
    private repo: GameRepository = gameRepository,
    private games: Pick<GameService, "getOwned"> = gameService
  ) {}

  async revealBlock(ownerId: string, gameId: string, blockId: string, activeTeamId?: string) {
    const game = await this.games.getOwned(ownerId, gameId);
    const block = await this.repo.findBlockById(blockId);
    if (!block || block.gameId !== gameId) {
      throw new Error("BLOCK_NOT_FOUND");
    }

    if (game.status === "draft") {
      await this.repo.updateStatus(gameId, "in_progress");
    }

    const revealed = await this.repo.markBlockRevealed(blockId);

    if (block.type === "bonus_points" || block.type === "lose_points") {
      if (activeTeamId) {
        const team = await this.repo.findTeamById(activeTeamId);
        if (!team || team.gameId !== gameId) {
          throw new Error("TEAM_NOT_FOUND");
        }
        await this.repo.setTeamScore(activeTeamId, team.score + (block.pointsValue ?? 0));
      } else {
        await this.repo.incrementAllTeamScores(gameId, block.pointsValue ?? 0);
      }
    }

    return revealed;
  }

  async adjustScore(ownerId: string, gameId: string, teamId: string, delta: number) {
    await this.games.getOwned(ownerId, gameId);
    const team = await this.repo.findTeamById(teamId);
    if (!team || team.gameId !== gameId) {
      throw new Error("TEAM_NOT_FOUND");
    }
    return this.repo.setTeamScore(teamId, team.score + delta);
  }

  async finish(ownerId: string, gameId: string) {
    await this.games.getOwned(ownerId, gameId);
    return this.repo.updateStatus(gameId, "finished", new Date());
  }
}

export const gameplayService = new GameplayService();
