"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "../ui/Pills";
import { ArrowDownIcon, CheckAllIcon, CheckIcon, ClipIcon, CloseIcon, ForwardIcon, GlobeIcon, MailIcon, WhatsAppIcon } from "../ui/icons";
import { formatMessageContent } from "./format";
import type { TicketMessage } from "./types";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/** Zustellstatus (nur eigene Nachrichten): Symbol + Text für Screenreader */
function DeliveryStatus({ message }: { message: TicketMessage }) {
  const { status, failureReason } = message;
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 text-adm-danger-ink" title={`Fehler: ${failureReason || "Unbekannt"}`}>
        <CloseIcon width={15} height={15} />
        <span className="text-xs font-semibold">Fehlgeschlagen</span>
      </span>
    );
  if (status === "read")
    return (
      <span className="inline-flex items-center gap-1 text-sky-300" title="Gelesen">
        <CheckAllIcon width={18} height={15} />
        <span className="sr-only">Gelesen</span>
      </span>
    );
  if (status === "delivered")
    return (
      <span className="inline-flex items-center gap-1 opacity-80" title="Zugestellt">
        <CheckAllIcon width={18} height={15} />
        <span className="sr-only">Zugestellt</span>
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 opacity-70" title="Gesendet">
      <CheckIcon width={15} height={15} />
      <span className="sr-only">Gesendet</span>
    </span>
  );
}

function DeliveryChannel({ channel }: { channel?: "live" | "email" | "whatsapp" }) {
  if (!channel) return null;
  const Icon = channel === "email" ? MailIcon : channel === "whatsapp" ? WhatsAppIcon : GlobeIcon;
  const label = channel === "email" ? "E-Mail" : channel === "whatsapp" ? "WhatsApp" : "Live-Chat";
  return (
    <span className="inline-flex items-center gap-1 text-xs opacity-80">
      <Icon width={13} height={13} />
      {label}
    </span>
  );
}

export default function MessageList({
  messages,
  typing,
  onForward,
  channelFallback,
}: {
  messages: TicketMessage[];
  typing: boolean;
  onForward: (m: TicketMessage) => void;
  channelFallback?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const [away, setAway] = useState(false);

  // Beim Öffnen ans Ende (neueste unten wie in Mail-/Chat-Apps); später nur, wenn man schon unten ist
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first = prevCount.current === 0 && messages.length > 0;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (first || (messages.length > prevCount.current && nearBottom)) {
      endRef.current?.scrollIntoView({ block: "end" });
    }
    prevCount.current = messages.length;
  }, [messages.length]);

  const onScroll = () => {
    const el = ref.current;
    if (el) setAway(el.scrollHeight - el.scrollTop - el.clientHeight > 300);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} role="log" aria-label="Nachrichtenverlauf" className="h-full space-y-3 overflow-y-auto px-4 py-4 lg:px-6">
        {messages.map((msg) => {
          const mine = msg.sender === "admin";
          const unread = !mine && !msg.isRead;
          return (
            <article key={msg.id} className={cx("flex", mine ? "justify-end" : "justify-start")} aria-label={`${mine ? "Du" : msg.senderName}, ${new Date(msg.createdAt).toLocaleString("de-DE")}`}>
              <div
                className={cx(
                  "max-w-[92%] rounded-3xl px-4 py-3 sm:max-w-[80%]",
                  mine ? "rounded-br-lg bg-adm-teal text-adm-on-teal" : "rounded-bl-lg border border-adm-line bg-adm-surface text-adm-ink",
                  unread && "ring-2 ring-adm-apricot"
                )}
              >
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className={cx("text-sm font-bold", mine ? "opacity-90" : "text-adm-ink")}>{mine ? msg.senderName || "Support Team" : msg.senderName}</span>
                  <time className={cx("adm-mono text-xs", mine ? "opacity-70" : "text-adm-mut")} dateTime={msg.createdAt}>
                    {new Date(msg.createdAt).toLocaleString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </time>
                  {unread && <span className="rounded-full bg-adm-apricot px-2 text-xs font-bold text-adm-on-apricot">Neu</span>}
                  {mine && <DeliveryStatus message={msg} />}
                  {mine && <DeliveryChannel channel={msg.deliveryChannel} />}
                </div>
                <div
                  className={cx("ticket-message-content text-[15px] leading-relaxed", mine ? "ticket-message-admin" : "ticket-message-customer")}
                  dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content, msg.channel || channelFallback) }}
                />
                {msg.attachments && msg.attachments.length > 0 && (
                  <ul className={cx("mt-3 space-y-1 border-t pt-2", mine ? "border-white/20" : "border-adm-line")} aria-label="Anhänge">
                    {msg.attachments.map((att) => (
                      <li key={att.id}>
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className={cx("flex min-h-11 items-center gap-2 text-sm underline-offset-2 hover:underline", mine ? "text-white" : "text-adm-teal dark:text-adm-apricot")}>
                          <ClipIcon width={17} height={17} />
                          <span className="truncate">{att.filename}</span>
                          <span className="adm-mono text-xs opacity-70">({formatFileSize(att.size)})</span>
                          <span className="sr-only"> (öffnet in neuem Tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => onForward(msg)}
                  className={cx("-mb-1 mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full pr-3 text-xs font-semibold", mine ? "text-white/70 hover:text-white" : "text-adm-mut hover:text-adm-ink")}
                >
                  <ForwardIcon width={15} height={15} />
                  Weiterleiten
                  <span className="sr-only"> – Nachricht von {msg.senderName}</span>
                </button>
              </div>
            </article>
          );
        })}
        {typing && (
          <div className="flex justify-start" role="status">
            <div className="flex items-center gap-2 rounded-3xl rounded-bl-lg border border-adm-line bg-adm-surface px-4 py-3">
              <span className="flex gap-1" aria-hidden="true">
                {[0, 150, 300].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-adm-mut" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
              <span className="text-xs text-adm-mut">Kunde tippt …</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {away && (
        <button
          type="button"
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
          className="absolute bottom-3 right-4 flex min-h-11 items-center gap-2 rounded-full bg-adm-teal px-4 text-sm font-bold text-adm-on-teal shadow-lg"
        >
          <ArrowDownIcon width={18} height={18} />
          Neueste
        </button>
      )}
    </div>
  );
}
