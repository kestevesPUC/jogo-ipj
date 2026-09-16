"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error === "EMAIL_TAKEN" ? "Este e-mail já está em uso." : "Dados inválidos.");
      return;
    }

    router.push("/login");
  }

  return (
    <main className="centered-shell">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 24 }}>
          <span className="brand-mark">QB</span>
          Quiz Bíblico
        </div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>
          Comece agora
        </p>
        <h1 className="hero-title" style={{ marginBottom: 24 }}>
          Criar sua conta
        </h1>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label className="field-label" htmlFor="name">
              Nome
            </label>
            <input
              id="name"
              className="input"
              autoComplete="name"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              placeholder="voce@igreja.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="callout callout-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-accent btn-block" disabled={submitting}>
            {submitting ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 20, fontSize: "0.9rem", textAlign: "center" }}>
          Já tem conta? <Link href="/login" style={{ color: "var(--accent-strong)", fontWeight: 600 }}>Entrar</Link>
        </p>
      </div>
    </main>
  );
}
