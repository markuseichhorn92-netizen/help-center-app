"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, use } from "react";
import RichTextEditor from "@/components/editor/LazyRichTextEditor";

// Format message content based on channel and content type
function formatMessageContent(content: string | null | undefined, channel?: string): string {
  // Handle null/undefined content
  if (!content) {
    return '';
  }

  // Ensure content is a string
  const strContent = String(content);

  // WhatsApp messages are ALWAYS plain text - strip any HTML tags
  if (channel === 'whatsapp') {
    // Remove all HTML tags (they shouldn't be there for WhatsApp)
    const plainText = strContent.replace(/<[^>]*>/g, '');
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
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(strContent);
  if (hasHtmlTags) {
    return strContent;
  }

  // Plain text - escape HTML and convert newlines
  return strContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br />');
}

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
  channel?: 'email' | 'whatsapp' | 'web';
  phone?: string;
  tags?: string[];
  aiStatus?: 'active' | 'escalated' | 'disabled';
}

interface TicketNote {
  id: string;
  ticketId: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

interface TicketTag {
  id: string;
  name: string;
  color: string;
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

// Auth is handled via session cookie - no header needed

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
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());

  // Default Quick Reply Templates (used if no custom ones loaded)
  const defaultQuickReplies = [
    { id: "1", title: "Danke", content: "Vielen Dank für Ihre Nachricht! Wir kümmern uns darum." },
    { id: "2", title: "Rückfrage", content: "Könnten Sie uns bitte noch weitere Details mitteilen?" },
    { id: "3", title: "Erledigt", content: "Ihr Anliegen wurde bearbeitet. Bei weiteren Fragen stehen wir gerne zur Verfügung." },
    { id: "4", title: "Weiterleiten", content: "Ich habe Ihre Anfrage an die zuständige Abteilung weitergeleitet." },
  ];
  const [sendEmail, setSendEmail] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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

  // AI status toggle state
  const [aiStatusLoading, setAiStatusLoading] = useState(false);

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

