"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
}

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Assistant States
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantAction, setAssistantAction] = useState<"improve" | "expand" | "custom">("improve");
  const [customInstruction, setCustomInstruction] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/admin/articles/${id}`, {
          headers: {
            Authorization: `Basic ${btoa(
              `${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`
            )}`,
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to fetch article");
        }

        const data: Article = await res.json();
        setTitle(data.title);
        setContent(data.content);
        setPublished(data.published);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(
            `${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`
          )}`,
        },
        body: JSON.stringify({ title, content, published }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update article");
      }

      router.push("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // AI Assistant actions
  const handleAssistantAction = async () => {
    if (!content.trim()) {
      setAiError("Bitte schreiben Sie zuerst etwas Inhalt.");
      return;
    }

    setAssistantLoading(true);
    setAiError(null);

    try {
      const body: any = { action: assistantAction, content };
      if (assistantAction === "custom") {
        if (!customInstruction.trim()) {
          throw new Error("Bitte geben Sie eine Anweisung ein.");
        }
        body.instruction = customInstruction;
      }

      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(
            `${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`
          )}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Fehler bei der Bearbeitung");
      }

      if (data.content) setContent(data.content);
      setShowAssistant(false);
      setCustomInstruction("");
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAssistantLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Artikel wird geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !title) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-apple-lg" role="alert">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Fehler: {error}</span>
          </div>
        </div>
        <div className="mt-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-brand font-medium hover:gap-3 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Back Link */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-apple-gray-400 hover:text-brand transition-colors duration-200 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zum Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-apple-gray-600 tracking-tight">Artikel bearbeiten</h1>
        <p className="text-apple-gray-400 mt-1">Bearbeite deinen Hilfe-Artikel.</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-4 rounded-apple-lg mb-6 flex items-center gap-3" role="alert">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Card */}
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
          <label htmlFor="title" className="block text-sm font-semibold text-apple-gray-600 mb-2">
            Artikeltitel
          </label>
          <input
            type="text"
            id="title"
            className="w-full px-4 py-3 bg-apple-gray-50 border border-apple-gray-200 rounded-apple-lg text-apple-gray-600 placeholder:text-apple-gray-400 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all duration-200"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <label htmlFor="content" className="block text-sm font-semibold text-apple-gray-600">
              Inhalt
            </label>
            {/* AI Assistant Button */}
            <button
              type="button"
              onClick={() => setShowAssistant(!showAssistant)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
                showAssistant
                  ? "bg-purple-100 text-purple-700"
                  : "bg-apple-gray-100 text-apple-gray-500 hover:bg-purple-50 hover:text-purple-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              KI-Assistent
            </button>
          </div>

          {/* AI Assistant Panel */}
          {showAssistant && (
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-apple-lg border border-purple-100">
              <p className="text-sm text-purple-700 mb-3 font-medium">Was soll die KI mit dem Inhalt machen?</p>

              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setAssistantAction("improve")}
                  className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                    assistantAction === "improve"
                      ? "bg-purple-600 text-white"
                      : "bg-white text-purple-600 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  Verbessern
                </button>
                <button
                  type="button"
                  onClick={() => setAssistantAction("expand")}
                  className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                    assistantAction === "expand"
                      ? "bg-purple-600 text-white"
                      : "bg-white text-purple-600 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  Erweitern
                </button>
                <button
                  type="button"
                  onClick={() => setAssistantAction("custom")}
                  className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                    assistantAction === "custom"
                      ? "bg-purple-600 text-white"
                      : "bg-white text-purple-600 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  Eigene Anweisung
                </button>
              </div>

              {assistantAction === "custom" && (
                <input
                  type="text"
                  placeholder="z.B. 'Füge mehr Beispiele hinzu' oder 'Mache es kürzer'"
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              )}

              {aiError && (
                <p className="text-sm text-red-600 mb-3">{aiError}</p>
              )}

              <button
                type="button"
                onClick={handleAssistantAction}
                disabled={assistantLoading || !content.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {assistantLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    KI arbeitet...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {assistantAction === "improve" && "Text verbessern"}
                    {assistantAction === "expand" && "Text erweitern"}
                    {assistantAction === "custom" && "Anweisung ausführen"}
                  </>
                )}
              </button>
            </div>
          )}

          <div className="quill-editor-container">
            <ReactQuill theme="snow" value={content} onChange={setContent} />
          </div>
        </div>

        {/* Publish Card */}
        <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6">
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              <div className="w-6 h-6 bg-apple-gray-100 rounded-lg border border-apple-gray-200 peer-checked:bg-brand peer-checked:border-brand transition-all duration-200 group-hover:border-apple-gray-300 peer-checked:group-hover:border-brand-dark">
                <svg className="w-6 h-6 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <svg className={`absolute w-4 h-4 text-white transition-opacity duration-200 ${published ? 'opacity-100' : 'opacity-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <span className="text-base font-medium text-apple-gray-600 block">Artikel veröffentlichen</span>
              <span className="text-sm text-apple-gray-400 mt-0.5 block">Wenn aktiviert, ist der Artikel sofort für alle Besucher sichtbar.</span>
            </div>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            className="px-5 py-2.5 bg-apple-gray-100 text-apple-gray-600 font-semibold rounded-full hover:bg-apple-gray-200 transition-all duration-200"
            onClick={() => router.push("/admin")}
            disabled={submitting}
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand text-white font-semibold rounded-full shadow-apple hover:bg-brand-dark hover:shadow-apple-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird gespeichert...
              </>
            ) : (
              'Änderungen speichern'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
