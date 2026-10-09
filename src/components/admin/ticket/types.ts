export interface Ticket {
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
  category?: 'kundenanfrage' | 'sonstiges';
  categoryReason?: string;
  categorySource?: string;
  important?: boolean;
  snoozedUntil?: string;
  snoozedAt?: string;
}

export interface TicketNote {
  id: string;
  ticketId: string;
  content: string;
  createdAt: string;
  createdBy: string;
}

export interface TicketTag {
  id: string;
  name: string;
  color: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
}

export interface TicketMessage {
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