  // Article search state
  const [articleSearchQuery, setArticleSearchQuery] = useState('');
  const [articleSearchResults, setArticleSearchResults] = useState<Array<{
    id: string;
    title: string;
    slug: string;
    category?: string;
    excerpt?: string;
  }>>([]);
  const [articleSearching, setArticleSearching] = useState(false);
  const [showArticleSearch, setShowArticleSearch] = useState(false);
  const articleSearchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Forward modal state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileNotesModal, setShowMobileNotesModal] = useState(false);
  const [showMobileAiModal, setShowMobileAiModal] = useState(false);
  const [showMobileQuickRepliesModal, setShowMobileQuickRepliesModal] = useState(false);
  const [showMobileArticlesModal, setShowMobileArticlesModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<TicketMessage | null>(null);
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardName, setForwardName] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [forwardReplyToCustomer, setForwardReplyToCustomer] = useState(true);
  const [forwarding, setForwarding] = useState(false);

  // Rating state
  const [ticketRating, setTicketRating] = useState<{ rating: number; comment?: string } | null>(null);
  const [requestingRating, setRequestingRating] = useState(false);
  const [ratingRequested, setRatingRequested] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<{
    id: string;
    title: string;
    slug: string;
  } | null>(null);
  const [shareChannel, setShareChannel] = useState<'auto' | 'live' | 'email' | 'whatsapp'>('auto');
  const [shareCustomText, setShareCustomText] = useState("");
  const [sharingArticle, setSharingArticle] = useState(false);

  // Tags and Notes state
  const [availableTags, setAvailableTags] = useState<TicketTag[]>([]);
  const [ticketNotes, setTicketNotes] = useState<TicketNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingTags, setSavingTags] = useState(false);

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
      const [ticketRes, messagesRes, ratingRes] = await Promise.all([
        fetch(`/api/admin/tickets/${id}`, {
          credentials: 'same-origin'
        }),
        fetch(`/api/admin/tickets/${id}/messages`, {
          credentials: 'same-origin'
        }),
        fetch(`/api/admin/tickets/${id}/rating`, {
          credentials: 'same-origin'
        })
      ]);

      if (!ticketRes.ok) {
        throw new Error("Ticket nicht gefunden");
      }

      const ticketData = await ticketRes.json();
      const messagesData = await messagesRes.json();

      // Load rating if available
      if (ratingRes.ok) {
        const ratingData = await ratingRes.json();
        if (ratingData.rating) {
          setTicketRating({
            rating: ratingData.rating.rating,
            comment: ratingData.rating.comment,
          });
        }
      }

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
        credentials: 'same-origin'
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

  // Load available tags
  const loadTags = async () => {
    try {
      const res = await fetch('/api/admin/ticket-tags', {
        credentials: 'same-origin'
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableTags(data.tags || []);
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  // Load ticket notes
  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}/notes`, {
        credentials: 'same-origin'
      });
      if (res.ok) {
        const data = await res.json();
        setTicketNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  };

  // Toggle tag on ticket
  const handleTagToggle = async (tagId: string) => {
    if (!ticket || savingTags) return;

    setSavingTags(true);
    const currentTags = ticket.tags || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId];

    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify({ tags: newTags })
      });

      if (res.ok) {
        setTicket(prev => prev ? { ...prev, tags: newTags } : null);
      }
    } catch (err) {
      console.error('Failed to update tags:', err);
    } finally {
      setSavingTags(false);
    }
  };

  // Add a new note
  const handleAddNote = async () => {
    if (!newNoteContent.trim() || savingNote) return;

    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify({ content: newNoteContent.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setTicketNotes(prev => [data.note, ...prev]);
        setNewNoteContent("");
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  // Delete a note
  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}/notes`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
                  },
        body: JSON.stringify({ noteId })
      });

      if (res.ok) {
        setTicketNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadSidebarTickets();
    loadTags();
    loadNotes();

    // Auto-refresh messages every 5 seconds for real-time status updates
    const interval = setInterval(async () => {
      try {
        const messagesRes = await fetch(`/api/admin/tickets/${id}/messages`, {
          credentials: 'same-origin'
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
    }, 5000); // 5 seconds - optimized for performance

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
          credentials: 'same-origin'
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
    const interval = setInterval(checkCustomerPresence, 10000); // Check every 10s - optimized

    return () => clearInterval(interval);
  }, [id]);

  // Check if human was requested
  useEffect(() => {
    const checkHumanRequested = async () => {
      try {
        const res = await fetch(`/api/admin/tickets/${id}/human-requested`, {
          credentials: 'same-origin'
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
          credentials: 'same-origin'
        });
        if (res.ok) {
          const data = await res.json();
          setIsCustomerTyping(data.isTyping);
        }
      } catch {
        // Silently fail
      }
    };

    // Check typing indicator every 3s - optimized for performance
    const interval = setInterval(checkTyping, 3000);

    return () => clearInterval(interval);
  }, [id]);

  // Load quick replies
  useEffect(() => {
    const loadQuickReplies = async () => {
      try {
        const res = await fetch('/api/admin/quick-replies', {
          credentials: 'same-origin'
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
          credentials: 'same-origin'
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
                  },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Fehler beim Aktualisieren");

      const updatedTicket = await res.json();
      setTicket(updatedTicket);

      // Automatically request rating when closing ticket
      if (newStatus === 'closed' && !ticketRating && !ratingRequested) {
        try {
          await fetch(`/api/admin/tickets/${id}/request-rating`, {
            method: 'POST',
          });
          setRatingRequested(true);
        } catch (e) {
          console.error('Failed to send rating request:', e);
        }
      }

      // Navigate to the appropriate filter view
      if (newStatus === 'closed' || newStatus === 'resolved') {
        setTimeout(() => {
          // Use router for smoother navigation, go to the matching status filter
          const filterParam = newStatus === 'resolved' ? 'resolved' : 'closed';
          window.location.href = `/admin/tickets?filter=${filterParam}`;
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

  // Article search handler with debouncing
  const handleArticleSearch = (query: string) => {
    setArticleSearchQuery(query);

    // Clear previous timeout
    if (articleSearchTimeout.current) {
      clearTimeout(articleSearchTimeout.current);
    }

    if (query.length < 2) {
      setArticleSearchResults([]);
      return;
    }

    // Debounce search
    articleSearchTimeout.current = setTimeout(async () => {
      setArticleSearching(true);
      try {
        const res = await fetch(`/api/admin/articles/search?q=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        setArticleSearchResults(data.articles || []);
      } catch (e) {
        console.error('Article search error:', e);
      } finally {
        setArticleSearching(false);
      }
    }, 300);
  };

  // Insert article link into reply
  const handleInsertArticle = (article: { id: string; title: string }) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const articleUrl = `${baseUrl}/articles/${article.id}`;
    const insertText = `\n\nHilfreicher Artikel: ${article.title}\n${articleUrl}`;
    setReplyContent(prev => prev + insertText);
  };

  // Forward message handler
  const handleForwardMessage = async () => {
    if (!forwardMessage || !forwardEmail || !ticket) return;

    setForwarding(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: forwardMessage.id,
          toEmail: forwardEmail,
          toName: forwardName || undefined,
          note: forwardNote || undefined,
          replyToCustomer: forwardReplyToCustomer,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Weiterleitung fehlgeschlagen');
      }

      // Success - close modal and reset
      setShowForwardModal(false);
      setForwardMessage(null);
      setForwardEmail('');
      setForwardName('');
      setForwardNote('');
      setForwardReplyToCustomer(false);
      alert('Nachricht wurde weitergeleitet');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setForwarding(false);
    }
  };

  // Request rating handler
  const handleRequestRating = async () => {
    if (!ticket || requestingRating) return;

    setRequestingRating(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}/request-rating`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Senden');
      }

      setRatingRequested(true);
      alert('Bewertungsanfrage wurde gesendet');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRequestingRating(false);
    }
  };

  // Toggle AI auto-reply for this ticket
  const handleAIStatusToggle = async () => {
    if (!ticket || aiStatusLoading) return;

    setAiStatusLoading(true);
    const currentStatus = ticket.aiStatus || 'active';
    const newAction = currentStatus === 'active' ? 'disable' : 'enable';

    try {
      const res = await fetch(`/api/admin/tickets/${id}/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: newAction }),
      });

      if (!res.ok) throw new Error("Fehler beim Ändern des KI-Status");

      const data = await res.json();
      setTicket(prev => prev ? { ...prev, aiStatus: data.aiStatus } : null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAiStatusLoading(false);
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

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
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
    }
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
                  },
        body: JSON.stringify({
          articleId: selectedArticle.id,
          channel: shareChannel,
          customText: shareCustomText.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fehler beim Teilen");
      }

      // Reload messages to show the shared article
      const messagesRes = await fetch(`/api/admin/tickets/${id}/messages`, {
        credentials: 'same-origin'
      });
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData);
      }

      setShowShareModal(false);
      setSelectedArticle(null);
      setShareChannel('auto');
      setShareCustomText("");
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
        credentials: 'same-origin',
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

  // Find next/previous ticket for navigation
  const currentTicketIndex = sidebarTickets.findIndex(t => t.id === id);
  const prevTicket = currentTicketIndex > 0 ? sidebarTickets[currentTicketIndex - 1] : null;
  const nextTicket = currentTicketIndex < sidebarTickets.length - 1 ? sidebarTickets[currentTicketIndex + 1] : null;

  return (
    <>
      {/* Mobile: Fixed Header with Quick Actions - OUTSIDE animate container! */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-apple-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Back + Ticket Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/admin/tickets"
              className="flex-shrink-0 w-9 h-9 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-apple-gray-400 font-mono">{ticket.ticketNumber}</p>
              <p className="text-sm font-semibold text-apple-gray-600 truncate">{ticket.subject}</p>
            </div>
          </div>

          {/* Quick Status Buttons */}
          <div className="flex items-center gap-1">
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as Ticket["status"])}
              className="text-xs px-2 py-1.5 rounded-lg border border-apple-gray-200 bg-white focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none"
            >
              {Object.entries(statusConfig).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile: Bottom Navigation Bar - OUTSIDE animate container! */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-apple-gray-200 px-3 py-2 pb-6">
        {/* More Menu moved to outside - see Mobile More Menu Modal below */}
        
        <div className="flex items-center justify-between gap-1.5">
          {/* Previous Ticket */}
          <button
            onClick={() => prevTicket && router.push(`/admin/tickets/${prevTicket.id}`)}
            disabled={!prevTicket}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              prevTicket
                ? 'bg-apple-gray-100 text-apple-gray-600 active:bg-apple-gray-200'
                : 'bg-apple-gray-50 text-apple-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Quick Actions */}
          <div className="flex gap-1 flex-1 justify-center">
            {ticket.status !== 'resolved' && (
              <button
                onClick={() => handleStatusChange('resolved')}
                className="px-3 py-2 rounded-lg bg-green-500 text-white text-sm font-medium active:bg-green-600"
              >
                ✓ Lösen
              </button>
            )}
            {ticket.status !== 'closed' && (
              <button
                onClick={() => handleStatusChange('closed')}
                className="px-3 py-2 rounded-lg bg-gray-500 text-white text-sm font-medium active:bg-gray-600"
              >
                Schließen
              </button>
            )}
          </div>
          
          {/* More Menu Button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              showMoreMenu
                ? 'bg-brand text-white'
                : 'bg-apple-gray-100 text-apple-gray-600 active:bg-apple-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* Next Ticket */}
          <button
            onClick={() => nextTicket && router.push(`/admin/tickets/${nextTicket.id}`)}
            disabled={!nextTicket}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              nextTicket
                ? 'bg-apple-gray-100 text-apple-gray-600 active:bg-apple-gray-200'
                : 'bg-apple-gray-50 text-apple-gray-300'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile: FAB with Speed Dial - OUTSIDE animate container! */}
      <div className="md:hidden fixed bottom-28 right-4 z-40">
        {/* Speed Dial Options */}
        {showFabMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setShowFabMenu(false)}
            />
            {/* Options */}
            <div className="absolute bottom-16 right-0 flex flex-col gap-3 items-end z-40">
              {/* Antworten */}
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  const replyArea = document.getElementById('reply-area');
                  if (replyArea) {
                    replyArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => {
                      const editor = replyArea.querySelector('[contenteditable="true"]');
                      if (editor) (editor as HTMLElement).focus();
                    }, 500);
                  }
                }}
                className="flex items-center gap-2 pl-3 pr-4 py-2 bg-white rounded-full shadow-lg border border-apple-gray-200 text-apple-gray-600 active:bg-apple-gray-100"
              >
                <div className="w-10 h-10 bg-brand rounded-full flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Antworten</span>
              </button>
              
              {/* KI-Assistent */}
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setShowMobileAiModal(true);
                }}
                className="flex items-center gap-2 pl-3 pr-4 py-2 bg-white rounded-full shadow-lg border border-apple-gray-200 text-apple-gray-600 active:bg-apple-gray-100"
              >
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">KI-Assistent</span>
              </button>
              
              {/* Notiz hinzufügen - Opens mobile notes modal */}
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setShowMobileNotesModal(true);
                }}
                className="flex items-center gap-2 pl-3 pr-4 py-2 bg-white rounded-full shadow-lg border border-apple-gray-200 text-apple-gray-600 active:bg-apple-gray-100"
              >
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Notiz</span>
              </button>
              
              {/* Schnellantworten */}
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  setShowMobileQuickRepliesModal(true);
                }}
                className="flex items-center gap-2 pl-3 pr-4 py-2 bg-white rounded-full shadow-lg border border-apple-gray-200 text-apple-gray-600 active:bg-apple-gray-100"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Schnellantwort</span>
              </button>
            </div>
          </>
        )}
        
        {/* Main FAB Button */}
        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all active:scale-95 ${
            showFabMenu ? 'bg-apple-gray-600 rotate-45' : 'bg-brand hover:bg-brand-dark'
          }`}
        >
          <svg className="w-6 h-6 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="animate-fade-in pb-24 md:pb-0 pt-16 md:pt-0">

      {/* Mobile: Floating Button to open sidebar */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="xl:hidden fixed bottom-28 left-4 z-40 w-12 h-12 bg-white rounded-full shadow-lg border border-apple-gray-200 flex items-center justify-center text-apple-gray-500 hover:text-brand hover:shadow-xl transition-all"
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
        <div className="flex items-center gap-3 self-start lg:self-center">
          <button
            onClick={async () => {
              const blockSender = confirm(`Ticket als Spam markieren?\n\nKlicke OK um auch den Absender (${ticket.customerEmail}) für zukünftige E-Mails zu blockieren.`);
              
              if (blockSender) {
                try {
                  await fetch('/api/admin/spam', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      email: ticket.customerEmail,
                      markExistingTickets: true 
                    }),
                  });
                  alert(`${ticket.customerEmail} wurde zur Spam-Liste hinzugefügt.`);
                } catch (e) {
                  console.error('Failed to add to spam list:', e);
                }
              }
              handleStatusChange('closed');
            }}
            className="text-sm text-orange-500 hover:text-orange-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Spam
          </button>
          <button
            onClick={handleDelete}
            className="text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            Ticket löschen
          </button>
        </div>
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
                        dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content, msg.channel) }}
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
                      {/* Forward Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setForwardMessage(msg);
                          setShowForwardModal(true);
                        }}
                        className={`mt-2 text-xs flex items-center gap-1 ${
                          msg.sender === "admin"
                            ? "text-white/60 hover:text-white"
                            : "text-apple-gray-400 hover:text-apple-gray-600"
                        }`}
                        title="Nachricht weiterleiten"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        Weiterleiten
                      </button>
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
            <div 
              id="reply-area" 
              className={`relative border-t border-apple-gray-100 p-4 transition-colors ${isDragging ? 'bg-brand/5 border-brand border-2 border-dashed' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-brand/10 rounded-lg z-10 pointer-events-none">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-brand mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-brand font-medium">Datei hier ablegen</p>
                  </div>
                </div>
              )}
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

                {/* Quick Reply Templates - Mobile optimized */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-apple-gray-400 w-full md:w-auto">Schnellantwort:</span>
                  {(quickReplies.length > 0 ? quickReplies : defaultQuickReplies).map((qr) => (
                    <button
                      key={qr.id}
                      type="button"
                      onClick={() => setReplyContent(qr.content)}
                      className="px-3 py-1.5 text-xs font-medium bg-apple-gray-100 hover:bg-apple-gray-200 text-apple-gray-600 rounded-full transition-colors active:bg-apple-gray-300"
                    >
                      {qr.title}
                    </button>
                  ))}
                </div>

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

                {/* Delivery Channel Indicator */}
                <div className="flex items-center gap-2 mt-3 mb-2 text-sm">
                  <span className="text-apple-gray-400">Versand via:</span>
                  {ticket?.channel === 'whatsapp' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </span>
                  ) : !sendEmail ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Nur Live-Chat
                    </span>
                  ) : customerPresence.online ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Live-Chat
                      <span className="text-emerald-500 text-xs">(Kunde online)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      E-Mail
                      <span className="text-amber-500 text-xs">(Kunde offline)</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-3">
                  <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    {/* Only show email checkbox for non-WhatsApp tickets */}
                    {ticket?.channel !== 'whatsapp' && (
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
                    )}

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

          {/* AI Auto-Reply Toggle */}
          <div className={`rounded-apple-xl shadow-card border p-5 ${
            ticket.aiStatus === 'active'
              ? 'bg-purple-50 border-purple-200'
              : ticket.aiStatus === 'escalated'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-white border-apple-gray-100'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm font-semibold uppercase tracking-wider flex items-center gap-2 ${
                ticket.aiStatus === 'active'
                  ? 'text-purple-700'
                  : ticket.aiStatus === 'escalated'
                    ? 'text-amber-700'
                    : 'text-apple-gray-400'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                KI-Assistent
              </h3>
              {ticket.aiStatus === 'escalated' && (
                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Eskaliert</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-sm ${
                ticket.aiStatus === 'active'
                  ? 'text-purple-600'
                  : ticket.aiStatus === 'escalated'
                    ? 'text-amber-600'
                    : 'text-apple-gray-500'
              }`}>
                {ticket.aiStatus === 'active'
                  ? 'KI bearbeitet Nachrichten'
                  : ticket.aiStatus === 'escalated'
                    ? 'Kunde wünscht Mitarbeiter'
                    : 'KI deaktiviert'}
              </span>

              <button
                onClick={handleAIStatusToggle}
                disabled={aiStatusLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  ticket.aiStatus === 'active'
                    ? 'bg-purple-600 focus:ring-purple-500'
                    : 'bg-gray-300 focus:ring-gray-400'
                } ${aiStatusLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    ticket.aiStatus === 'active' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {ticket.aiStatus === 'escalated' && (
              <p className="text-xs text-amber-600 mt-2">
                Der Kunde hat um einen menschlichen Mitarbeiter gebeten.
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const isSelected = ticket.tags?.includes(tag.id);
                const colorClasses: Record<string, string> = {
                  red: isSelected ? 'bg-red-100 text-red-700 ring-red-500' : 'bg-gray-50 text-gray-500 hover:bg-red-50',
                  yellow: isSelected ? 'bg-yellow-100 text-yellow-700 ring-yellow-500' : 'bg-gray-50 text-gray-500 hover:bg-yellow-50',
                  orange: isSelected ? 'bg-orange-100 text-orange-700 ring-orange-500' : 'bg-gray-50 text-gray-500 hover:bg-orange-50',
                  purple: isSelected ? 'bg-purple-100 text-purple-700 ring-purple-500' : 'bg-gray-50 text-gray-500 hover:bg-purple-50',
                  green: isSelected ? 'bg-green-100 text-green-700 ring-green-500' : 'bg-gray-50 text-gray-500 hover:bg-green-50',
                  blue: isSelected ? 'bg-blue-100 text-blue-700 ring-blue-500' : 'bg-gray-50 text-gray-500 hover:bg-blue-50',
                  teal: isSelected ? 'bg-teal-100 text-teal-700 ring-teal-500' : 'bg-gray-50 text-gray-500 hover:bg-teal-50',
                  gray: isSelected ? 'bg-gray-200 text-gray-700 ring-gray-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
                };
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    disabled={savingTags}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      isSelected ? 'ring-2' : ''
                    } ${colorClasses[tag.color] || colorClasses.gray} disabled:opacity-50`}
                  >
                    {tag.name}
                  </button>
                );
              })}
              {availableTags.length === 0 && (
                <p className="text-sm text-apple-gray-400">Keine Tags verfügbar</p>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          <div id="notes-section" className="bg-yellow-50 rounded-apple-xl shadow-card border border-yellow-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-yellow-700 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Interne Notizen
              </h3>
              <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">Nur für Admins</span>
            </div>

            {/* Add Note */}
            <div className="mb-3">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Notiz hinzufügen..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-yellow-300 bg-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 outline-none resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNoteContent.trim() || savingNote}
                className="mt-2 w-full px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingNote ? 'Speichern...' : 'Notiz hinzufügen'}
              </button>
            </div>

            {/* Notes List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {ticketNotes.length === 0 ? (
                <p className="text-sm text-yellow-600 text-center py-2">Noch keine Notizen</p>
              ) : (
                ticketNotes.map((note) => (
                  <div key={note.id} className="bg-white rounded-lg p-3 border border-yellow-200">
                    <p className="text-sm text-apple-gray-600 whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-yellow-100">
                      <span className="text-xs text-apple-gray-400">
                        {new Date(note.createdAt).toLocaleString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
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
          <div id="relevant-articles" className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider">Passende Artikel</h3>
              <button
                onClick={() => setShowArticleSearch(!showArticleSearch)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${showArticleSearch ? 'bg-brand text-white' : 'bg-apple-gray-100 text-apple-gray-400 hover:bg-apple-gray-200'}`}
                title="Artikel suchen"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>

            {/* Article Search Input */}
            {showArticleSearch && (
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={articleSearchQuery}
                    onChange={(e) => handleArticleSearch(e.target.value)}
                    placeholder="Artikel durchsuchen..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-apple-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {articleSearching && (
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-apple-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </div>

                {/* Search Results */}
                {articleSearchResults.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {articleSearchResults.map((article) => (
                      <div
                        key={article.id}
                        className="group bg-blue-50 hover:bg-blue-100 rounded-lg p-2.5 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-apple-gray-600 line-clamp-1">
                              {article.title}
                            </p>
                            {article.excerpt && (
                              <p className="text-xs text-apple-gray-400 mt-0.5 line-clamp-2">
                                {article.excerpt}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleInsertArticle(article)}
                              className="w-7 h-7 rounded-md bg-white/80 text-apple-gray-500 hover:bg-brand hover:text-white flex items-center justify-center transition-all"
                              title="In Antwort einfügen"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedArticle(article);
                                setShowShareModal(true);
                              }}
                              className="w-7 h-7 rounded-md bg-white/80 text-apple-gray-500 hover:bg-brand hover:text-white flex items-center justify-center transition-all"
                              title="Mit Kunde teilen"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {articleSearchQuery.length >= 2 && articleSearchResults.length === 0 && !articleSearching && (
                  <p className="text-xs text-apple-gray-400 text-center mt-2">
                    Keine Artikel gefunden
                  </p>
                )}
              </div>
            )}

            {/* Automatic suggestions */}
            {!showArticleSearch && (articlesLoading ? (
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
            ))}
          </div>

          {/* Rating Request Button */}
          {ticket.status === 'closed' && (
            <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-apple-gray-400 uppercase tracking-wider">Kundenbewertung</h3>
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>

              {ticketRating ? (
                <div className="text-center py-2">
                  <div className="flex justify-center gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-xl ${star <= ticketRating.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-apple-gray-500">{ticketRating.rating}/5 Sterne</p>
                  {ticketRating.comment && (
                    <p className="text-xs text-apple-gray-400 mt-2 italic">&quot;{ticketRating.comment}&quot;</p>
                  )}
                </div>
              ) : ratingRequested ? (
                <div className="text-center py-2">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-apple-gray-500">Bewertungsanfrage gesendet</p>
                </div>
              ) : (
                <button
                  onClick={handleRequestRating}
                  disabled={requestingRating}
                  className="w-full py-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requestingRating ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Bewertung anfordern
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
        </div>
        </div>
      </div>

      {/* Custom AI Instruction Modal moved to end of file - OUTSIDE animate-fade-in! */}

      {/* Share Article Modal */}
      {showShareModal && selectedArticle && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            onClick={() => {
              setShowShareModal(false);
              setSelectedArticle(null);
              setShareChannel('auto');
              setShareCustomText("");
            }}
          />
          <div className="fixed inset-x-0 bottom-16 max-h-[75vh] sm:bottom-auto sm:inset-x-4 sm:top-[10vh] sm:mx-auto sm:max-w-md z-[100]">
            <div className="bg-white rounded-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[75vh]">
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
                        hilfe.fit-inn-trier.de/articles/{selectedArticle.id}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Custom Text */}
                <div className="mb-5">
                  <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">Eigener Text (optional)</p>
                  <textarea
                    value={shareCustomText}
                    onChange={(e) => setShareCustomText(e.target.value)}
                    placeholder="Füge hier einen eigenen Text hinzu, der zusammen mit dem Artikel gesendet wird..."
                    className="w-full p-3 border border-apple-gray-200 rounded-xl text-sm text-apple-gray-600 placeholder:text-apple-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                    rows={3}
                  />
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
                    {ticket && ticket.channel === 'whatsapp' && (
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

      {/* Forward Message Modal */}
      {showForwardModal && forwardMessage && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            onClick={() => {
              setShowForwardModal(false);
              setForwardMessage(null);
              setForwardEmail('');
              setForwardName('');
              setForwardNote('');
            }}
          />
          <div className="fixed inset-x-0 bottom-16 max-h-[75vh] sm:bottom-auto sm:inset-x-4 sm:top-[10vh] sm:mx-auto sm:max-w-xl z-[100]">
            <div className="bg-white rounded-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[75vh]">
              {/* Header */}
              <div className="border-b border-apple-gray-100 flex-shrink-0">
                <div className="flex justify-center pt-3 sm:hidden">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-brand flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">Nachricht weiterleiten</h3>
                      <p className="text-xs text-apple-gray-400">An externe E-Mail senden</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForwardModal(false);
                      setForwardMessage(null);
                      setForwardEmail('');
                      setForwardName('');
                      setForwardNote('');
                    }}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-4 pb-24">
                {/* Original message preview */}
                <div className="bg-apple-gray-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-apple-gray-400 mb-1">Originalnachricht von {forwardMessage.senderName}</p>
                  <p className="text-sm text-apple-gray-600 line-clamp-3">
                    {String(forwardMessage.content || '').replace(/<[^>]*>/g, '').substring(0, 200)}...
                  </p>
                </div>

                {/* Email input */}
                <div>
                  <label className="block text-sm font-medium text-apple-gray-600 mb-1.5">
                    E-Mail-Adresse *
                  </label>
                  <input
                    type="email"
                    value={forwardEmail}
                    onChange={(e) => setForwardEmail(e.target.value)}
                    placeholder="empfaenger@example.com"
                    className="w-full px-4 py-2.5 border border-apple-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>

                {/* Name input */}
                <div>
                  <label className="block text-sm font-medium text-apple-gray-600 mb-1.5">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={forwardName}
                    onChange={(e) => setForwardName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full px-4 py-2.5 border border-apple-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>

                {/* Note input */}
                <div>
                  <label className="block text-sm font-medium text-apple-gray-600 mb-1.5">
                    Anmerkung (optional)
                  </label>
                  <textarea
                    value={forwardNote}
                    onChange={(e) => setForwardNote(e.target.value)}
                    placeholder="Zusätzliche Nachricht an den Empfänger..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-apple-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                  />
                </div>

                {/* Reply to customer checkbox */}
                <label className="flex items-center gap-3 p-3 bg-apple-gray-50 rounded-xl cursor-pointer hover:bg-apple-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={forwardReplyToCustomer}
                    onChange={(e) => setForwardReplyToCustomer(e.target.checked)}
                    className="w-5 h-5 rounded border-apple-gray-300 text-brand focus:ring-brand/20"
                  />
                  <div>
                    <span className="block text-sm font-medium text-apple-gray-600">Antwort an Kunden</span>
                    <span className="block text-xs text-apple-gray-400">Empfänger antwortet direkt an {forwardMessage?.senderEmail}</span>
                  </div>
                </label>

                {/* Submit button */}
                <button
                  onClick={handleForwardMessage}
                  disabled={!forwardEmail || forwarding}
                  className="w-full py-3 bg-brand text-white rounded-xl font-semibold hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {forwarding ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Weiterleiten
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Audio element for notification */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/notification.mp3" type="audio/mpeg" />
      </audio>
      </div>

      {/* Mobile Notes Modal - OUTSIDE animate-fade-in container! */}
      {showMobileNotesModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            onClick={() => setShowMobileNotesModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] z-[100]">
            <div className="bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="border-b border-apple-gray-100 flex-shrink-0">
                <div className="flex justify-center pt-3">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">Interne Notizen</h3>
                      <p className="text-xs text-apple-gray-400">Nur für Admins sichtbar</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMobileNotesModal(false)}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Add Note Input */}
              <div className="p-4 border-b border-apple-gray-100 bg-amber-50/50 flex-shrink-0">
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Neue Notiz hinzufügen..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-amber-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
                />
                <button
                  onClick={async () => {
                    await handleAddNote();
                  }}
                  disabled={!newNoteContent.trim() || savingNote}
                  className="mt-3 w-full px-4 py-3 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {savingNote ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Speichern...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Notiz hinzufügen
                    </>
                  )}
                </button>
              </div>

              {/* Notes List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-8">
                {ticketNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-apple-gray-500 font-medium">Noch keine Notizen</p>
                    <p className="text-sm text-apple-gray-400 mt-1">Füge die erste Notiz hinzu</p>
                  </div>
                ) : (
                  ticketNotes.map((note) => (
                    <div key={note.id} className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm">
                      <p className="text-sm text-apple-gray-600 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-50">
                        <span className="text-xs text-apple-gray-400">
                          {new Date(note.createdAt).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm('Notiz wirklich löschen?')) {
                              handleDeleteNote(note.id);
                            }
                          }}
                          className="text-xs text-red-500 hover:text-red-600 font-medium"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile AI Modal - OUTSIDE animate-fade-in container! */}
      {showMobileAiModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            onClick={() => setShowMobileAiModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[100]">
            <div className="bg-white rounded-t-3xl shadow-2xl">
              {/* Header */}
              <div className="border-b border-apple-gray-100">
                <div className="flex justify-center pt-3">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">KI-Assistent</h3>
                      <p className="text-xs text-apple-gray-400">Antworten generieren & bearbeiten</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMobileAiModal(false)}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* AI Options */}
              <div className="p-4 space-y-2 pb-8">
                {/* Generate */}
                <button
                  onClick={() => { setShowMobileAiModal(false); handleAiGenerate(); }}
                  disabled={aiLoading}
                  className="w-full flex items-center gap-3 p-4 bg-purple-50 rounded-xl text-left active:bg-purple-100 disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-purple-900">Antwort generieren</span>
                    <span className="block text-xs text-purple-600">KI erstellt eine passende Antwort</span>
                  </div>
                </button>

                {/* Correct */}
                <button
                  onClick={() => { setShowMobileAiModal(false); handleAiCorrect(); }}
                  disabled={aiLoading || !replyContent.trim()}
                  className="w-full flex items-center gap-3 p-4 bg-blue-50 rounded-xl text-left active:bg-blue-100 disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-blue-900">Korrigieren</span>
                    <span className="block text-xs text-blue-600">Rechtschreibung & Grammatik prüfen</span>
                  </div>
                </button>

                {/* Rewrite options */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => { setShowMobileAiModal(false); handleAiRewrite("formal"); }}
                    disabled={aiLoading || !replyContent.trim()}
                    className="flex items-center gap-2 p-3 bg-apple-gray-50 rounded-xl text-left active:bg-apple-gray-100 disabled:opacity-50"
                  >
                    <span className="text-lg">👔</span>
                    <span className="text-sm font-medium text-apple-gray-600">Formeller</span>
                  </button>
                  <button
                    onClick={() => { setShowMobileAiModal(false); handleAiRewrite("friendly"); }}
                    disabled={aiLoading || !replyContent.trim()}
                    className="flex items-center gap-2 p-3 bg-apple-gray-50 rounded-xl text-left active:bg-apple-gray-100 disabled:opacity-50"
                  >
                    <span className="text-lg">😊</span>
                    <span className="text-sm font-medium text-apple-gray-600">Freundlicher</span>
                  </button>
                  <button
                    onClick={() => { setShowMobileAiModal(false); handleAiRewrite("short"); }}
                    disabled={aiLoading || !replyContent.trim()}
                    className="flex items-center gap-2 p-3 bg-apple-gray-50 rounded-xl text-left active:bg-apple-gray-100 disabled:opacity-50"
                  >
                    <span className="text-lg">✂️</span>
                    <span className="text-sm font-medium text-apple-gray-600">Kürzer</span>
                  </button>
                  <button
                    onClick={() => { setShowMobileAiModal(false); handleAiRewrite("detailed"); }}
                    disabled={aiLoading || !replyContent.trim()}
                    className="flex items-center gap-2 p-3 bg-apple-gray-50 rounded-xl text-left active:bg-apple-gray-100 disabled:opacity-50"
                  >
                    <span className="text-lg">📝</span>
                    <span className="text-sm font-medium text-apple-gray-600">Ausführlicher</span>
                  </button>
                </div>

                {/* Custom instruction */}
                <button
                  onClick={() => { setShowMobileAiModal(false); setShowCustomModal(true); }}
                  disabled={aiLoading}
                  className="w-full flex items-center gap-3 p-4 bg-green-50 rounded-xl text-left active:bg-green-100 disabled:opacity-50 mt-2"
                >
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-green-900">Eigene Anweisung</span>
                    <span className="block text-xs text-green-600">KI nach deinen Wünschen steuern</span>
                  </div>
                </button>

                {aiLoading && (
                  <div className="flex items-center justify-center gap-2 py-4 text-purple-600">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium">KI arbeitet...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile Quick Replies Modal - OUTSIDE animate-fade-in container! */}
      {showMobileQuickRepliesModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            onClick={() => setShowMobileQuickRepliesModal(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[70vh] z-[100]">
            <div className="bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[70vh]">
              {/* Header */}
              <div className="border-b border-apple-gray-100 flex-shrink-0">
                <div className="flex justify-center pt-3">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">Schnellantworten</h3>
                      <p className="text-xs text-apple-gray-400">Vordefinierte Antworten einfügen</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMobileQuickRepliesModal(false)}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Quick Replies List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-8">
                {(quickReplies.length > 0 ? quickReplies : defaultQuickReplies).map((qr) => (
                  <button
                    key={qr.id}
                    onClick={() => {
                      setReplyContent(qr.content);
                      setShowMobileQuickRepliesModal(false);
                      // Scroll to reply area
                      const replyArea = document.getElementById('reply-area');
                      if (replyArea) {
                        setTimeout(() => {
                          replyArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 100);
                      }
                    }}
                    className="w-full p-4 bg-green-50 rounded-xl text-left active:bg-green-100 border border-green-100"
                  >
                    <span className="block text-sm font-semibold text-green-900 mb-1">{qr.title}</span>
                    <span className="block text-sm text-green-700 line-clamp-2">{qr.content}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile More Menu Modal - OUTSIDE animate-fade-in container! */}
      {showMoreMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[100]">
            <div className="bg-white rounded-t-3xl shadow-2xl">
              {/* Header */}
              <div className="border-b border-apple-gray-100">
                <div className="flex justify-center pt-3">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-apple-gray-400 to-apple-gray-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">Weitere Optionen</h3>
                      <p className="text-xs text-apple-gray-400">Ticket-Aktionen</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMoreMenu(false)}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Menu Options */}
              <div className="p-4 space-y-2 pb-8">
                {/* Artikel suchen */}
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowMobileArticlesModal(true);
                  }}
                  className="w-full flex items-center gap-3 p-4 bg-blue-50 rounded-xl text-left active:bg-blue-100"
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-blue-900">Artikel suchen</span>
                    <span className="block text-xs text-blue-600">Hilfe-Artikel durchsuchen</span>
                  </div>
                </button>

                {/* Weiterleiten */}
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    const lastMsg = messages[messages.length - 1];
                    if (lastMsg) {
                      setForwardMessage(lastMsg);
                      setShowForwardModal(true);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 bg-purple-50 rounded-xl text-left active:bg-purple-100"
                >
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-purple-900">Per E-Mail weiterleiten</span>
                    <span className="block text-xs text-purple-600">Nachricht an externe E-Mail senden</span>
                  </div>
                </button>

                {/* Als Spam markieren */}
                <button
                  onClick={async () => {
                    setShowMoreMenu(false);
                    const blockSender = confirm(`Ticket als Spam markieren?\n\nKlicke OK um auch den Absender (${ticket.customerEmail}) für zukünftige E-Mails zu blockieren.`);
                    
                    if (blockSender) {
                      try {
                        // Add sender to spam blacklist
                        await fetch('/api/admin/spam', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            email: ticket.customerEmail,
                            markExistingTickets: true 
                          }),
                        });
                        alert(`${ticket.customerEmail} wurde zur Spam-Liste hinzugefügt. Alle Tickets von diesem Absender wurden geschlossen.`);
                      } catch (e) {
                        console.error('Failed to add to spam list:', e);
                      }
                    }
                    handleStatusChange('closed');
                  }}
                  className="w-full flex items-center gap-3 p-4 bg-orange-50 rounded-xl text-left active:bg-orange-100"
                >
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-orange-900">Absender als Spam blockieren</span>
                    <span className="block text-xs text-orange-600">Ticket schließen & Absender blockieren</span>
                  </div>
                </button>

                {/* Ticket löschen */}
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    if (confirm('Ticket wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
                      // Delete logic here
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 bg-red-50 rounded-xl text-left active:bg-red-100"
                >
                  <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-red-900">Ticket löschen</span>
                    <span className="block text-xs text-red-600">Unwiderruflich entfernen</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile Articles Search Modal - OUTSIDE animate-fade-in container! */}
      {showMobileArticlesModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            onClick={() => { setShowMobileArticlesModal(false); setArticleSearchQuery(""); }}
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] z-[100]">
            <div className="bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="border-b border-apple-gray-100 flex-shrink-0">
                <div className="flex justify-center pt-3">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">Hilfe-Artikel</h3>
                      <p className="text-xs text-apple-gray-400">Artikel suchen und teilen</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowMobileArticlesModal(false); setArticleSearchQuery(""); }}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500 hover:bg-apple-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div className="p-4 border-b border-apple-gray-100 bg-blue-50/50 flex-shrink-0">
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={articleSearchQuery}
                    onChange={(e) => setArticleSearchQuery(e.target.value)}
                    placeholder="Artikel durchsuchen..."
                    className="w-full pl-12 pr-4 py-3 text-sm rounded-xl border border-blue-200 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Articles List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-8">
                {relevantArticles.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-apple-gray-500 font-medium">Keine Artikel gefunden</p>
                    <p className="text-sm text-apple-gray-400 mt-1">Versuche eine andere Suche</p>
                  </div>
                ) : (
                  relevantArticles
                    .filter(article => 
                      !articleSearchQuery || 
                      article.title.toLowerCase().includes(articleSearchQuery.toLowerCase())
                    )
                    .map((article) => (
                      <div key={article.id} className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-apple-gray-600 line-clamp-2">{article.title}</p>
                            {article.category && (
                              <span className="text-xs text-apple-gray-400">{article.category}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              setSelectedArticle(article);
                              setShowShareModal(true);
                              setShowMobileArticlesModal(false);
                            }}
                            className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg active:bg-blue-600"
                          >
                            An Kunden teilen
                          </button>
                          <a
                            href={`/portal/articles/${article.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-apple-gray-100 text-apple-gray-600 text-sm font-medium rounded-lg active:bg-apple-gray-200"
                          >
                            Ansehen
                          </a>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom AI Instruction Modal - OUTSIDE animate-fade-in container! */}
      {showCustomModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
          />
          <div className="fixed inset-x-0 bottom-0 z-[100]">
            <div className="bg-white rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="border-b border-apple-gray-100 flex-shrink-0">
                <div className="flex justify-center pt-3">
                  <div className="w-12 h-1.5 bg-apple-gray-200 rounded-full"></div>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-apple-gray-600">KI-Assistent</h3>
                      <p className="text-xs text-apple-gray-400">Eigene Anweisung</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
                    className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center text-apple-gray-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
                {/* Context Preview */}
                {messages.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">Kontext</p>
                    <div className="bg-apple-gray-50 rounded-xl p-3 max-h-24 overflow-y-auto">
                      {messages.slice(-2).map((msg, idx) => (
                        <p key={idx} className="text-xs text-apple-gray-500 line-clamp-2">
                          {String(msg.content || '').replace(/<[^>]*>/g, '').substring(0, 80)}...
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div>
                  <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">Schnellaktionen</p>
                  <div className="flex flex-wrap gap-2">
                    {["😊 Freundlich", "🙏 Entschuldigung", "➡️ Weiterleitung", "⏳ Geduld"].map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCustomInstruction(action.split(' ')[1])}
                        className="px-3 py-2 text-sm rounded-full border border-apple-gray-200 text-apple-gray-600 active:bg-apple-gray-100"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Input */}
                <div>
                  <p className="text-xs font-medium text-apple-gray-400 uppercase tracking-wider mb-2">
                    {replyContent.trim() ? "Text bearbeiten" : "Neue Antwort"}
                  </p>
                  <textarea
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    placeholder="Beschreibe, was du möchtest..."
                    rows={3}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-apple-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowCustomModal(false); setCustomInstruction(""); }}
                    className="flex-1 px-4 py-3 text-apple-gray-600 font-medium rounded-xl border border-apple-gray-200 active:bg-apple-gray-100"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => { handleAiCustom(); setShowCustomModal(false); }}
                    disabled={!customInstruction.trim()}
                    className="flex-[2] px-4 py-3 bg-purple-500 text-white font-semibold rounded-xl active:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {replyContent.trim() ? "Bearbeiten" : "Generieren"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
