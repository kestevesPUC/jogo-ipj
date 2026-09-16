import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";
import { POST as createGame } from "./route";
import { GET as getGame } from "./[id]/route";
import { POST as revealBlock } from "./[id]/blocks/[blockId]/reveal/route";
import { POST as finishGame } from "./[id]/finish/route";

let userId: string;
let themeId: string;
let cookie: string;
let gameId: string;

describe("game routes", () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { name: "Game Tester", email: "gametester@example.com", passwordHash: "x" },
    });
    userId = user.id;
    cookie = `${SESSION_COOKIE}=${signToken({ userId })}`;

    const theme = await prisma.theme.create({
      data: { name: "Tema de teste de jogo", ownerId: userId },
    });
    themeId = theme.id;

    await prisma.question.createMany({
      data: [
        { themeId, prompt: "Pergunta 1", answer: "Resposta 1", mediaType: "none", mediaSource: null, mediaValue: null },
        { themeId, prompt: "Pergunta 2", answer: "Resposta 2", mediaType: "none", mediaSource: null, mediaValue: null },
        { themeId, prompt: "Pergunta 3", answer: "Resposta 3", mediaType: "none", mediaSource: null, mediaValue: null },
      ],
    });
  });

  afterAll(async () => {
    if (gameId) {
      await prisma.team.deleteMany({ where: { gameId } });
      await prisma.gameBlock.deleteMany({ where: { gameId } });
      await prisma.game.deleteMany({ where: { id: gameId } });
    }
    await prisma.question.deleteMany({ where: { themeId } });
    await prisma.theme.deleteMany({ where: { id: themeId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("creates a game, reveals a block, and finishes it", async () => {
    const createRes = await createGame(
      new Request("http://localhost/api/games", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({
          title: "Jogo de teste",
          themeId,
          questionCount: 3,
          specialBlockPercent: 33,
          teams: [
            { name: "Time A", color: "#e63946" },
            { name: "Time B", color: "#1d3557" },
          ],
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const { game } = await createRes.json();
    gameId = game.id;

    expect(game.status).toBe("draft");
    expect(game.blocks.length).toBe(3);
    expect(game.teams.length).toBe(2);

    const activeTeamId = game.teams[0].id;
    const initialScore = game.teams[0].score;
    const firstBlock = game.blocks[0];

    const revealRes = await revealBlock(
      new Request(`http://localhost/api/games/${gameId}/blocks/${firstBlock.id}/reveal`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ activeTeamId }),
      }),
      { params: { id: gameId, blockId: firstBlock.id } }
    );
    expect(revealRes.status).toBe(200);
    const { block } = await revealRes.json();
    expect(block.revealed).toBe(true);

    const afterRevealRes = await getGame(
      new Request(`http://localhost/api/games/${gameId}`, { headers: { cookie } }),
      { params: { id: gameId } }
    );
    const { game: afterReveal } = await afterRevealRes.json();
    expect(afterReveal.status).toBe("in_progress");

    if (firstBlock.type === "bonus_points" || firstBlock.type === "lose_points") {
      const activeTeamAfter = afterReveal.teams.find((t: { id: string }) => t.id === activeTeamId);
      expect(activeTeamAfter.score).toBe(initialScore + (firstBlock.pointsValue ?? 0));
    }

    const finishRes = await finishGame(
      new Request(`http://localhost/api/games/${gameId}/finish`, { method: "POST", headers: { cookie } }),
      { params: { id: gameId } }
    );
    expect(finishRes.status).toBe(200);
    const { game: finished } = await finishRes.json();
    expect(finished.status).toBe("finished");

    const finalRes = await getGame(
      new Request(`http://localhost/api/games/${gameId}`, { headers: { cookie } }),
      { params: { id: gameId } }
    );
    const { game: final } = await finalRes.json();
    expect(final.status).toBe("finished");
  });
});
