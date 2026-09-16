"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { BlockGrid } from "@/components/block-grid";
import { Scoreboard } from "@/components/scoreboard";
import { IconTrophy } from "@/components/icons";

interface Question {
  id: string;
  prompt: string;
  answer: string;
  mediaType: "none" | "image" | "gif" | "video";
  mediaSource: "upload" | "url" | null;
  mediaValue: string | null;
}

interface Block {
  id: string;
  position: number;
  type: "question" | "bonus_points" | "lose_points" | "skip_turn";
  revealed: boolean;
  question: Question | null;
  pointsValue: number | null;
}

interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
}

interface Game {
  id: string;
  title: string;
  status: "draft" | "in_progress" | "finished";
  blocks: Block[];
  teams: Team[];
}

function MediaPreview({ question }: { question: Question }) {
  if (question.mediaType === "none" || !question.mediaValue) return null;
  if (question.mediaType === "video") {
    return (
      <div className="media-frame">
        {question.mediaSource === "url" ? (
          <iframe src={question.mediaValue} allow="autoplay; encrypted-media" allowFullScreen />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={question.mediaValue} controls />
        )}
      </div>
    );
  }
  return (
    <div className="media-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={question.mediaValue} alt="" />
    </div>
  );
}

export default function GamePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useSession();
  const [game, setGame] = useState<Game | null>(null);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);

  async function loadGame() {
    const res = await fetch(`/api/games/${params.id}`);
    if (res.ok) {
      const { game } = await res.json();
      setGame(game);
      setActiveTeamId((prev) => prev ?? game.teams?.[0]?.id ?? null);
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    loadGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, router, params.id]);

  async function handleSelectBlock(block: { id: string }) {
    const res = await fetch(`/api/games/${params.id}/blocks/${block.id}/reveal`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ activeTeamId }),
    });
    if (res.ok) {
      const fullBlock = game?.blocks.find((b) => b.id === block.id) ?? null;
      await loadGame();
      if (fullBlock) setActiveBlock({ ...fullBlock, revealed: true });
    }
  }

  async function handleAdjustScore(teamId: string, delta: number) {
    await fetch(`/api/games/${params.id}/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId, delta }),
    });
    loadGame();
  }

  async function handleFinish() {
    setFinishError(null);
    const res = await fetch(`/api/games/${params.id}/finish`, { method: "POST" });
    if (!res.ok) {
      setFinishError("Erro ao encerrar o jogo. Tente novamente.");
      return;
    }
    router.push(`/games/${params.id}/result`);
  }

  if (loading || !user || !game) return null;

  const remaining = game.blocks.filter((b) => !b.revealed).length;

  return (
    <div className="page">
      <header className="page-header">
        <div className="brand">
          <span className="brand-mark">QB</span>
          {game.title}
        </div>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {remaining} bloco(s) restante(s)
        </span>
      </header>

      <main className="page-body page-body--wide">
        <Scoreboard teams={game.teams} onAdjust={handleAdjustScore} activeTeamId={activeTeamId} />

        <div className="field">
          <span className="field-label">Time da vez</span>
          <div className="active-team-picker" role="group" aria-label="Selecionar time da vez">
            {game.teams.map((team) => (
              <button
                key={team.id}
                type="button"
                className="active-team-chip"
                aria-pressed={activeTeamId === team.id}
                onClick={() => setActiveTeamId(team.id)}
              >
                <span className="active-team-swatch" style={{ background: team.color }} />
                {team.name}
              </button>
            ))}
          </div>
        </div>

        {activeBlock?.type === "question" && activeBlock.question && (
          <div className="reveal-panel">
            <h2>{activeBlock.question.prompt}</h2>
            <MediaPreview question={activeBlock.question} />
            <div className="reveal-answer">
              <IconTrophy size={18} />
              Resposta: {activeBlock.question.answer}
            </div>
          </div>
        )}
        {activeBlock && activeBlock.type !== "question" && (
          <div className="reveal-panel reveal-panel--special">
            <h2>
              {activeBlock.type === "bonus_points" && `Bônus! +${activeBlock.pointsValue} para o time da vez`}
              {activeBlock.type === "lose_points" && `Perde pontos! ${activeBlock.pointsValue} para o time da vez`}
              {activeBlock.type === "skip_turn" && "Passa a vez!"}
            </h2>
          </div>
        )}

        <div className="section">
          <div className="section-head">
            <h2 className="section-title">Perguntas</h2>
          </div>
          <BlockGrid blocks={game.blocks} onSelect={handleSelectBlock} />
        </div>

        {finishError && (
          <div className="callout callout-error" role="alert">
            {finishError}
          </div>
        )}

        <div>
          <button className="btn btn-accent" onClick={handleFinish}>
            Encerrar jogo
          </button>
        </div>
      </main>
    </div>
  );
}
