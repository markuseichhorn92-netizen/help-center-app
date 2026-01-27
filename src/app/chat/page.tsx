"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(true);

  // Escalation state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isEscalating, setIsEscalating] = useState(false);
  const [isEscalated, setIsEscalated] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Start chat session on mount
  useEffect(() => {
    startSession();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startSession = async () => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      const data = await res.json();
      if (data.sessionId) {
        setSessionId(data.sessionId);
        setMessages([
          {
            role: "assistant",
            content: data.message,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to start session:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !sessionId || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");

    // Add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
    ]);

    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: userMessage,
        }),
      });

      const data = await res.json();

      if (data.wantsHuman) {
        // Show email modal for escalation
        setShowEmailModal(true);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else if (data.message) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!email.trim() || !sessionId) return;

    setIsEscalating(true);

    try {
      const res = await fetch("/api/chat/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsEscalated(true);
        setTicketNumber(data.ticketNumber);
        setShowEmailModal(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Ticket ${data.ticketNumber} wurde erstellt!\n\nEin Mitarbeiter wird sich in Kürze bei dir unter ${email} melden.\n\nVielen Dank für deine Geduld!`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        alert("Fehler beim Erstellen des Tickets. Bitte versuche es erneut.");
      }
    } catch (error) {
      console.error("Escalation error:", error);
      alert("Fehler beim Erstellen des Tickets.");
    } finally {
      setIsEscalating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isStarting) {
    return (
      <div className="min-h-screen bg-apple-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-apple-gray-500">Chat wird gestartet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-apple-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-apple-gray-200 flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand to-brand-dark rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-apple-gray-600">FIT INN Support</h1>
              <p className="text-xs text-apple-gray-400">KI-Assistent</p>
            </div>
          </div>
          <Link
            href="/"
            className="p-2 text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg transition-colors"
            title="Zum Hilfe-Center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-brand to-brand-dark text-white rounded-br-md"
                    : "bg-white border border-apple-gray-200 text-apple-gray-600 rounded-bl-md shadow-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === "user" ? "text-white/60" : "text-apple-gray-400"
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString("de-DE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-apple-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-apple-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-apple-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-apple-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {!isEscalated ? (
        <div className="bg-white border-t border-apple-gray-200 flex-shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Schreibe eine Nachricht..."
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-apple-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                style={{ maxHeight: "120px" }}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="w-12 h-12 bg-brand text-white rounded-full flex items-center justify-center hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-apple-gray-400 mt-2 text-center">
              Schreibe &apos;Mitarbeiter&apos; für persönliche Hilfe
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border-t border-green-200 flex-shrink-0">
          <div className="max-w-2xl mx-auto px-4 py-4 text-center">
            <p className="text-green-700 font-medium">
              Ticket {ticketNumber} erstellt
            </p>
            <p className="text-sm text-green-600 mt-1">
              Du wirst per E-Mail benachrichtigt, sobald ein Mitarbeiter antwortet.
            </p>
            <Link
              href="/portal"
              className="inline-block mt-3 px-4 py-2 bg-brand text-white text-sm font-medium rounded-full hover:bg-brand-dark transition-colors"
            >
              Zum Kundenportal
            </Link>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-apple-gray-600 mb-2">
              Mitarbeiter kontaktieren
            </h2>
            <p className="text-sm text-apple-gray-500 mb-4">
              Gib deine E-Mail-Adresse an, damit wir uns bei dir melden können.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-apple-gray-600 mb-1">
                  E-Mail *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="w-full px-4 py-3 rounded-xl border border-apple-gray-200 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-apple-gray-600 mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dein Name"
                  className="w-full px-4 py-3 rounded-xl border border-apple-gray-200 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-3 text-apple-gray-600 font-medium rounded-xl border border-apple-gray-200 hover:bg-apple-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEscalate}
                disabled={!email.trim() || isEscalating}
                className="flex-1 px-4 py-3 bg-brand text-white font-medium rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                {isEscalating ? "Wird erstellt..." : "Ticket erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
