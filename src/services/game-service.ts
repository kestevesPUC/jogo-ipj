import { gameRepository, GameRepository, NewBlock, NewTeam } from "@/repositories/game-repository";
import { questionRepository, QuestionRepository } from "@/repositories/question-repository";
import { themeService, ThemeService } from "@/services/theme-service";
import type { BlockType, GameStatus } from "@prisma/client";

export interface CreateGameInput {
  title: string;
  themeId: string;
  questionCount: number;
  specialBlockPercent: number;
  teams: { name: string; color: string }[];
}

const SPECIAL_TYPES: Exclude<BlockType, "question">[] = ["bonus_points", "lose_points", "skip_turn"];
const SPECIAL_POINTS: Record<"bonus_points" | "lose_points", number> = {
  bonus_points: 50,
  lose_points: -50,
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class GameService {
  constructor(
    private gameRepo: GameRepository = gameRepository,
    private questionRepo: QuestionRepository = questionRepository,
    private themes: Pick<ThemeService, "getOwned"> = themeService
  ) {}

  async create(ownerId: string, input: CreateGameInput) {
    const theme = await this.themes.getOwned(ownerId, input.themeId);
    const available = await this.questionRepo.countByTheme(theme.id);
    if (available < input.questionCount) {
      throw new Error("NOT_ENOUGH_QUESTIONS");
    }

    const drawnQuestions = await this.questionRepo.findRandomByTheme(theme.id, input.questionCount);

    const questionBlocks: NewBlock[] = drawnQuestions.map((q) => ({
      position: -1,
      type: "question",
      questionId: q.id,
      pointsValue: null,
    }));

    const specialCount = Math.floor((input.questionCount * input.specialBlockPercent) / 100);
    const specialBlocks: NewBlock[] = Array.from({ length: specialCount }, (_, i) => {
      const type = SPECIAL_TYPES[i % SPECIAL_TYPES.length];
      return {
        position: -1,
        type,
        questionId: null,
        pointsValue: type === "skip_turn" ? null : SPECIAL_POINTS[type],
      };
    });

    const shuffledBlocks = shuffle([...questionBlocks, ...specialBlocks]).map((block, index) => ({
      ...block,
      position: index,
    }));

    const teams: NewTeam[] = input.teams.map((t) => ({ name: t.name, color: t.color }));

    return this.gameRepo.createWithBlocksAndTeams({
      ownerId,
      themeId: theme.id,
      title: input.title,
      questionCount: input.questionCount,
      specialBlockPercent: input.specialBlockPercent,
      blocks: shuffledBlocks,
      teams,
    });
  }

  async getOwned(ownerId: string, gameId: string) {
    const game = await this.gameRepo.findByIdAndOwner(gameId, ownerId);
    if (!game) throw new Error("GAME_NOT_FOUND");
    return game;
  }

  listByOwner(ownerId: string, status?: GameStatus) {
    return this.gameRepo.findAllByOwner(ownerId, status);
  }
}

export const gameService = new GameService();
