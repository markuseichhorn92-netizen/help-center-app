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
  open: { label: "Offen", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-950/40" },
  in_progress: { label: "In Bearbeitung", color: "text-yellow-700 dark:text-yellow-300", bg: "bg-yellow-100 dark:bg-yellow-950/40" },
  resolved: { label: "Gelöst", color: "text-green-700 dark:text-green-300", bg: "bg-green-100 dark:bg-green-950/40" },
  closed: { label: "Geschlossen", color: "text-gray-600 dark:text-apple-gray-300", bg: "bg-gray-100 dark:bg-[#38383A]" },
};

// Format message content based on channel and content type
function formatMessageContent(content: string, channel?: string): string {
  // WhatsApp messages are ALWAYS plain text - strip any HTML tags
  if (channel === 'whatsapp') {
    // Remove all HTML tags (they shouldn't be there for WhatsApp)
    const plainText = content.replace(/<[^>]*>/g, '');
    // Escape any remaining special characters and convert newlines
    return plainText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br />');
  }

  // For email/web: If content has HTML tags, render as HTML
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);
  if (hasHtmlTags) {
    return content;
  }

  // Plain text - escape HTML and convert newlines
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br />');
}

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    // Poll for new messages (paused while the tab is hidden)
    const pollInterval = isAdminOnline ? 3000 : 15000; // 3s when admin online, 15s otherwise
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchMessages();
    }, pollInterval);

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
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      checkAdminPresence();
    }, 30000); // Check every 30s, paused while tab hidden

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

    // Send immediately and then every 10 seconds (paused while tab hidden -
    // a hidden tab correctly counts the customer as away)
    sendHeartbeat();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      sendHeartbeat();
    }, 10000);

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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadError(null);

    // Validate files
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
        setUploadError(`${file.name} ist zu groß (max. 5 MB)`);
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        setUploadError(`${file.name}: Dateityp nicht erlaubt`);
        continue;
      }
      validFiles.push(file);
    }

    // Limit to 3 files total
    const newFiles = [...pendingFiles, ...validFiles].slice(0, 3);
    setPendingFiles(newFiles);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove pending file
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadError(null);
  };

  // Upload files and return URLs
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

  // Handle sending message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!newMessage.trim() && pendingFiles.length === 0) || isSending) return;

    setIsSending(true);
    setUploadError(null);

    try {
      // Upload files first if any
      let attachments: Array<{ filename: string; url: string }> = [];
      if (pendingFiles.length > 0) {
        setIsUploading(true);
        try {
          attachments = await uploadFiles();
        } catch (uploadErr: unknown) {
          setUploadError(uploadErr instanceof Error ? uploadErr.message : "Upload fehlgeschlagen");
          setIsUploading(false);
          setIsSending(false);
          return;
        }
        setIsUploading(false);
      }

      const response = await fetch(`/api/portal/tickets/${resolvedParams.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage.trim() || (attachments.length > 0 ? "Anhänge gesendet" : ""),
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
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
      setPendingFiles([]); // Clear pending files after successful send
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
      <div className="min-h-screen bg-apple-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8 text-brand dark:text-brand-light" fill="none" viewBox="0 0 24 24">
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
          <p className="text-apple-gray-400 dark:text-apple-gray-300">Ticket wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-apple-gray-50 dark:bg-dark-bg flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-surface rounded-apple-xl shadow-card p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-red-500 dark:text-red-400"
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
          <h2 className="text-xl font-bold text-apple-gray-600 dark:text-dark-text mb-3">
            {error || "Ticket nicht gefunden"}
          </h2>
          <p className="text-apple-gray-400 dark:text-apple-gray-300 mb-6">
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
    <div className="h-[100dvh] bg-apple-gray-50 dark:bg-dark-bg flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-dark-surface border-b border-apple-gray-200 dark:border-dark-border flex-shrink-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Back */}
            <div className="flex items-center gap-3">
              <Link
                href="/portal/tickets"
                className="p-2 -ml-2 hover:bg-apple-gray-50 dark:hover:bg-[#2C2C2E] rounded-apple transition-colors"
                title="Alle Tickets"
              >
                <svg className="w-5 h-5 text-apple-gray-400 dark:text-apple-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <Image
                src="https://cdn.sanity.io/images/6qiktmvm/production/e33b949b11d3aa8b60befb3f5f537803a8c48700-2917x486.png"
                alt="FIT INN Logo"
                width={120}
                height={20}
                className="h-5 w-auto hidden sm:block"
              />
            </div>

            {/* Ticket Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="font-mono text-sm font-semibold text-brand dark:text-brand-light">
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
                  isAdminOnline ? "bg-green-500 animate-pulse" : "bg-gray-300 dark:bg-[#48484A]"
                }`}
              />
              <span className="text-xs text-apple-gray-400 dark:text-apple-gray-300 hidden sm:inline">
                {isAdminOnline ? "Support online" : "Support offline"}
              </span>
            </div>
          </div>

          {/* Subject */}
          <h1 className="text-lg font-semibold text-apple-gray-600 dark:text-dark-text mt-2 truncate">
            {ticket.subject}
          </h1>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4 w-full">
          {/* Welcome Message */}
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-brand/10 dark:bg-brand-light/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand dark:text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-apple-gray-400 dark:text-apple-gray-300">Noch keine Nachrichten vorhanden.</p>
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
                    <span className="bg-apple-gray-100 dark:bg-[#38383A] text-apple-gray-400 dark:text-apple-gray-300 text-xs px-3 py-1 rounded-full">
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
                        : "bg-white dark:bg-dark-surface-elevated border border-apple-gray-200 dark:border-dark-border text-apple-gray-600 dark:text-dark-text rounded-bl-md"
                    }`}
                    style={{ wordBreak: "break-word" }}
                  >
                    {/* Sender Name (for admin messages) */}
                    {!isCustomer && (
                      <p className="text-xs font-medium text-brand dark:text-brand-light mb-1">
                        {message.senderName}
                      </p>
                    )}

                    {/* Message Content */}
                    <div
                      className={`text-sm break-words overflow-hidden ${
                        isCustomer ? "text-white" : "text-apple-gray-600 dark:text-dark-text"
                      }`}
                      style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                      dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content, ticket?.channel) }}
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
                                : "text-brand dark:text-brand-light hover:text-brand-dark"
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
                        isCustomer ? "text-white/70" : "text-apple-gray-300 dark:text-apple-gray-300"
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
        <div className="bg-white dark:bg-dark-surface border-t border-apple-gray-200 dark:border-dark-border flex-shrink-0">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto px-4 py-4">
            {/* Admin Online Indicator */}
            {isAdminOnline && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Support ist online - Antworten in Echtzeit</span>
              </div>
            )}

            {/* Upload Error */}
            {uploadError && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-300 mb-2 bg-red-50 dark:bg-red-950/40 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{uploadError}</span>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="ml-auto text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Pending Files Preview */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {pendingFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-apple-gray-100 dark:bg-[#38383A] px-3 py-2 rounded-lg text-sm"
                  >
                    {file.type.startsWith("image/") ? (
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    <span className="text-apple-gray-600 dark:text-dark-text truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(index)}
                      className="text-apple-gray-400 dark:text-apple-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt"
              className="hidden"
            />

            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0 relative">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ihre Nachricht..."
                  rows={1}
                  className="w-full px-4 py-3 border border-apple-gray-200 dark:border-dark-border rounded-apple-lg focus:ring-2 focus:ring-brand/20 dark:focus:ring-brand/40 focus:border-brand transition-all outline-none resize-none text-apple-gray-600 dark:bg-[#2C2C2E] dark:text-dark-text pr-12"
                  style={{ maxHeight: "150px" }}
                />
                <span className="absolute right-3 bottom-3 text-xs text-apple-gray-300 dark:text-apple-gray-300">
                  ↵
                </span>
              </div>

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pendingFiles.length >= 3 || isSending}
                className="p-3 text-apple-gray-400 dark:text-apple-gray-300 hover:text-brand dark:hover:text-brand-light hover:bg-apple-gray-50 dark:hover:bg-[#2C2C2E] rounded-apple-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                title={pendingFiles.length >= 3 ? "Max. 3 Dateien" : "Datei anhängen"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!newMessage.trim() && pendingFiles.length === 0) || isSending}
                className="bg-brand text-white p-3 rounded-apple-lg hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                title={isUploading ? "Dateien werden hochgeladen..." : "Senden"}
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
            <p className="text-xs text-apple-gray-300 dark:text-apple-gray-300 mt-2">
              Enter zum Senden, Shift+Enter für neue Zeile. Max. 3 Dateien (je 5 MB).
            </p>
          </form>
        </div>
      ) : (
        <div className="bg-apple-gray-50 dark:bg-dark-bg border-t border-apple-gray-200 dark:border-dark-border flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 py-4 text-center">
            <p className="text-apple-gray-400 dark:text-apple-gray-300 text-sm">
              Dieses Ticket wurde geschlossen.{" "}
              <Link href="/portal" className="text-brand dark:text-brand-light hover:text-brand-dark">
                Neues Ticket erstellen
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
