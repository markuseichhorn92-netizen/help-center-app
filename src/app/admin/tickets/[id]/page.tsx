"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, use } from "react";
import RichTextEditor from "@/components/editor/RichTextEditor";

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
}

interface TicketMessage {
  id: string;
  ticketId: string;
  content: string;
  sender: "customer" | "admin";
  senderName: string;
  senderEmail: string;
  createdAt: string;
  attachments?: Attachment[];
  isRead?: boolean;
  channel?: 'email' | 'whatsapp' | 'web';
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
  deliveryChannel?: 'live' | 'email' | 'whatsapp';
}

const statusConfig = {
  open: { label: "Offen", color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  in_progress: { label: "In Bearbeitung", color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  resolved: { label: "Gelöst", color: "bg-green-50 text-green-700 ring-green-600/20" },
  closed: { label: "Geschlossen", color: "bg-gray-50 text-gray-600 ring-gray-500/20" },
};

const priorityConfig = {
  low: { label: "Niedrig", color: "bg-gray-100 text-gray-600" },
  medium: { label: "Normal", color: "bg-blue-100 text-blue-600" },
  high: { label: "Hoch", color: "bg-red-100 text-red-600" },
};

function getAuthHeader() {
  return `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`;
}

// Status icon component for messages
function MessageStatusIcon({ message }: { message: TicketMessage }) {
  if (message.sender === 'customer') return null; // Only show for admin messages
  
  const { status, failureReason } = message;
  
  if (!status || status === 'sent') {
    // Single checkmark - sent
    return (
      <span title="Gesendet">
        <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  
  if (status === 'delivered') {
    // Double checkmark - delivered (wider spacing)
    return (
      <span title="Zugestellt" className="inline-flex">
        <svg className="w-5 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 28 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2 13l4 4L16 7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 13l4 4L24 7" />
        </svg>
      </span>
    );
  }

  if (status === 'read') {
    // Double checkmark blue - read (wider spacing)
    return (
      <span title="Gelesen" className="inline-flex">
        <svg className="w-5 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 28 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2 13l4 4L16 7" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 13l4 4L24 7" />
        </svg>
      </span>
    );
  }
  
  if (status === 'failed') {
    // Red X - failed
    return (
      <span title={`Fehler: ${failureReason || 'Unbekannt'}`}>
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  
  return null;
}

// Sidebar ticket type
interface SidebarTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  customerName: string;
  unreadCount: number;
  updatedAt: string;
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [textareaRows, setTextareaRows] = useState(4);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const prevMessagesCountRef = useRef(0);

  // Sidebar state
  const [sidebarTickets, setSidebarTickets] = useState<SidebarTicket[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarLoading, setSidebarLoading] = useState(true);

  // Customer presence state
  const [customerPresence, setCustomerPresence] = useState<{
    online: boolean;
    lastSeen: string | null;
  }>({ online: false, lastSeen: null });

  // Human requested state (for AI auto-reply)
  const [humanRequested, setHumanRequested] = useState(false);

  // Typing indicator state
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);

  // Quick replies state
  const [quickReplies, setQuickReplies] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  // Notification sound state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageCountRef = useRef(0);

  // Relevant articles state
  const [relevantArticles, setRelevantArticles] = useState<Array<{
    id: string;
    title: string;
    slug: string;
    category?: string;
  }>>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{
    id: string;
    title: string;
    slug: string;
  } | null>(null);
  const [shareChannel, setShareChannel] = useState<'auto' | 'live' | 'email' | 'whatsapp'>('auto');
  const [sharingArticle, setSharingArticle] = useState(false);

  useEffect(() => {
    const updateRows = () => {
      setTextareaRows(window.innerWidth < 640 ? 3 : 4);
    };
    updateRows();
    window.addEventListener('resize', updateRows);
    return () => window.removeEventListener('resize', updateRows);
  }, []);

  const loadData = async () => {
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`/api/admin/tickets/${id}`, {
          headers: { Authorization: getAuthHeader() }
        }),
        fetch(`/api/admin/tickets/${id}/messages`, {
          headers: { Authorization: getAuthHeader() }
        })
      ]);

      if (!ticketRes.ok) {
        throw new Error("Ticket nicht gefunden");
      }

      const ticketData = await ticketRes.json();
      const messagesData = await messagesRes.json();

      setTicket(ticketData);
      
      // Mark all customer messages as read when opening the ticket
      const unreadCustomerMessages = messagesData.filter(
        (msg: TicketMessage) => msg.sender === 'customer' && !msg.isRead
      );
      
      if (unreadCustomerMessages.length > 0) {
        await fetch(`/api/admin/tickets/${id}/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: getAuthHeader()
          },
          body: JSON.stringify({
            messageIds: unreadCustomerMessages.map((m: TicketMessage) => m.id)
          })
        });
        
        // Update messages to mark them as read
        const updatedMessages = messagesData.map((msg: TicketMessage) => ({
          ...msg,
          isRead: msg.sender === 'admin' || unreadCustomerMessages.some((m: TicketMessage) => m.id === msg.id) ? true : msg.isRead
        }));
        setMessages(updatedMessages);
      } else {
        setMessages(messagesData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      // Mark initial load as complete to enable auto-scroll for new messages only
      setInitialLoadDone(true);
    }
  };

  // Load sidebar tickets (active tickets for quick navigation)
  const loadSidebarTickets = async () => {
    try {
      const res = await fetch('/api/admin/tickets', {
        headers: { Authorization: getAuthHeader() }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter to open and in_progress tickets, sort by updatedAt
        const activeTickets = data
          .filter((t: SidebarTicket) => t.status === 'open' || t.status === 'in_progress')
          .sort((a: SidebarTicket, b: SidebarTicket) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, 15); // Limit to 15 tickets
        setSidebarTickets(activeTickets);
      }
    } catch (err) {
      console.error('Failed to load sidebar tickets:', err);
    } finally {
      setSidebarLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadSidebarTickets();

    // Auto-refresh messages every 3 seconds for real-time status updates
    const interval = setInterval(async () => {
      try {
        const messagesRes = await fetch(`/api/admin/tickets/${id}/messages`, {
          headers: { Authorization: getAuthHeader() }
        });

        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();

          // Check for new customer messages to mark as read
          const unreadCustomerMessages = messagesData.filter(
            (msg: TicketMessage) => msg.sender === 'customer' && !msg.isRead
          );

          if (unreadCustomerMessages.length > 0) {
            await fetch(`/api/admin/tickets/${id}/read`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: getAuthHeader()
              },
              body: JSON.stringify({
                messageIds: unreadCustomerMessages.map((m: TicketMessage) => m.id)
              })
            });
          }

          // Always update messages to catch status changes (delivered, read)
          setMessages(messagesData);
        }
      } catch (err) {
        console.error('Auto-refresh messages failed:', err);
      }
    }, 3000); // 3 seconds for faster status updates

    return () => clearInterval(interval);
  }, [id]);

  // Only scroll to bottom when NEW messages are added, not on initial load
  useEffect(() => {
    if (initialLoadDone && messages.length > prevMessagesCountRef.current) {
      // New message was added, scroll to it
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, initialLoadDone]);

  // Poll customer presence
  useEffect(() => {
    const checkCustomerPresence = async () => {
      try {
        const res = await fetch(`/api/admin/tickets/${id}/customer-presence`, {
          headers: { Authorization: getAuthHeader() }
        });
        if (res.ok) {
          const data = await res.json();
          setCustomerPresence({
            online: data.online,
            lastSeen: data.lastSeen,
          });
        }
      } catch {
        // Silently fail
      }
    };

    checkCustomerPresence();
    const interval = setInterval(checkCustomerPresence, 5000); // Check every 5s

    return () => clearInterval(interval);
  }, [id]);

  // Check if human was requested
  useEffect(() => {
    const checkHumanRequested = async () => {
      try {
        const res = await fetch(`/api/admin/tickets/${id}/human-requested`, {
          headers: { Authorization: getAuthHeader() }
        });
        if (res.ok) {
          const data = await res.json();
          setHumanRequested(data.humanRequested);
        }
      } catch {
        // Silently fail
      }
    };

    checkHumanRequested();
    // Also check when messages change (in case customer requested human in chat)
  }, [id, messages]);

  // Poll typing indicator
  useEffect(() => {
    const checkTyping = async () => {
      try {
        const res = await fetch(`/api/admin/tickets/${id}/typing`, {
          headers: { Authorization: getAuthHeader() }
        });
        if (res.ok) {
          const data = await res.json();
          setIsCustomerTyping(data.isTyping);
        }
      } catch {
        // Silently fail
      }
    };

    // Check frequently for typing indicator
    const interval = setInterval(checkTyping, 1000);

    return () => clearInterval(interval);
  }, [id]);

  // Load quick replies
  useEffect(() => {
    const loadQuickReplies = async () => {
      try {
        const res = await fetch('/api/admin/quick-replies', {
          headers: { Authorization: getAuthHeader() }
        });
        if (res.ok) {
          const data = await res.json();
          setQuickReplies(data.replies || []);
        }
      } catch {
        // Silently fail
      }
    };

    loadQuickReplies();
  }, []);

  // Load relevant articles for this ticket
  useEffect(() => {
    const loadRelevantArticles = async () => {
      try {
        const res = await fetch(`/api/admin/tickets/${id}/relevant-articles`, {
          headers: { Authorization: getAuthHeader() }
        });
        if (res.ok) {
          const data = await res.json();
          setRelevantArticles(data.articles || []);
        }
      } catch {
        // Silently fail
      } finally {
        setArticlesLoading(false);
      }
    };

    loadRelevantArticles();
  }, [id]);

  // Load sound preference from localStorage
  useEffect(() => {
    const savedPref = localStorage.getItem('admin:sound-enabled');
    if (savedPref !== null) {
      setSoundEnabled(savedPref === 'true');
    }
  }, []);

  // Play notification sound for new customer messages
  useEffect(() => {
    if (!initialLoadDone) {
      lastMessageCountRef.current = messages.filter(m => m.sender === 'customer').length;
      return;
    }

    const customerMessages = messages.filter(m => m.sender === 'customer');
    const newCount = customerMessages.length;

    if (newCount > lastMessageCountRef.current && soundEnabled && document.hidden) {
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          // Silently fail if audio can't play
        });
      }
    }

    lastMessageCountRef.current = newCount;
  }, [messages, soundEnabled, initialLoadDone]);

  const handleStatusChange = async (newStatus: Ticket["status"]) => {
    if (!ticket) return;

    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Fehler beim Aktualisieren");

      const updatedTicket = await res.json();
      setTicket(updatedTicket);
      
      // Navigate back to ticket list to show updated sorting
      if (newStatus === 'closed' || newStatus === 'resolved') {
        setTimeout(() => {
          window.location.href = '/admin/tickets';
        }, 300);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePriorityChange = async (newPriority: Ticket["priority"]) => {
    if (!ticket) return;

    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!res.ok) throw new Error("Fehler beim Aktualisieren");

      const updatedTicket = await res.json();
      setTicket(updatedTicket);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !ticket) return;

    setSending(true);
    try {
      const endpoint = sendEmail
        ? `/api/admin/tickets/${id}/reply`
        : `/api/admin/tickets/${id}/messages`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          content: replyContent,
          senderName: "Support Team",
          attachments: attachments,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Fehler beim Senden");

      if (data.emailError) {
        alert(`Nachricht gespeichert, aber E-Mail-Versand fehlgeschlagen: ${data.emailError}`);
      }

      setMessages([...messages, data.message || data]);
      setReplyContent("");
      setAttachments([]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSending(false);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            Authorization: getAuthHeader(),
          },
          body: formData,
        });

        if (res.ok) {
          const attachment = await res.json();
          setAttachments(prev => [...prev, attachment]);
        } else {
          const data = await res.json();
          alert(`Fehler beim Hochladen von ${file.name}: ${data.message}`);
        }
      }
    } catch (err) {
      alert('Fehler beim Hochladen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // AI Functions
  const handleAiGenerate = async () => {
    if (!ticket || messages.length === 0) return;

    setAiLoading(true);
    setShowAiMenu(false);
    try {
      const lastCustomerMessage = [...messages].reverse().find(m => m.sender === "customer");

      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          action: "ticket_reply",
          customerMessage: lastCustomerMessage?.content || ticket.subject,
          customerName: ticket.customerName,
          ticketSubject: ticket.subject,
        }),
      });

      if (!res.ok) throw new Error("KI-Fehler");

      const data = await res.json();
      setReplyContent(data.content);
    } catch (err) {
      alert("Fehler bei der KI-Generierung");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCorrect = async () => {
    if (!replyContent.trim()) return;

    setAiLoading(true);
    setShowAiMenu(false);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          action: "ticket_correct",
          content: replyContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "KI-Fehler");
      }

      setReplyContent(data.content);
    } catch (err: any) {
      alert("Fehler bei der KI-Korrektur: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiRewrite = async (tone: string) => {
    if (!replyContent.trim()) return;

    setAiLoading(true);
    setShowAiMenu(false);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          action: "ticket_rewrite",
          content: replyContent,
          tone,
        }),
      });

      if (!res.ok) throw new Error("KI-Fehler");

      const data = await res.json();
      setReplyContent(data.content);
    } catch (err) {
      alert("Fehler beim Umschreiben");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCustom = async () => {
    if (!customInstruction.trim()) return;

    setAiLoading(true);
    setShowCustomModal(false);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          action: "ticket_custom",
          content: replyContent || "", // Can be empty - API will generate new text
          instruction: customInstruction,
          // Include conversation history for context-aware responses
          conversationHistory: messages.map(m => ({
            sender: m.sender,
            senderName: m.senderName,
            content: m.content,
            createdAt: m.createdAt,
          })),
          // Include ticket info
          ticketInfo: ticket ? {
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            customerName: ticket.customerName,
            customerEmail: ticket.customerEmail,
            status: ticket.status,
          } : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "KI-Fehler");
      }

      const data = await res.json();
      setReplyContent(data.content);
      setCustomInstruction("");
    } catch (err: any) {
      alert("Fehler bei der KI-Bearbeitung: " + (err.message || "Unbekannter Fehler"));
    } finally {
      setAiLoading(false);
    }
  };

  // Share article with customer
  const handleShareArticle = async () => {
    if (!selectedArticle || !ticket) return;

    setSharingArticle(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}/share-article`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          articleId: selectedArticle.id,
          channel: shareChannel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Teilen");
      }

      // Reload messages to show the shared article
      const messagesRes = await fetch(`/api/admin/tickets/${id}/messages`, {
        headers: { Authorization: getAuthHeader() }
      });
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData);
      }

      setShowShareModal(false);
      setSelectedArticle(null);
      setShareChannel('auto');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSharingArticle(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Ticket wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      });

      if (!res.ok) throw new Error("Fehler beim Löschen");

      window.location.href = "/admin/tickets";
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Ticket wird geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-apple-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Fehler: {error || "Ticket nicht gefunden"}</span>
          </div>
        </div>
        <Link href="/admin/tickets" className="mt-4 inline-flex items-center gap-2 text-brand hover:text-brand-dark">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  // Navigate to ticket
  const navigateToTicket = (ticketId: string) => {
    setSidebarOpen(false);
    router.push(`/admin/tickets/${ticketId}`);
  };

  return (
    <div className="animate-fade-in">
      {/* Mobile: Floating Button to open sidebar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="xl:hidden fixed bottom-24 left-4 z-30 w-12 h-12 bg-white rounded-full shadow-lg border border-apple-gray-200 flex items-center justify-center text-apple-gray-500 hover:text-brand hover:shadow-xl transition-all"
        title="Andere Tickets"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        {sidebarTickets.filter(t => t.id !== id && (t.unreadCount || 0) > 0).length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {sidebarTickets.filter(t => t.id !== id && (t.unreadCount || 0) > 0).length}
          </span>
        )}
      </button>

      {/* Mobile: Sidebar Drawer */}
      {sidebarOpen && (
        <>
          <div
            className="xl:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="xl:hidden fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-50 shadow-2xl animate-slide-in-left flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-apple-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-apple-gray-600">Offene Tickets</h3>
                  <p className="text-xs text-apple-gray-400">{sidebarTickets.length} aktiv</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto">
              {sidebarLoading ? (
                <div className="p-4 text-center text-apple-gray-400">
                  <svg className="w-5 h-5 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Laden...</span>
                </div>
              ) : sidebarTickets.length === 0 ? (
                <div className="p-4 text-center text-apple-gray-400 text-sm">
                  Keine offenen Tickets
                </div>
              ) : (
                <div className="py-2">
                  {sidebarTickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigateToTicket(t.id)}
                      className={`w-full px-4 py-3 text-left transition-all ${
                        t.id === id
                          ? "bg-brand/10 border-l-3 border-brand"
                          : "hover:bg-apple-gray-50 border-l-3 border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              t.status === 'open' ? 'bg-blue-500' : 'bg-amber-500'
                            }`} />
                            <span className="text-xs text-apple-gray-400 font-mono">{t.ticketNumber}</span>
                          </div>
                          <p className={`text-sm font-medium truncate ${
                            t.id === id ? 'text-brand' : 'text-apple-gray-600'
                          }`}>
                            {t.subject}
                          </p>
                          <p className="text-xs text-apple-gray-400 truncate mt-0.5">
                            {t.customerName}
                          </p>
                        </div>
                        {(t.unreadCount || 0) > 0 && t.id !== id && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {t.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-apple-gray-100 p-4">
              <Link
                href="/admin/tickets"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-brand hover:bg-brand/5 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Alle Tickets anzeigen
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/tickets" className="text-apple-gray-400 hover:text-brand transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <span className="text-sm font-mono text-apple-gray-400">{ticket.ticketNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-apple-gray-600 ml-8">{ticket.subject}</h1>
        </div>
        <button
          onClick={handleDelete}
          className="text-sm text-red-500 hover:text-red-700 transition-colors self-start lg:self-center"
        >
          Ticket löschen
        </button>
      </div>

      {/* Main Layout with Desktop Sidebar */}
      <div className="flex gap-6">
        {/* Desktop Sidebar - Ticket Navigation */}
        <div className="hidden xl:block w-72 flex-shrink-0">
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden sticky top-20">
            {/* Header */}
            <div className="px-4 py-3 border-b border-apple-gray-100 bg-apple-gray-50/50">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span className="text-sm font-semibold text-apple-gray-600">Offene Tickets</span>
                <span className="ml-auto text-xs text-apple-gray-400 bg-apple-gray-100 px-2 py-0.5 rounded-full">
                  {sidebarTickets.length}
                </span>
              </div>
            </div>

            {/* Ticket List */}
            <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
              {sidebarLoading ? (
                <div className="p-4 text-center text-apple-gray-400">
                  <svg className="w-5 h-5 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-xs">Laden...</span>
                </div>
              ) : sidebarTickets.length === 0 ? (
                <div className="p-4 text-center text-apple-gray-400 text-sm">
                  Keine offenen Tickets
                </div>
              ) : (
                <div className="divide-y divide-apple-gray-50">
                  {sidebarTickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => navigateToTicket(t.id)}
                      className={`w-full px-4 py-3 text-left transition-all group ${
                        t.id === id
                          ? "bg-brand/5 border-l-3 border-brand"
                          : "hover:bg-apple-gray-50 border-l-3 border-transparent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              t.status === 'open' ? 'bg-blue-500' : 'bg-amber-500'
                            }`} />
                            <span className="text-[10px] text-apple-gray-400 font-mono">{t.ticketNumber}</span>
                          </div>
                          <p className={`text-sm font-medium truncate transition-colors ${
                            t.id === id ? 'text-brand' : 'text-apple-gray-600 group-hover:text-brand'
                          }`}>
                            {t.subject}
                          </p>
                          <p className="text-xs text-apple-gray-400 truncate mt-0.5">
                            {t.customerName}
                          </p>
                        </div>
                        {(t.unreadCount || 0) > 0 && t.id !== id && (
                          <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {t.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-apple-gray-100 p-3 bg-apple-gray-50/50">
              <Link
                href="/admin/tickets"
                className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-apple-gray-500 hover:text-brand rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Alle Tickets
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Messages */}
            <div className="lg:col-span-2">
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
            {/* Messages */}
            <div className="max-h-[500px] overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => {
                const isUnread = msg.sender === "customer" && !msg.isRead;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-apple-lg p-4 relative ${
                        msg.sender === "admin"
                          ? "bg-brand text-white"
                          : isUnread
                          ? "bg-blue-50 text-apple-gray-600 ring-2 ring-blue-200"
                          : "bg-apple-gray-100 text-apple-gray-600"
                      }`}
                    >
                      {isUnread && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-red-500 rounded-full">
                          Neu
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-sm font-medium ${msg.sender === "admin" ? "text-white/90" : "text-apple-gray-500"}`}>
                          {msg.senderName}
                        </span>
                        <span className={`text-xs ${msg.sender === "admin" ? "text-white/60" : "text-apple-gray-400"}`}>
                          {new Date(msg.createdAt).toLocaleString("de-DE", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {msg.sender === "admin" && (
                          <MessageStatusIcon message={msg} />
                        )}
                        {/* Delivery Channel Indicator */}
                        {msg.sender === "admin" && msg.deliveryChannel && (
                          <span className={`text-xs flex items-center gap-1 ${msg.sender === "admin" ? "text-white/60" : "text-apple-gray-400"}`}>
                            {msg.deliveryChannel === 'live' && (
                              <>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                </svg>
                                Live
                              </>
                            )}
                            {msg.deliveryChannel === 'email' && (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                E-Mail
                              </>
                            )}
                            {msg.deliveryChannel === 'whatsapp' && (
                              <>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                WhatsApp
                              </>
                            )}
                          </span>
                        )}
                      </div>
                      <div
                        className={`ticket-message-content ${
                          msg.sender === "admin"
                            ? "ticket-message-admin"
                            : "ticket-message-customer"
                        }`}
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                    {/* Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className={`text-xs mb-2 ${msg.sender === "admin" ? "text-white/70" : "text-apple-gray-500"}`}>
                          {msg.attachments.length} Anhang/Anhänge:
                        </p>
                        <div className="space-y-1">
                          {msg.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-sm ${
                                msg.sender === "admin"
                                  ? "text-white/90 hover:text-white"
                                  : "text-brand hover:text-brand-dark"
                              }`}
                            >
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                              </svg>
                              <span className="truncate">{att.filename}</span>
                              <span className={`text-xs ${msg.sender === "admin" ? "text-white/50" : "text-apple-gray-400"}`}>
                                ({formatFileSize(att.size)})
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
              {/* Typing Indicator */}
              {isCustomerTyping && (
                <div className="flex justify-start">
                  <div className="bg-apple-gray-100 rounded-apple-lg px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-apple-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-apple-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-apple-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-apple-gray-500">Kunde tippt...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Form */}
            <div className="border-t border-apple-gray-100 p-4">
              <form onSubmit={handleSendReply}>
                {/* AI Tools Bar */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs text-apple-gray-400 font-medium hidden sm:inline">KI-Assistent:</span>

                  {/* Desktop: Individual Buttons */}
                  <div className="hidden sm:flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAiGenerate}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Antwort generieren
                    </button>

                    <button
                      type="button"
                      onClick={handleAiCorrect}
                      disabled={aiLoading || !replyContent.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Korrigieren
                    </button>

                    {/* Rewrite Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAiMenu(!showAiMenu)}
                        disabled={aiLoading || !replyContent.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Umschreiben
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showAiMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-apple-gray-200 py-1 z-10 min-w-[160px]">
                          <button
                            type="button"
                            onClick={() => handleAiRewrite("formal")}
                            className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50"
                          >
                            Formeller
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAiRewrite("friendly")}
                            className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50"
                          >
                            Freundlicher
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAiRewrite("short")}
                            className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50"
                          >
                            Kürzer
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAiRewrite("detailed")}
                            className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50"
                          >
                            Ausführlicher
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCustomModal(true)}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Eigene Anweisung
                    </button>
                  </div>

                  {/* Mobile: Dropdown Menu */}
                  <div className="sm:hidden relative">
                    <button
                      type="button"
                      onClick={() => setShowAiMenu(!showAiMenu)}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      KI-Assistent
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showAiMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-apple-gray-200 py-1 z-10 min-w-[180px]">
                        <button
                          type="button"
                          onClick={handleAiGenerate}
                          disabled={aiLoading}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Antwort generieren
                        </button>
                        <button
                          type="button"
                          onClick={handleAiCorrect}
                          disabled={aiLoading || !replyContent.trim()}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Korrigieren
                        </button>
                        <div className="border-t border-apple-gray-100 my-1"></div>
                        <button
                          type="button"
                          onClick={() => handleAiRewrite("formal")}
                          disabled={aiLoading || !replyContent.trim()}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50"
                        >
                          Formeller umschreiben
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiRewrite("friendly")}
                          disabled={aiLoading || !replyContent.trim()}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50"
                        >
                          Freundlicher umschreiben
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiRewrite("short")}
                          disabled={aiLoading || !replyContent.trim()}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50"
                        >
                          Kürzer umschreiben
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAiRewrite("detailed")}
                          disabled={aiLoading || !replyContent.trim()}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50"
                        >
                          Ausführlicher umschreiben
                        </button>
                        <div className="border-t border-apple-gray-100 my-1"></div>
                        <button
                          type="button"
                          onClick={() => { setShowCustomModal(true); setShowAiMenu(false); }}
                          disabled={aiLoading}
                          className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50 disabled:opacity-50 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Eigene Anweisung
                        </button>
                      </div>
                    )}
                  </div>

                  {aiLoading && (
                    <span className="inline-flex items-center gap-2 text-xs text-purple-600">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">KI arbeitet...</span>
                    </span>
                  )}
                </div>

                <RichTextEditor
                  value={replyContent}
                  onChange={setReplyContent}
                  variant="ticket"
                  placeholder="Antwort schreiben..."
                />

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mt-3 p-3 bg-apple-gray-50 rounded-apple-lg">
                    <p className="text-xs text-apple-gray-500 mb-2">{attachments.length} Anhang/Anhänge:</p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-apple-gray-200 text-sm"
                        >
                          <svg className="w-4 h-4 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="truncate max-w-[150px]">{att.filename}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="text-apple-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-3">
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-sm text-apple-gray-500 min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="w-5 h-5 rounded border-apple-gray-300 text-brand focus:ring-brand"
                      />
                      <span className="hidden sm:inline">Auch per E-Mail senden</span>
                      <span className="sm:hidden">E-Mail</span>
                    </label>

                    {/* File Upload Button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] text-sm text-apple-gray-500 hover:text-apple-gray-700 hover:bg-apple-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">Datei anhängen</span>
                    </button>

                    {/* Quick Replies Dropdown */}
                    {quickReplies.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowQuickReplies(!showQuickReplies)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] text-sm text-apple-gray-500 hover:text-apple-gray-700 hover:bg-apple-gray-100 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <span className="hidden sm:inline">Schnellantwort</span>
                        </button>
                        {showQuickReplies && (
                          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-apple-gray-200 py-1 z-20 min-w-[200px]">
                            {quickReplies.map((reply) => (
                              <button
                                key={reply.id}
                                type="button"
                                onClick={() => {
                                  setReplyContent(reply.content);
                                  setShowQuickReplies(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-apple-gray-600 hover:bg-apple-gray-50"
                              >
                                {reply.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sound Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = !soundEnabled;
                        setSoundEnabled(newValue);
                        localStorage.setItem('admin:sound-enabled', String(newValue));
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] text-sm rounded-lg transition-colors ${
                        soundEnabled
                          ? 'text-brand bg-brand/10 hover:bg-brand/20'
                          : 'text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100'
                      }`}
                      title={soundEnabled ? 'Ton aktiv' : 'Ton stumm'}
                    >
                      {soundEnabled ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !replyContent.trim()}
                    className="px-6 py-3 min-h-[44px] bg-brand text-white font-medium rounded-full hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Senden...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Senden
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar - Ticket Info */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider mb-3">Status</h3>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as Ticket["status"])}
              className="w-full px-3 py-2 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
            >
              {Object.entries(statusConfig).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider mb-3">Priorität</h3>
            <select
              value={ticket.priority}
              onChange={(e) => handlePriorityChange(e.target.value as Ticket["priority"])}
              className="w-full px-3 py-2 rounded-apple-lg border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
            >
              {Object.entries(priorityConfig).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider mb-3">Kunde</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-apple-gray-600 font-medium">{ticket.customerName}</p>
                {/* Online Status Indicator */}
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${customerPresence.online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className={`text-xs ${customerPresence.online ? 'text-green-600' : 'text-apple-gray-400'}`}>
                    {customerPresence.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <a
                href={`mailto:${ticket.customerEmail}`}
                className="text-brand hover:text-brand-dark text-sm break-all"
              >
                {ticket.customerEmail}
              </a>
              {/* Last Seen */}
              {!customerPresence.online && customerPresence.lastSeen && (
                <p className="text-xs text-apple-gray-400">
                  Zuletzt gesehen: {(() => {
                    const lastSeen = new Date(customerPresence.lastSeen);
                    const now = new Date();
                    const diffMs = now.getTime() - lastSeen.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    if (diffMins < 1) return 'gerade eben';
                    if (diffMins < 60) return `vor ${diffMins} Min.`;
                    if (diffHours < 24) return `vor ${diffHours} Std.`;
                    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
                    return lastSeen.toLocaleDateString('de-DE');
                  })()}
                </p>
              )}
              {/* Human Requested Badge */}
              {humanRequested && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs font-medium text-orange-700">Mensch angefordert</span>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider mb-3">Zeitstempel</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-apple-gray-400">Erstellt:</span>
                <span className="text-apple-gray-600">
                  {new Date(ticket.createdAt).toLocaleString("de-DE")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-apple-gray-400">Aktualisiert:</span>
                <span className="text-apple-gray-600">
                  {new Date(ticket.updatedAt).toLocaleString("de-DE")}
                </span>
              </div>
            </div>
          </div>

          {/* Relevant Articles */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider">Passende Artikel</h3>
              <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {articlesLoading ? (
              <div className="flex items-center justify-center py-4">
                <svg className="w-5 h-5 animate-spin text-apple-gray-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : relevantArticles.length === 0 ? (
              <p className="text-sm text-apple-gray-400 text-center py-4">
                Keine passenden Artikel gefunden
              </p>
            ) : (
              <div className="space-y-2">
                {relevantArticles.map((article) => (
                  <div
                    key={article.id}
                    className="group relative bg-apple-gray-50 hover:bg-brand/5 rounded-xl p-3 transition-all"
                  >
                    <div className="pr-8">
                      <p className="text-sm font-medium text-apple-gray-600 group-hover:text-brand transition-colors line-clamp-2">
                        {article.title}
                      </p>
                      {article.category && (
                        <p className="text-xs text-apple-gray-400 mt-1">
                          {article.category}
                        </p>
                      )}
                    </div>
                    {/* Share Button */}
                    <button
                      onClick={() => {
                        setSelectedArticle(article);
                        setShowShareModal(true);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-brand text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-brand-dark"
                      title="Mit Kunde teilen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>
                ))}
                {/* View All Articles Link */}
                <a
                  href="/admin/artikel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-apple-gray-400 hover:text-brand transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Alle Artikel
                </a>
              </div>
            )}
          </div>
        </div>
        </div>
        </div>
      </div>

      {/* Custom AI Instruction - App-Style Full Sheet */}
      {showCustomModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-50 animate-fade-in backdrop-blur-sm"
            onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
          />
          {/* Panel - Full sheet on mobile, modal on desktop */}
          <div className="fixed inset-x-0 bottom-0 max-h-[90vh] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:max-w-xl sm:w-full sm:mx-4 sm:max-h-[80vh]">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up sm:animate-fade-in flex flex-col max-h-[90vh] sm:max-h-[80vh]">
              {/* Header */}
              <div className="flex-shrink-0 border-b border-apple-gray-100">
                {/* Handle bar for mobile */}
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>

                <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-brand flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">KI-Assistent</h3>
                      <p className="text-xs text-apple-gray-400">Kontextbezogene Antworten</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                {/* Conversation Context Preview */}
                {messages.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">Kontext</p>
                    <div className="bg-apple-gray-50 rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
                      {messages.slice(-3).map((msg, idx) => {
                        const content = msg.content || '';
                        const cleanContent = content.replace(/<[^>]*>/g, '').trim();
                        return (
                          <div key={msg.id || idx} className="flex items-start gap-2">
                            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                              msg.sender === 'customer' ? 'bg-blue-100 text-blue-600' : 'bg-brand/10 text-brand'
                            }`}>
                              {msg.sender === 'customer' ? 'K' : 'S'}
                            </div>
                            <p className="text-xs text-apple-gray-500 line-clamp-2">
                              {cleanContent.substring(0, 100)}{cleanContent.length > 100 ? '...' : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="mb-5">
                  <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">Schnellaktionen</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Freundlich antworten", icon: "😊" },
                      { label: "Entschuldigung hinzufügen", icon: "🙏" },
                      { label: "Weiterleitung erklären", icon: "➡️" },
                      { label: "Um Geduld bitten", icon: "⏳" },
                    ].map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomInstruction(action.label)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-full border transition-all ${
                          customInstruction === action.label
                            ? 'border-brand bg-brand/5 text-brand'
                            : 'border-apple-gray-200 text-apple-gray-600 hover:border-apple-gray-300 hover:bg-apple-gray-50'
                        }`}
                      >
                        <span>{action.icon}</span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Instruction Input */}
                <div>
                  <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">
                    {replyContent.trim() ? "Text bearbeiten" : "Neue Antwort erstellen"}
                  </p>
                  <textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder={replyContent.trim()
                      ? "Beschreibe, wie der Text geändert werden soll..."
                      : "Beschreibe, was du antworten möchtest..."}
                    rows={4}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-apple-gray-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all resize-none text-base bg-white"
                  />
                  <p className="mt-2 text-xs text-apple-gray-400">
                    Die KI kennt den gesamten Gesprächsverlauf und kann kontextbezogen antworten.
                  </p>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex-shrink-0 border-t border-apple-gray-100 px-5 py-4 sm:px-6 bg-apple-gray-50/50">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
                    className="flex-1 sm:flex-none px-5 py-3 text-apple-gray-600 font-medium rounded-xl border border-apple-gray-200 hover:bg-white transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleAiCustom}
                    disabled={!customInstruction.trim()}
                    className="flex-[2] sm:flex-1 px-5 py-3 bg-gradient-to-r from-brand to-brand-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-brand/25 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {replyContent.trim() ? "Text bearbeiten" : "Antwort generieren"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Share Article Modal */}
      {showShareModal && selectedArticle && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50 animate-fade-in backdrop-blur-sm"
            onClick={() => {
              setShowShareModal(false);
              setSelectedArticle(null);
              setShareChannel('auto');
            }}
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[90vh] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:max-w-md sm:w-full sm:mx-4">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up sm:animate-fade-in">
              {/* Header */}
              <div className="border-b border-apple-gray-100">
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">Artikel teilen</h3>
                      <p className="text-xs text-apple-gray-400">An Kunde senden</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowShareModal(false);
                      setSelectedArticle(null);
                      setShareChannel('auto');
                    }}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-4 sm:px-6">
                {/* Article Preview */}
                <div className="mb-5 p-4 bg-gradient-to-br from-apple-gray-50 to-apple-gray-100 rounded-xl border border-apple-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-apple-gray-600 line-clamp-2">{selectedArticle.title}</p>
                      <p className="text-xs text-apple-gray-400 mt-1">
                        hilfe.fit-inn-trier.de/artikel/{selectedArticle.slug}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Channel Selection */}
                <div>
                  <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-3">Versandkanal</p>
                  <div className="space-y-2">
                    {/* Auto - Smart Selection */}
                    <button
                      onClick={() => setShareChannel('auto')}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        shareChannel === 'auto'
                          ? 'border-brand bg-brand/5'
                          : 'border-apple-gray-200 hover:border-apple-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        shareChannel === 'auto' ? 'bg-brand text-white' : 'bg-apple-gray-100 text-apple-gray-500'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${shareChannel === 'auto' ? 'text-brand' : 'text-apple-gray-600'}`}>
                          Automatisch
                        </p>
                        <p className="text-xs text-apple-gray-400">
                          {customerPresence.online ? 'Live-Chat (Kunde online)' : 'E-Mail (Kunde offline)'}
                        </p>
                      </div>
                      {shareChannel === 'auto' && (
                        <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* Live Chat */}
                    <button
                      onClick={() => setShareChannel('live')}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        shareChannel === 'live'
                          ? 'border-brand bg-brand/5'
                          : 'border-apple-gray-200 hover:border-apple-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        shareChannel === 'live' ? 'bg-brand text-white' : 'bg-apple-gray-100 text-apple-gray-500'
                      }`}>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${shareChannel === 'live' ? 'text-brand' : 'text-apple-gray-600'}`}>
                          Live-Chat
                        </p>
                        <p className="text-xs text-apple-gray-400">Im Portal anzeigen</p>
                      </div>
                      {shareChannel === 'live' && (
                        <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* Email */}
                    <button
                      onClick={() => setShareChannel('email')}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        shareChannel === 'email'
                          ? 'border-brand bg-brand/5'
                          : 'border-apple-gray-200 hover:border-apple-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        shareChannel === 'email' ? 'bg-brand text-white' : 'bg-apple-gray-100 text-apple-gray-500'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${shareChannel === 'email' ? 'text-brand' : 'text-apple-gray-600'}`}>
                          E-Mail
                        </p>
                        <p className="text-xs text-apple-gray-400">Als schöne E-Mail senden</p>
                      </div>
                      {shareChannel === 'email' && (
                        <svg className="w-5 h-5 text-brand" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>

                    {/* WhatsApp - only if ticket is WhatsApp */}
                    {ticket && (ticket as any).channel === 'whatsapp' && (
                      <button
                        onClick={() => setShareChannel('whatsapp')}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          shareChannel === 'whatsapp'
                            ? 'border-green-500 bg-green-50'
                            : 'border-apple-gray-200 hover:border-apple-gray-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          shareChannel === 'whatsapp' ? 'bg-green-500 text-white' : 'bg-apple-gray-100 text-apple-gray-500'
                        }`}>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${shareChannel === 'whatsapp' ? 'text-green-600' : 'text-apple-gray-600'}`}>
                            WhatsApp
                          </p>
                          <p className="text-xs text-apple-gray-400">Als WhatsApp-Nachricht</p>
                        </div>
                        {shareChannel === 'whatsapp' && (
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-apple-gray-100 px-5 py-4 sm:px-6 bg-apple-gray-50/50">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowShareModal(false);
                      setSelectedArticle(null);
                      setShareChannel('auto');
                    }}
                    className="flex-1 sm:flex-none px-5 py-3 text-apple-gray-600 font-medium rounded-xl border border-apple-gray-200 hover:bg-white transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleShareArticle}
                    disabled={sharingArticle}
                    className="flex-[2] sm:flex-1 px-5 py-3 bg-gradient-to-r from-brand to-brand-dark text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-brand/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {sharingArticle ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Senden...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Artikel senden
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Click outside to close AI menu */}
      {showAiMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowAiMenu(false)} />
      )}

      {/* Click outside to close quick replies */}
      {showQuickReplies && (
        <div className="fixed inset-0 z-0" onClick={() => setShowQuickReplies(false)} />
      )}

      {/* Audio element for notification */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
      </audio>
    </div>
  );
}
