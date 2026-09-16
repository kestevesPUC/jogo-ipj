"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="centered-shell">
      <div className="auth-card">
        <div className="brand" style={{ marginBottom: 24 }}>
          <span className="brand-mark">QB</span>
          Quiz Bíblico
        </div>
        <p className="eyebrow" style={{ marginBottom: 6 }}>
          Bem-vindo de volta
        </p>
        <h1 className="hero-title" style={{ marginBottom: 24 }}>
          Entrar na sua conta
        </h1>

        <form onSubmit={handleSubmit} className="form-grid">
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
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="callout callout-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 20, fontSize: "0.9rem", textAlign: "center" }}>
          Não tem conta? <Link href="/register" style={{ color: "var(--accent-strong)", fontWeight: 600 }}>Cadastre-se</Link>
        </p>
      </div>
    </main>
  );
}
