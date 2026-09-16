import { prisma } from "@/lib/prisma";
import type { Game, GameStatus, BlockType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export const gameWithDetailsInclude = {
  blocks: { orderBy: { position: "asc" as const }, include: { question: true } },
  teams: true,
  theme: true,
} satisfies Prisma.GameInclude;

export type GameWithDetails = Prisma.GameGetPayload<{ include: typeof gameWithDetailsInclude }>;

export interface NewBlock {
  position: number;
  type: BlockType;
  questionId: string | null;
  pointsValue: number | null;
}

export interface NewTeam {
  name: string;
  color: string;
}

export class GameRepository {
  findByIdAndOwner(id: string, ownerId: string): Promise<GameWithDetails | null> {
    return prisma.game.findFirst({
      where: { id, ownerId },
      include: gameWithDetailsInclude,
    });
  }

  findAllByOwner(ownerId: string, status?: GameStatus): Promise<Game[]> {
    return prisma.game.findMany({
      where: { ownerId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Creates the Game, its GameBlocks, and its Teams in a single transaction. */
  async createWithBlocksAndTeams(params: {
    ownerId: string;
    themeId: string;
    title: string;
    questionCount: number;
    specialBlockPercent: number;
    blocks: NewBlock[];
    teams: NewTeam[];
  }): Promise<GameWithDetails> {
    const gameId = await prisma.$transaction(async (tx) => {
      const game = await tx.game.create({
        data: {
          ownerId: params.ownerId,
          themeId: params.themeId,
          title: params.title,
          questionCount: params.questionCount,
          specialBlockPercent: params.specialBlockPercent,
        },
      });

      await tx.gameBlock.createMany({
        data: params.blocks.map((b) => ({ ...b, gameId: game.id })),
      });

      await tx.team.createMany({
        data: params.teams.map((t) => ({ ...t, gameId: game.id, score: 0 })),
      });

      return game.id;
    });

    const created = await prisma.game.findUnique({
      where: { id: gameId },
      include: gameWithDetailsInclude,
    });
    if (!created) throw new Error("GAME_CREATION_FAILED");
    return created;
  }

  updateStatus(id: string, status: GameStatus, finishedAt?: Date): Promise<Game> {
    return prisma.game.update({ where: { id }, data: { status, finishedAt } });
  }

  findBlockById(id: string) {
    return prisma.gameBlock.findUnique({ where: { id } });
  }

  markBlockRevealed(id: string) {
    return prisma.gameBlock.update({ where: { id }, data: { revealed: true } });
  }

  findTeamById(id: string) {
    return prisma.team.findUnique({ where: { id } });
  }

  setTeamScore(id: string, score: number) {
    return prisma.team.update({ where: { id }, data: { score } });
  }

  incrementAllTeamScores(gameId: string, delta: number) {
    return prisma.team.updateMany({ where: { gameId }, data: { score: { increment: delta } } });
  }
}

export const gameRepository = new GameRepository();
