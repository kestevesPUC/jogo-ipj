"use client";

import { useState } from "react";
import { IconUpload, IconLink } from "@/components/icons";

export interface QuestionFormValue {
  prompt: string;
  answer: string;
  mediaType: "none" | "image" | "gif" | "video";
  mediaSource: "upload" | "url" | null;
  mediaValue: string | null;
}

export function QuestionForm({
  onSubmit,
  onCancel,
  submitLabel,
  initialValue,
}: {
  onSubmit: (value: QuestionFormValue) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
  initialValue?: QuestionFormValue;
}) {
  const [prompt, setPrompt] = useState(initialValue?.prompt ?? "");
  const [answer, setAnswer] = useState(initialValue?.answer ?? "");
  const [mediaType, setMediaType] = useState<QuestionFormValue["mediaType"]>(initialValue?.mediaType ?? "none");
  const [mediaMode, setMediaMode] = useState<"upload" | "url">(initialValue?.mediaSource ?? "url");
  const [mediaUrl, setMediaUrl] = useState(
    initialValue?.mediaSource === "url" ? initialValue.mediaValue ?? "" : ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    let mediaValue: string | null = null;
    let mediaSource: QuestionFormValue["mediaSource"] = null;

    if (mediaType !== "none") {
      mediaSource = mediaMode;
      if (mediaMode === "url") {
        mediaValue = mediaUrl || null;
      } else if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        const data = await res.json();
        mediaValue = data.url;
      }
    }

    await onSubmit({ prompt, answer, mediaType, mediaSource, mediaValue });

    setPrompt("");
    setAnswer("");
    setMediaType("none");
    setMediaUrl("");
    setFile(null);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="field">
        <label className="field-label" htmlFor="prompt">
          Pergunta
        </label>
        <textarea
          id="prompt"
          className="input"
          placeholder="Ex: Quem construiu a arca?"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="answer">
          Resposta
        </label>
        <input
          id="answer"
          className="input"
          placeholder="Ex: Noé"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="mediaType">
          Mídia (opcional)
        </label>
        <select
          id="mediaType"
          className="input"
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value as QuestionFormValue["mediaType"])}
        >
          <option value="none">Nenhuma</option>
          <option value="image">Imagem</option>
          <option value="gif">Gif</option>
          <option value="video">Vídeo</option>
        </select>
      </div>

      {mediaType !== "none" && (
        <div className="field">
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="mediaMode"
                checked={mediaMode === "url"}
                onChange={() => setMediaMode("url")}
              />
              <IconLink size={14} />
              Link (URL)
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="mediaMode"
                checked={mediaMode === "upload"}
                onChange={() => setMediaMode("upload")}
              />
              <IconUpload size={14} />
              Upload
            </label>
          </div>
          {mediaMode === "url" ? (
            <input
              className="input"
              placeholder="https://..."
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          ) : (
            <input
              className="input"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          )}
        </div>
      )}

      <div className="row">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Salvando..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
