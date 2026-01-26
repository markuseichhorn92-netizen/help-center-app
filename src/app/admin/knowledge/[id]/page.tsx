"use client";

import Link from "next/link";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface KnowledgeEntry {
  id: string;
  url: string;
  title: string;
  content: string;
  description?: string;
  keywords?: string[];
  lastCrawled: string;
  createdAt: string;
}

export default function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [entry, setEntry] = useState<KnowledgeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");

  useEffect(() => {
    loadEntry();
  }, [id]);

  const loadEntry = async () => {
    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, {
        headers: {
          Authorization: `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`,
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Eintrag nicht gefunden");
        }
        throw new Error("Fehler beim Laden");
      }

      const data = await res.json();
      setEntry(data.entry);
      setTitle(data.entry.title || "");
      setContent(data.entry.content || "");
      setDescription(data.entry.description || "");
      setKeywords(data.entry.keywords?.join(", ") || "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`,
        },
        body: JSON.stringify({
          title,
          content,
          description,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter((k) => k),
        }),
      });

      if (!res.ok) {
        throw new Error("Fehler beim Speichern");
      }

      const data = await res.json();
      setEntry(data.entry);
      setSuccess("Erfolgreich gespeichert!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-lg">Wird geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !entry) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/admin/knowledge"
            className="text-apple-gray-400 hover:text-brand transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-apple-gray-600">Fehler</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-apple-lg p-6">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/knowledge"
            className="text-apple-gray-400 hover:text-brand transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">
              Knowledge Base Eintrag
            </h1>
            <a
              href={entry?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand hover:underline"
            >
              {entry?.url}
            </a>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-brand text-white font-medium rounded-full hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg
                className="w-4 h-4 animate-spin inline-block mr-2"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Speichern...
            </>
          ) : (
            "Speichern"
          )}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-apple-lg">
          <p className="text-sm font-medium text-green-700">{success}</p>
        </div>
      )}

      {error && entry && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-apple-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-apple-gray-400">Erstellt:</span>{" "}
            <span className="text-apple-gray-600">
              {entry?.createdAt
                ? new Date(entry.createdAt).toLocaleString("de-DE")
                : "-"}
            </span>
          </div>
          <div>
            <span className="text-apple-gray-400">Letztes Crawling:</span>{" "}
            <span className="text-apple-gray-600">
              {entry?.lastCrawled
                ? new Date(entry.lastCrawled).toLocaleString("de-DE")
                : "-"}
            </span>
          </div>
          <div>
            <span className="text-apple-gray-400">Content-Länge:</span>{" "}
            <span className="text-apple-gray-600">
              {content.length.toLocaleString()} Zeichen
            </span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-apple-gray-600 mb-2">
            Titel
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-apple-gray-600 mb-2">
            Beschreibung (Meta)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-apple-gray-600 mb-2">
            Keywords (kommagetrennt)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="fitness, studio, trier, ..."
            className="w-full px-4 py-2 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-apple-gray-600 mb-2">
            Extrahierter Inhalt
            <span className="text-apple-gray-400 font-normal ml-2">
              (Dieser Text wird der KI als Wissensquelle bereitgestellt)
            </span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full px-4 py-3 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono text-sm leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
