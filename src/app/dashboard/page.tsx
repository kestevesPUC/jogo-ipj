"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import {
  IconPlus,
  IconBook,
  IconGamepad,
  IconHistory,
  IconTrophy,
} from "@/components/icons";

interface Theme {
  id: string;
  name: string;
}

interface Game {
  id: string;
  title: string;
  status: "draft" | "in_progress" | "finished";
}

const STATUS_LABEL: Record<Game["status"], string> = {
  draft: "Rascunho",
  in_progress: "Em andamento",
  finished: "Finalizado",
};

function StatusBadge({ status }: { status: Game["status"] }) {
  const cls = status === "in_progress" ? "badge-progress" : status === "finished" ? "badge-finished" : "badge-draft";
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-icon" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [newThemeName, setNewThemeName] = useState("");
  const [creatingTheme, setCreatingTheme] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetch("/api/themes").then((r) => r.json()).then((d) => setThemes(d.themes ?? []));
    fetch("/api/games").then((r) => r.json()).then((d) => setGames(d.games ?? []));
  }, [loading, user, router]);

  async function createTheme(e: React.FormEvent) {
    e.preventDefault();
    if (!newThemeName.trim()) return;
    setCreatingTheme(true);
    setThemeError(null);
    const res = await fetch("/api/themes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newThemeName }),
    });
    setCreatingTheme(false);
    if (res.ok) {
      const { theme } = await res.json();
      setThemes((prev) => [theme, ...prev]);
      setNewThemeName("");
    } else {
      setThemeError("Não foi possível criar o tema.");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (loading || !user) return null;

  const finishedGames = games.filter((g) => g.status === "finished");
  const activeGames = games.filter((g) => g.status !== "finished");

  return (
    <div className="page">
      <header className="page-header">
        <div className="brand">
          <span className="brand-mark">QB</span>
          Quiz Bíblico
        </div>
        <div className="row">
          <span className="muted" style={{ fontSize: "0.9rem" }}>
            Olá, <strong style={{ color: "var(--color-ink)" }}>{user.name}</strong>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <main className="page-body page-body--wide">
        <div className="bento-grid">
          {/* Temas */}
          <div className="card section" style={{ gridColumn: "span 2" }}>
            <div className="section-head">
              <div className="row">
                <IconBook size={20} className="muted" />
                <h2 className="section-title">Temas</h2>
              </div>
              <span className="section-sub">{themes.length} cadastrado(s)</span>
            </div>

            <form onSubmit={createTheme} className="form-row">
              <input
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="Nome do tema (ex: Livro de Gênesis)"
                value={newThemeName}
                onChange={(e) => setNewThemeName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={creatingTheme}>
                <IconPlus size={15} />
                {creatingTheme ? "Criando..." : "Criar tema"}
              </button>
            </form>
            {themeError && (
              <div className="callout callout-error" role="alert">
                {themeError}
              </div>
            )}

            {themes.length === 0 ? (
              <div className="empty-state">Nenhum tema ainda. Crie o primeiro acima.</div>
            ) : (
              <ul className="list-card">
                {themes.map((theme) => (
                  <li key={theme.id} className="list-row">
                    <Link href={`/themes/${theme.id}`} className="list-row-main">
                      <span className="list-row-title">{theme.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Jogos */}
          <div className="card section">
            <div className="section-head">
              <div className="row">
                <IconGamepad size={20} className="muted" />
                <h2 className="section-title">Jogos</h2>
              </div>
            </div>

            <Link href="/games/new" className="btn btn-accent w-full">
              <IconPlus size={15} />
              Criar novo jogo
            </Link>

            {activeGames.length === 0 ? (
              <div className="empty-state">Nenhum jogo ativo.</div>
            ) : (
              <ul className="list-card">
                {activeGames.map((game) => (
                  <li key={game.id} className="list-row">
                    <Link href={`/games/${game.id}`} className="list-row-main">
                      <span className="list-row-title">{game.title}</span>
                    </Link>
                    <div className="list-row-actions">
                      <StatusBadge status={game.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Histórico */}
          <div className="card section">
            <div className="section-head">
              <div className="row">
                <IconHistory size={20} className="muted" />
                <h2 className="section-title">Histórico</h2>
              </div>
            </div>

            {finishedGames.length === 0 ? (
              <div className="empty-state">Nenhum jogo finalizado ainda.</div>
            ) : (
              <ul className="list-card">
                {finishedGames.map((game) => (
                  <li key={game.id} className="list-row">
                    <Link href={`/games/${game.id}/result`} className="list-row-main">
                      <span className="list-row-title">{game.title}</span>
                    </Link>
                    <div className="list-row-actions">
                      <IconTrophy size={16} style={{ color: "var(--accent-strong)" }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
