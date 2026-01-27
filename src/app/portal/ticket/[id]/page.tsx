"use client";

import { useState, useEffect, useRef, use, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  content: string;
  sender: "customer" | "admin";
  senderName: string;
  createdAt: string;
  attachments?: Array<{
    filename: string;
    url: string;
  }>;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  channel: string;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Offen", color: "text-blue-700", bg: "bg-blue-100" },
  in_progress: { label: "In Bearbeitung", color: "text-yellow-700", bg: "bg-yellow-100" },
  resolved: { label: "Gelöst", color: "text-green-700", bg: "bg-green-100" },
  closed: { label: "Geschlossen", color: "text-gray-600", bg: "bg-gray-100" },
};

export default function PortalTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [hasSentMessage, setHasSentMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const exitHandlerCalled = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Exit handler function - sends session summary email
  const handleExit = useCallback(async () => {
    if (exitHandlerCalled.current || !hasSentMessage) return;
    exitHandlerCalled.current = true;

    // Use sendBeacon for reliable delivery on page exit
    const payload = JSON.stringify({ ticketId: resolvedParams.id });
    navigator.sendBeacon("/api/portal/session/exit", payload);
  }, [hasSentMessage, resolvedParams.id]);

  // Set up exit handlers
  useEffect(() => {
    // Reset exit handler flag when component mounts
    exitHandlerCalled.current = false;

    const handleBeforeUnload = () => {
      handleExit();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleExit();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      // Call exit handler on unmount (navigation away)
      handleExit();
    };
  }, [handleExit]);

  // Fetch ticket data
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await fetch(`/api/portal/tickets/${resolvedParams.id}`);

        if (response.status === 401) {
          router.push("/portal");
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Fehler beim Laden des Tickets");
          return;
        }

        const data = await response.json();
        setTicket(data.ticket);
      } catch {
        setError("Verbindungsfehler");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicket();
  }, [resolvedParams.id, router]);

  // Fetch messages with polling
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/portal/tickets/${resolvedParams.id}/messages`);

        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages);
        }
      } catch {
        // Silently fail on polling errors
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll for new messages
    const pollInterval = isAdminOnline ? 3000 : 15000; // 3s when admin online, 15s otherwise
    const interval = setInterval(fetchMessages, pollInterval);

    return () => clearInterval(interval);
  }, [resolvedParams.id, isAdminOnline]);

  // Check admin online status
  useEffect(() => {
    const checkAdminPresence = async () => {
      try {
        const response = await fetch("/api/portal/presence");
        if (response.ok) {
          const data = await response.json();
          setIsAdminOnline(data.online);
        }
      } catch {
        // Silently fail
      }
    };

    checkAdminPresence();
    const interval = setInterval(checkAdminPresence, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  // Send customer presence heartbeat
  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/portal/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: resolvedParams.id }),
        });
      } catch {
        // Silently fail
      }
    };

    // Send immediately and then every 10 seconds
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 10000);

    return () => clearInterval(interval);
  }, [resolvedParams.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Use block: "end" and inline: "nearest" to prevent horizontal scroll
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
      inline: "nearest",
    });
  }, [messages]);

  // Handle sending message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isSending) return;

    setIsSending(true);

    try {
      const response = await fetch(`/api/portal/tickets/${resolvedParams.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (response.status === 401) {
        router.push("/portal");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Nachricht konnte nicht gesendet werden");
        return;
      }

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
      setNewMessage("");
      setHasSentMessage(true); // Track that message was sent for exit handler
      inputRef.current?.focus();

      // If ticket was resolved, update local state
      if (ticket?.status === "resolved") {
        setTicket((prev) => (prev ? { ...prev, status: "open" } : null));
      }
    } catch {
      setError("Verbindungsfehler beim Senden");
    } finally {
      setIsSending(false);
    }
  };

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    try {
      await fetch("/api/portal/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: resolvedParams.id, isTyping }),
      });
    } catch {
      // Silently fail
    }
  }, [resolvedParams.id]);

  // Handle textarea auto-resize
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";

    // Send typing indicator (debounced)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (e.target.value.trim()) {
      sendTypingIndicator(true);
      // Clear typing indicator after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    } else {
      sendTypingIndicator(false);
    }
  };

  // Handle Enter key (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Gerade eben";
    if (diffMins < 60) return `Vor ${diffMins} Min.`;
    if (diffHours < 24) return `Vor ${diffHours} Std.`;
    if (diffDays < 7) return `Vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;

    return date.toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-apple-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8 text-brand" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-apple-gray-400">Ticket wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-apple-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-apple-xl shadow-card p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-apple-gray-600 mb-3">
            {error || "Ticket nicht gefunden"}
          </h2>
          <p className="text-apple-gray-400 mb-6">
            Das Ticket konnte nicht geladen werden. Möglicherweise ist die Sitzung abgelaufen.
          </p>
          <Link
            href="/portal"
            className="inline-block bg-brand text-white px-6 py-3 rounded-apple-lg font-medium hover:bg-brand-dark transition-colors"
          >
            Zurück zum Portal
          </Link>
        </div>
      </div>
    );
  }

  const status = statusLabels[ticket.status] || statusLabels.open;

  return (
    <div className="min-h-screen bg-apple-gray-50 flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b border-apple-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Back */}
            <div className="flex items-center gap-3">
              <Link
                href="/portal/tickets"
                className="p-2 -ml-2 hover:bg-apple-gray-50 rounded-apple transition-colors"
                title="Alle Tickets"
              >
                <svg className="w-5 h-5 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <Image
                src="/logo.png"
                alt="FIT INN"
                width={100}
                height={25}
                className="h-6 w-auto hidden sm:block"
              />
            </div>

            {/* Ticket Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="font-mono text-sm font-semibold text-brand">
                  {ticket.ticketNumber}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                  {status.label}
                </span>
              </div>
            </div>

            {/* Support Status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isAdminOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"
                }`}
              />
              <span className="text-xs text-apple-gray-400 hidden sm:inline">
                {isAdminOnline ? "Support online" : "Support offline"}
              </span>
            </div>
          </div>

          {/* Subject */}
          <h1 className="text-lg font-semibold text-apple-gray-600 mt-2 truncate">
            {ticket.subject}
          </h1>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 w-full">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-apple-gray-400">Noch keine Nachrichten vorhanden.</p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => {
            const isCustomer = message.sender === "customer";
            const showDateHeader =
              index === 0 ||
              new Date(message.createdAt).toDateString() !==
                new Date(messages[index - 1].createdAt).toDateString();

            return (
              <div key={message.id}>
                {/* Date Header */}
                {showDateHeader && (
                  <div className="text-center my-6">
                    <span className="bg-apple-gray-100 text-apple-gray-400 text-xs px-3 py-1 rounded-full">
                      {new Date(message.createdAt).toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`flex ${isCustomer ? "justify-end" : "justify-start"} max-w-full`}>
                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-apple-lg px-4 py-3 overflow-hidden break-words ${
                      isCustomer
                        ? "bg-gradient-to-br from-brand to-brand-dark text-white rounded-br-md"
                        : "bg-white border border-apple-gray-200 text-apple-gray-600 rounded-bl-md"
                    }`}
                    style={{ wordBreak: "break-word" }}
                  >
                    {/* Sender Name (for admin messages) */}
                    {!isCustomer && (
                      <p className="text-xs font-medium text-brand mb-1">
                        {message.senderName}
                      </p>
                    )}

                    {/* Message Content */}
                    <div
                      className={`text-sm whitespace-pre-wrap break-words overflow-hidden ${
                        isCustomer ? "text-white" : "text-apple-gray-600"
                      }`}
                      style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
                        {message.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-xs ${
                              isCustomer
                                ? "text-white/80 hover:text-white"
                                : "text-brand hover:text-brand-dark"
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                              />
                            </svg>
                            <span className="truncate">{att.filename}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Time */}
                    <p
                      className={`text-xs mt-1 ${
                        isCustomer ? "text-white/70" : "text-apple-gray-300"
                      }`}
                    >
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      {ticket.status !== "closed" ? (
        <div className="bg-white border-t border-apple-gray-200 sticky bottom-0">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto px-4 py-4">
            {/* Admin Online Indicator */}
            {isAdminOnline && (
              <div className="flex items-center gap-2 text-xs text-green-600 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Support ist online - Antworten in Echtzeit</span>
              </div>
            )}

            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0 relative">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ihre Nachricht..."
                  rows={1}
                  className="w-full px-4 py-3 border border-apple-gray-200 rounded-apple-lg focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none resize-none text-apple-gray-600 pr-12"
                  style={{ maxHeight: "150px" }}
                />
                <span className="absolute right-3 bottom-3 text-xs text-apple-gray-300">
                  ↵
                </span>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="bg-brand text-white p-3 rounded-apple-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {isSending ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-apple-gray-300 mt-2">
              Drücken Sie Enter zum Senden, Shift+Enter für eine neue Zeile
            </p>
          </form>
        </div>
      ) : (
        <div className="bg-apple-gray-50 border-t border-apple-gray-200 sticky bottom-0">
          <div className="max-w-4xl mx-auto px-4 py-4 text-center">
            <p className="text-apple-gray-400 text-sm">
              Dieses Ticket wurde geschlossen.{" "}
              <Link href="/portal" className="text-brand hover:text-brand-dark">
                Neues Ticket erstellen
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
