"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { IconArrowLeft, IconPlus, IconTrash, IconUsers } from "@/components/icons";

interface Theme {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  color: string;
}

const SWATCHES = ["#c94f4f", "#2b6fe0", "#1f9d73", "#e0a12e", "#7b5ec9", "#e2679b"];

export default function NewGamePage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [title, setTitle] = useState("");
  const [themeId, setThemeId] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [specialBlockPercent, setSpecialBlockPercent] = useState(10);
  const [teams, setTeams] = useState<Team[]>([
    { id: "1", name: "Time 1", color: SWATCHES[0] },
    { id: "2", name: "Time 2", color: SWATCHES[1] },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetch("/api/themes")
      .then((r) => r.json())
      .then((d) => {
        setThemes(d.themes ?? []);
        if (d.themes?.[0]) setThemeId(d.themes[0].id);
        setThemeError(null);
      })
      .catch(() => {
        setThemeError("Erro ao carregar temas. Tente recarregar a página.");
      });
  }, [loading, user, router]);

  if (loading || !user) return null;

  function updateTeam(id: string, field: "name" | "color", value: string) {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  }

  function addTeam() {
    setTeams((prev) => {
      if (prev.length >= 10) return prev;
      const color = SWATCHES[prev.length % SWATCHES.length];
      return [...prev, { id: Math.random().toString(36).slice(2, 9), name: `Time ${prev.length + 1}`, color }];
    });
  }

  function removeTeam(id: string) {
    setTeams((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const teamsForServer = teams.map(({ name, color }) => ({ name, color }));

    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, themeId, questionCount, specialBlockPercent, teams: teamsForServer }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json();
      setError(
        body.error === "NOT_ENOUGH_QUESTIONS"
          ? "O tema não tem perguntas suficientes."
          : "Erro ao criar o jogo."
      );
      return;
    }

    const { game } = await res.json();
    router.push(`/games/${game.id}`);
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="brand">
          <span className="brand-mark">QB</span>
          Quiz Bíblico
        </div>
        <Link href="/dashboard" className="btn btn-ghost btn-sm">
          <IconArrowLeft size={15} />
          Painel
        </Link>
      </header>

      <main className="page-body page-body--narrow" style={{ maxWidth: 560 }}>
        <div className="section">
          <p className="eyebrow">Novo jogo</p>
          <h1 className="hero-title">Configurar partida</h1>
        </div>

        {themeError && (
          <div className="callout callout-error" role="alert">
            {themeError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card form-grid">
          <div className="field">
            <label className="field-label" htmlFor="title">
              Título do jogo
            </label>
            <input
              id="title"
              className="input"
              placeholder="Ex: Competição de Gênesis"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="theme">
              Tema
            </label>
            <select id="theme" className="input" value={themeId} onChange={(e) => setThemeId(e.target.value)} required>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label className="field-label" htmlFor="questionCount">
                Quantidade de perguntas
              </label>
              <input
                id="questionCount"
                className="input"
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 160 }}>
              <label className="field-label" htmlFor="specialPct">
                % de blocos especiais
              </label>
              <input
                id="specialPct"
                className="input"
                type="number"
                min={0}
                max={50}
                value={specialBlockPercent}
                onChange={(e) => setSpecialBlockPercent(Number(e.target.value))}
              />
              <span className="field-hint">Bônus, penalidade e passa-a-vez</span>
            </div>
          </div>

          <div className="field">
            <div className="row">
              <IconUsers size={16} className="muted" />
              <span className="field-label">Times ({teams.length}/10)</span>
            </div>
            <div className="stack-sm">
              {teams.map((team) => (
                <div key={team.id} className="row">
                  <input
                    type="color"
                    className="input-color"
                    value={team.color}
                    onChange={(e) => updateTeam(team.id, "color", e.target.value)}
                    aria-label={`Cor do time ${team.name}`}
                  />
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    value={team.name}
                    onChange={(e) => updateTeam(team.id, "name", e.target.value)}
                    aria-label="Nome do time"
                  />
                  {teams.length > 2 && (
                    <button
                      type="button"
                      className="icon-btn btn-danger"
                      onClick={() => removeTeam(team.id)}
                      aria-label={`Remover ${team.name}`}
                    >
                      <IconTrash size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={addTeam} disabled={teams.length >= 10}>
              <IconPlus size={14} />
              Adicionar time
            </button>
          </div>

          {error && (
            <div className="callout callout-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-accent btn-block" disabled={submitting}>
            {submitting ? "Criando..." : "Criar jogo"}
          </button>
        </form>
      </main>
    </div>
  );
}
