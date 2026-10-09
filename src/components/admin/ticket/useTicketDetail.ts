"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "../ui/Toast";
import { snoozeTicket } from "../ticketApi";
import type { Attachment, Ticket, TicketMessage, TicketNote, TicketTag } from "./types";

export type LeaveReason = "resolved" | "closed" | "later" | "deleted";

/**
 * Gesamte Logik der Ticket-Ansicht (Laden, Polling, Antworten, Anhänge, KI, Weiterleiten, Teilen, Notizen, Tags …).
 * Aus der früheren 4.113-Zeilen-Seite übernommen; die Oberfläche ist in eigene Komponenten aufgeteilt.
 */
export function useTicketDetail(id: string, opts: { onLeave: (reason: LeaveReason) => void }) {
  const toast = useToast();
  const notify = (text: string, tone: "ok" | "error" = "error") => toast.show({ text, tone: tone === "error" ? "error" : undefined }, tone === "error" ? 7000 : 4000);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const prevMessagesCountRef = useRef(0);

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
  const [forwardMessage, setForwardMessage] = useState<TicketMessage | null>(null);
  const [forwardEmail, setForwardEmail] = useState('');
  const [forwardName, setForwardName] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [forwardReplyToCustomer, setForwardReplyToCustomer] = useState(true);
  const [forwarding, setForwarding] = useState(false);

  // Editable email state
  const [editingEmail, setEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

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
    } catch (e) {
      const err = e as Error;
      setError(err.message);
    } finally {
      setLoading(false);
      // Mark initial load as complete to enable auto-scroll for new messages only
      setInitialLoadDone(true);
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
    loadTags();
    loadNotes();

    // Auto-refresh messages every 5 seconds for real-time status updates
    const interval = setInterval(async () => {
      // Skip polling while the tab is hidden (saves bandwidth/battery).
      if (typeof document !== 'undefined' && document.hidden) return;
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

  // Scroll state for "scroll to top" button
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Only scroll to top on INITIAL load, not on every update
  useEffect(() => {
    if (messages.length > 0 && prevMessagesCountRef.current === 0) {
      // Initial load - scroll to top once
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = 0;
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages]);

  // Track scroll position to show/hide "scroll to top" button
  const handleMessagesScroll = () => {
    if (messagesContainerRef.current) {
      setShowScrollTop(messagesContainerRef.current.scrollTop > 100);
    }
  };

  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      checkCustomerPresence();
    }, 10000); // Check every 10s - optimized, paused while tab hidden

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

    // Check typing indicator every 3s - optimized, paused while tab hidden
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      checkTyping();
    }, 3000);

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
      setTicket(prev => (prev ? { ...prev, ...updatedTicket } : updatedTicket));

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

      // Erledigt/Geschlossen: Ansicht verlassen (Liste bzw. nächstes Ticket) – Entscheidung liegt bei der Oberfläche
      if (newStatus === 'closed' || newStatus === 'resolved') {
        opts.onLeave(newStatus);
      }
    } catch (e) {
      const err = e as Error;
      notify(err.message, 'error');
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
      setTicket(prev => (prev ? { ...prev, ...updatedTicket } : updatedTicket));
    } catch (e) {
      const err = e as Error;
      notify(err.message, 'error');
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
      notify('Nachricht wurde weitergeleitet', 'ok');
    } catch (e) {
      const err = e as Error;
      notify(err.message, 'error');
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
      notify('Bewertungsanfrage wurde gesendet', 'ok');
    } catch (e) {
      const err = e as Error;
      notify(err.message, 'error');
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
    } catch (e) {
      const err = e as Error;
      notify(err.message, 'error');
    } finally {
      setAiStatusLoading(false);
    }
  };

  // Handle saving edited customer email
  const handleSaveEmail = async () => {
    if (!editedEmail.trim() || !editedEmail.includes('@')) {
      notify('Bitte gib eine gültige E-Mail-Adresse ein', 'error');
      return;
    }
    
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail: editedEmail.trim().toLowerCase() })
      });
      
      if (!res.ok) throw new Error('Fehler beim Speichern');
      
      setTicket(prev => prev ? { ...prev, customerEmail: editedEmail.trim().toLowerCase() } : null);
      setEditingEmail(false);
    } catch (e) {
      const err = e as Error;
      notify('Fehler: ' + err.message, 'error');
    } finally {
      setSavingEmail(false);
    }
  };

  // thenDone: „Senden & erledigt“ – nach erfolgreichem Versand auf „Gelöst“ setzen
  const handleSendReply = async (e?: React.FormEvent, thenDone = false): Promise<boolean> => {
    e?.preventDefault();
    if (!replyContent.trim() || !ticket) return false;

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
        notify(`Nachricht gespeichert, aber E-Mail-Versand fehlgeschlagen: ${data.emailError}`, 'error');
      }

      setMessages([...messages, data.message || data]);
      setReplyContent("");
      setAttachments([]);
      setLenaPrefilled(false);
      if (thenDone) await handleStatusChange('resolved');
      return true;
    } catch (e) {
      const err = e as Error;
      notify(err.message, 'error');
      return false;
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
          notify(`Fehler beim Hochladen von ${file.name}: ${data.message}`, 'error');
        }
      }
    } catch (err) {
      notify('Fehler beim Hochladen', 'error');
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
          notify(`Fehler beim Hochladen von ${file.name}: ${data.message}`, 'error');
        }
      }
    } catch (err) {
      notify('Fehler beim Hochladen', 'error');
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
      notify("Fehler bei der KI-Generierung", 'error');
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
    } catch (e) {
      const err = e as Error;
      notify("Fehler bei der KI-Korrektur: " + (err.message || "Unbekannter Fehler"), 'error');
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
      notify("Fehler beim Umschreiben", 'error');
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
    } catch (e) {
      const err = e as Error;
      notify("Fehler bei der KI-Bearbeitung: " + (err.message || "Unbekannter Fehler"), 'error');
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
    } catch (e) {
      const err = e as Error;
      notify(err.message, 'error');
    } finally {
      setSharingArticle(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: "DELETE",
        credentials: 'same-origin',
      });

      if (!res.ok) throw new Error("Fehler beim Löschen");

      opts.onLeave('deleted');
    } catch (e) {
      const err = e as Error;
      notify(err.message, 'error');
    }
  };

  // ---------- Neu: Lena-Vorschlag (vorausgefüllt, nie automatisch gesendet) ----------
  const [lenaPrefilled, setLenaPrefilled] = useState(false);
  const [lenaAuto, setLenaAuto] = useState(true);
  const lenaRequestedFor = useRef<string | null>(null);

  useEffect(() => {
    setLenaAuto(localStorage.getItem('admin:lena-auto') !== 'false');
  }, []);

  const toggleLenaAuto = () => {
    const next = !lenaAuto;
    setLenaAuto(next);
    localStorage.setItem('admin:lena-auto', String(next));
  };

  // Vorschlag holen und – falls das Antwortfeld leer ist – dort vorausfüllen
  const requestLena = async (force = false) => {
    if (!ticket || messages.length === 0) return;
    const lastCustomer = [...messages].reverse().find(m => m.sender === 'customer');
    const key = `lena:${id}:${lastCustomer?.id || 'none'}`;
    setAiLoading(true);
    try {
      let text: string | null = null;
      if (!force) {
        try { text = sessionStorage.getItem(key); } catch { /* ignore */ }
      }
      if (!text) {
        const res = await fetch('/api/admin/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ticket_reply',
            customerMessage: lastCustomer?.content || ticket.subject,
            customerName: ticket.customerName,
            ticketSubject: ticket.subject,
          }),
        });
        if (!res.ok) throw new Error('KI-Fehler');
        text = (await res.json()).content as string;
        try { sessionStorage.setItem(key, text); } catch { /* ignore */ }
      }
      setReplyContent(text);
      setLenaPrefilled(true);
    } catch {
      notify('Lena konnte gerade keinen Vorschlag machen.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // Automatisch nur bei offener, unbeantworteter Kundenanfrage, leerem Feld und wenn nicht schon die KI antwortet
  const lastMsg = messages[messages.length - 1];
  useEffect(() => {
    if (!lenaAuto || loading || !ticket || !lastMsg) return;
    if (lastMsg.sender !== 'customer') return;
    if (ticket.status === 'resolved' || ticket.status === 'closed') return;
    if (ticket.category === 'sonstiges' || ticket.aiStatus === 'active') return;
    if (replyContent.trim()) return;
    const key = `${id}:${lastMsg.id}`;
    if (lenaRequestedFor.current === key) return;
    lenaRequestedFor.current = key;
    requestLena();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lenaAuto, loading, ticket?.id, ticket?.status, lastMsg?.id]);

  // ---------- Neu: Später ----------
  const handleSnooze = async (until: Date | null) => {
    try {
      const updated = await snoozeTicket(id, until) as Partial<Ticket>;
      setTicket(prev => (prev ? { ...prev, ...updated, ...(until ? {} : { snoozedUntil: undefined }) } : prev));
      if (until) opts.onLeave('later');
    } catch {
      notify('Zurückstellen hat nicht geklappt', 'error');
    }
  };

  // ---------- bisher inline im Kopfbereich: Einordnung & Spam ----------
  const handleSetCategory = async (target: 'kundenanfrage' | 'sonstiges', remember: boolean) => {
    if (!ticket) return;
    const res = await fetch(`/api/admin/tickets/${ticket.id}/category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: target, remember }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTicket((prev) => (prev ? { ...prev, ...updated } : prev));
      notify(target === 'sonstiges' ? 'Als Sonstiges eingeordnet' : 'Als Kundenanfrage eingeordnet', 'ok');
    } else {
      notify('Umsortieren hat nicht geklappt.', 'error');
    }
  };

  const handleMarkSpam = async (blockSender: boolean) => {
    if (!ticket) return;
    if (blockSender) {
      try {
        await fetch('/api/admin/spam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ticket.customerEmail, markExistingTickets: true }),
        });
        notify(`${ticket.customerEmail} wurde zur Spam-Liste hinzugefügt.`, 'ok');
      } catch (e) {
        console.error('Failed to add to spam list:', e);
      }
    }
    await handleStatusChange('closed');
  };

  return {
    ticket,
    setTicket,
    messages,
    setMessages,
    loading,
    setLoading,
    error,
    setError,
    replyContent,
    setReplyContent,
    sending,
    setSending,
    sendEmail,
    setSendEmail,
    aiLoading,
    setAiLoading,
    showAiMenu,
    setShowAiMenu,
    customInstruction,
    setCustomInstruction,
    showCustomModal,
    setShowCustomModal,
    attachments,
    setAttachments,
    uploading,
    setUploading,
    isDragging,
    setIsDragging,
    initialLoadDone,
    setInitialLoadDone,
    customerPresence,
    setCustomerPresence,
    humanRequested,
    setHumanRequested,
    aiStatusLoading,
    setAiStatusLoading,
    isCustomerTyping,
    setIsCustomerTyping,
    quickReplies,
    setQuickReplies,
    showQuickReplies,
    setShowQuickReplies,
    soundEnabled,
    setSoundEnabled,
    relevantArticles,
    setRelevantArticles,
    articlesLoading,
    setArticlesLoading,
    articleSearchQuery,
    setArticleSearchQuery,
    articleSearchResults,
    setArticleSearchResults,
    articleSearching,
    setArticleSearching,
    showArticleSearch,
    setShowArticleSearch,
    showForwardModal,
    setShowForwardModal,
    forwardMessage,
    setForwardMessage,
    forwardEmail,
    setForwardEmail,
    forwardName,
    setForwardName,
    forwardNote,
    setForwardNote,
    forwardReplyToCustomer,
    setForwardReplyToCustomer,
    forwarding,
    setForwarding,
    editingEmail,
    setEditingEmail,
    editedEmail,
    setEditedEmail,
    savingEmail,
    setSavingEmail,
    ticketRating,
    setTicketRating,
    requestingRating,
    setRequestingRating,
    ratingRequested,
    setRatingRequested,
    showShareModal,
    setShowShareModal,
    selectedArticle,
    setSelectedArticle,
    shareChannel,
    setShareChannel,
    shareCustomText,
    setShareCustomText,
    sharingArticle,
    setSharingArticle,
    availableTags,
    setAvailableTags,
    ticketNotes,
    setTicketNotes,
    newNoteContent,
    setNewNoteContent,
    savingNote,
    setSavingNote,
    savingTags,
    setSavingTags,
    loadData,
    loadTags,
    loadNotes,
    handleTagToggle,
    handleAddNote,
    handleDeleteNote,
    handleStatusChange,
    handlePriorityChange,
    handleArticleSearch,
    handleInsertArticle,
    handleForwardMessage,
    handleRequestRating,
    handleAIStatusToggle,
    handleSaveEmail,
    handleSendReply,
    handleFileUpload,
    removeAttachment,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    formatFileSize,
    handleAiGenerate,
    handleAiCorrect,
    handleAiRewrite,
    handleAiCustom,
    handleShareArticle,
    handleDelete,
    fileInputRef,
    messagesEndRef,
    messagesContainerRef,
    prevMessagesCountRef,
    audioRef,
    lastMessageCountRef,
    articleSearchTimeout,
    defaultQuickReplies,
    lenaPrefilled,
    setLenaPrefilled,
    lenaAuto,
    toggleLenaAuto,
    requestLena,
    handleSnooze,
    handleSetCategory,
    handleMarkSpam,
    notify,
  };
}
