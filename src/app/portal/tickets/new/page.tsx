"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTicketPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setError(null);

    const validFiles: File[] = [];
    const maxSize = 5 * 1024 * 1024; // 5 MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    for (const file of files) {
      if (file.size > maxSize) {
        setError(`${file.name} ist zu groß (max. 5 MB)`);
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(`${file.name}: Dateityp nicht erlaubt`);
        continue;
      }
      validFiles.push(file);
    }

    const newFiles = [...pendingFiles, ...validFiles].slice(0, 3);
    setPendingFiles(newFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove pending file
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  // Upload files
  const uploadFiles = async (): Promise<Array<{ filename: string; url: string }>> => {
    const uploadedFiles: Array<{ filename: string; url: string }> = [];

    for (const file of pendingFiles) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/portal/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload fehlgeschlagen");
      }

      const data = await response.json();
      uploadedFiles.push({
        filename: data.filename,
        url: data.url,
      });
    }

    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      setError("Bitte fülle alle Pflichtfelder aus.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload files first if any
      let attachments: Array<{ filename: string; url: string }> = [];
      if (pendingFiles.length > 0) {
        setIsUploading(true);
        try {
          attachments = await uploadFiles();
        } catch (uploadErr: unknown) {
          setError(uploadErr instanceof Error ? uploadErr.message : "Upload fehlgeschlagen");
          setIsUploading(false);
          setIsSubmitting(false);
          return;
        }
        setIsUploading(false);
      }

      const res = await fetch("/api/portal/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          name: name.trim() || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Erstellen des Tickets");
      }

      // Redirect to the new ticket
      router.push(`/portal/ticket/${data.ticketId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-apple-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-apple-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/portal/tickets"
              className="p-2 -ml-2 hover:bg-apple-gray-50 rounded-apple transition-colors"
            >
              <svg className="w-5 h-5 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold text-apple-gray-600">Neues Ticket erstellen</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-apple-lg text-sm">
              {error}
            </div>
          )}

          {/* Name (optional) */}
          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-2">
              Dein Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-apple-gray-600"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-2">
              Betreff *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Worum geht es?"
              className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-apple-gray-600"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-2">
              Deine Nachricht *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Beschreibe dein Anliegen so detailliert wie möglich..."
              rows={6}
              className="w-full px-4 py-3 rounded-apple-lg border border-apple-gray-200 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 text-apple-gray-600 resize-none"
              required
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-2">
              Anhänge (optional)
            </label>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt"
              className="hidden"
            />

            {/* Pending Files */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {pendingFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-apple-gray-100 px-3 py-2 rounded-lg text-sm"
                  >
                    {file.type.startsWith("image/") ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    <span className="text-apple-gray-600 truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="text-apple-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pendingFiles.length >= 3}
              className="flex items-center gap-2 px-4 py-2 border border-apple-gray-200 rounded-apple-lg text-sm text-apple-gray-500 hover:bg-apple-gray-50 hover:border-apple-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              {pendingFiles.length >= 3 ? "Max. 3 Dateien" : "Datei anhängen"}
            </button>
            <p className="text-xs text-apple-gray-400 mt-2">
              Max. 3 Dateien, je 5 MB. Erlaubt: Bilder, PDF, Word, Text.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !subject.trim() || !message.trim()}
              className="flex-1 px-6 py-3 bg-brand text-white font-medium rounded-apple-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isUploading ? "Dateien hochladen..." : "Wird gesendet..."}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Ticket erstellen
                </>
              )}
            </button>
            <Link
              href="/portal/tickets"
              className="px-6 py-3 border border-apple-gray-200 text-apple-gray-600 font-medium rounded-apple-lg hover:bg-apple-gray-50 transition-colors text-center"
            >
              Abbrechen
            </Link>
          </div>

          <p className="text-sm text-apple-gray-400 text-center">
            * Pflichtfelder
          </p>
        </form>
      </div>
    </div>
  );
}
