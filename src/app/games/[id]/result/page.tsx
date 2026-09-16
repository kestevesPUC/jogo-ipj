"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { IconTrophy, IconArrowLeft } from "@/components/icons";

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
  teams: Team[];
}

export default function GameResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useSession();
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetch(`/api/games/${params.id}`)
      .then((r) => r.json())
      .then((d) => setGame(d.game));
  }, [loading, user, router, params.id]);

  if (loading || !user || !game) return null;

  if (game.status !== "finished") {
    return (
      <main className="centered-shell">
        <div className="auth-card text-center">
          <h1 className="hero-title" style={{ marginBottom: 12 }}>
            {game.title}
          </h1>
          <p className="muted" style={{ marginBottom: 20 }}>
            Este jogo ainda não foi finalizado.
          </p>
          <Link href={`/games/${game.id}`} className="btn btn-primary">
            Voltar ao jogo
          </Link>
        </div>
      </main>
    );
  }

  const ranked = [...game.teams].sort((a, b) => b.score - a.score);

  return (
    <main className="centered-shell">
      <div style={{ width: "100%", maxWidth: 520 }} className="stack-md">
        <div className="text-center stack-sm">
          <div style={{ display: "inline-flex", margin: "0 auto" }}>
            <IconTrophy size={44} style={{ color: "var(--accent-strong)" }} />
          </div>
          <p className="eyebrow">Resultado final</p>
          <h1 className="hero-title">{game.title}</h1>
        </div>

        <div className="ranking-list">
          {ranked.map((team, i) => (
            <div key={team.id} className={`ranking-row${i === 0 ? " ranking-row--first" : ""}`}>
              <span className="ranking-position">{i + 1}º</span>
              <span className="ranking-swatch" style={{ background: team.color }} />
              <span className="ranking-name">{team.name}</span>
              <span className="ranking-score">{team.score}</span>
            </div>
          ))}
        </div>

        <Link href="/dashboard" className="btn btn-ghost" style={{ margin: "0 auto" }}>
          <IconArrowLeft size={15} />
          Voltar ao painel
        </Link>
      </div>
    </main>
  );
}
