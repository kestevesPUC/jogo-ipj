"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { QuestionForm, QuestionFormValue } from "@/components/question-form";
import { IconArrowLeft, IconEdit, IconTrash, IconImage } from "@/components/icons";

const MAX_QUESTIONS_PER_THEME = 100;

interface Question {
  id: string;
  prompt: string;
  answer: string;
  mediaType: "none" | "image" | "gif" | "video";
  mediaSource: "upload" | "url" | null;
  mediaValue: string | null;
}

export default function ThemeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useSession();
  const [themeName, setThemeName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadData() {
    const themeRes = await fetch(`/api/themes/${params.id}`);
    if (themeRes.ok) {
      const { theme } = await themeRes.json();
      setThemeName(theme.name);
    }
    const questionsRes = await fetch(`/api/themes/${params.id}/questions`);
    if (questionsRes.ok) {
      const { questions } = await questionsRes.json();
      setQuestions(questions);
    }
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, router, params.id]);

  async function handleCreate(value: QuestionFormValue) {
    setError(null);
    const res = await fetch(`/api/themes/${params.id}/questions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error === "THEME_QUESTION_LIMIT" ? "Limite de 100 perguntas atingido." : "Erro ao salvar.");
      return;
    }
    loadData();
  }

  async function handleUpdate(value: QuestionFormValue) {
    if (!editingId) return;
    setError(null);
    const res = await fetch(`/api/questions/${editingId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      setError("Erro ao salvar.");
      return;
    }
    setEditingId(null);
    loadData();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    if (editingId === id) setEditingId(null);
    loadData();
  }

  if (loading || !user) return null;

  const editingQuestion = questions.find((q) => q.id === editingId) ?? null;
  const pct = Math.min(100, Math.round((questions.length / MAX_QUESTIONS_PER_THEME) * 100));

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

      <main className="page-body">
        <div className="section">
          <p className="eyebrow">Tema</p>
          <h1 className="hero-title">{themeName || "Carregando..."}</h1>
          <div className="row-wrap" style={{ marginTop: 4 }}>
            <div
              style={{
                flex: "1 1 220px",
                maxWidth: 280,
                height: 8,
                borderRadius: 999,
                background: "var(--color-bg-sunken)",
                overflow: "hidden",
              }}
              role="progressbar"
              aria-valuenow={questions.length}
              aria-valuemin={0}
              aria-valuemax={MAX_QUESTIONS_PER_THEME}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--color-gold-400), var(--color-gold-600))",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <span className="muted" style={{ fontSize: "0.85rem" }}>
              {questions.length} / {MAX_QUESTIONS_PER_THEME} perguntas
            </span>
          </div>
        </div>

        {error && (
          <div className="callout callout-error" role="alert">
            {error}
          </div>
        )}

        <div className="card section">
          <h2 className="section-title">{editingQuestion ? "Editar pergunta" : "Nova pergunta"}</h2>
          {editingQuestion ? (
            <QuestionForm
              key={editingQuestion.id}
              initialValue={editingQuestion}
              onSubmit={handleUpdate}
              onCancel={() => setEditingId(null)}
              submitLabel="Salvar alterações"
            />
          ) : (
            <QuestionForm onSubmit={handleCreate} submitLabel="Adicionar pergunta" />
          )}
        </div>

        <div className="section">
          <div className="section-head">
            <h2 className="section-title">Perguntas cadastradas</h2>
          </div>

          {questions.length === 0 ? (
            <div className="empty-state">Nenhuma pergunta cadastrada ainda.</div>
          ) : (
            <ul className="list-card">
              {questions.map((q) => (
                <li key={q.id} className="list-row">
                  <div className="list-row-main">
                    <span className="list-row-title">{q.prompt}</span>
                    <span className="list-row-meta">
                      Resposta: {q.answer}
                      {q.mediaType !== "none" && (
                        <>
                          {" · "}
                          <IconImage size={12} style={{ verticalAlign: "-2px", display: "inline" }} />{" "}
                          {q.mediaType}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="list-row-actions">
                    <button
                      className="icon-btn btn-ghost"
                      onClick={() => setEditingId(q.id)}
                      aria-label={`Editar pergunta: ${q.prompt}`}
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      className="icon-btn btn-danger"
                      onClick={() => handleDelete(q.id)}
                      aria-label={`Excluir pergunta: ${q.prompt}`}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
