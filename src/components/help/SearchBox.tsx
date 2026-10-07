'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { search, type SearchDoc } from '@/lib/help/search';
import { ChevronIcon, DocIcon, SearchIcon, SparkIcon, WhatsAppIcon } from './icons';
import { WHATSAPP_URL } from './ContactBlock';

interface Props {
  docs: SearchDoc[];
  topIds: string[];
  chips?: { label: string; id: string }[];
}

export default function SearchBox({ docs, topIds, chips = [] }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const logged = useRef('');

  const hits = useMemo(() => (q.trim().length >= 2 ? search(docs, q) : []), [docs, q]);
  const top = useMemo(() => topIds.map((id) => docs.find((d) => d.id === id)).filter(Boolean) as SearchDoc[], [docs, topIds]);
  const empty = q.trim().length < 2;
  const items = empty ? top.slice(0, 5) : hits.map((h) => h.doc);
  const noHit = !empty && hits.length === 0;
  const total = items.length + (noHit ? 2 : 0);

  // Taste „/“ fokussiert die Suche.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Anfragen ohne Treffer anonym zählen (bestehende Such-Statistik).
  useEffect(() => {
    if (!noHit) return;
    const query = q.trim();
    const t = setTimeout(() => {
      if (logged.current !== query) {
        logged.current = query;
        fetch(`/api/search?q=${encodeURIComponent(query)}&limit=1`).catch(() => {});
      }
    }, 900);
    return () => clearTimeout(t);
  }, [noHit, q]);

  const go = (id: string) => { setOpen(false); router.push(`/articles/${id}`); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % Math.max(total, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a <= 0 ? total - 1 : a - 1)); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
    else if (e.key === 'Enter') {
      if (active >= 0 && active < items.length) { e.preventDefault(); go(items[active].id); }
      else if (active >= items.length && noHit) { e.preventDefault(); active === items.length ? router.push('/chat') : window.open(WHATSAPP_URL, '_blank'); }
      else if (items.length) { e.preventDefault(); go(items[0].id); }
    }
  };

  const opt = (i: number) => `${uid}-opt-${i}`;
  const rowCls = (i: number) => `flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${active === i ? 'bg-teal-soft dark:bg-[#12404b]' : 'hover:bg-teal-soft/60 dark:hover:bg-[#12404b]/60'}`;

  return (
    <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (items[0]) go(items[0].id); }}>
        <label htmlFor={`${uid}-q`} className="sr-only">Hilfe durchsuchen</label>
        <div className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4 text-mut shadow-[0_8px_24px_rgba(0,0,0,.18)] ring-0 transition focus-within:ring-4 focus-within:ring-teal/50 sm:h-16">
          <SearchIcon className="shrink-0 text-xl text-p7" />
          <input
            ref={inputRef}
            id={`${uid}-q`}
            type="text" inputMode="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && active >= 0 ? opt(active) : undefined}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Suche: z. B. „kündigen“, „Öffnungszeiten“ …"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-ink outline-none placeholder:text-mut sm:text-lg"
          />
          {q ? (
            <button type="button" onClick={() => { setQ(''); inputRef.current?.focus(); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg text-mut hover:bg-surface" aria-label="Suche leeren">✕</button>
          ) : (
            <kbd className="hc-mono hidden rounded-md border border-line px-2 py-0.5 text-sm text-mut sm:block" aria-hidden>/</kbd>
          )}
        </div>
      </form>

      {chips.length > 0 && (
        <ul className="mt-3.5 flex flex-wrap gap-2" aria-label="Schnellzugriff">
          {chips.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => go(c.id)} className="inline-flex min-h-11 items-center rounded-full border border-white/30 bg-white/10 px-3.5 text-[13px] font-semibold text-white transition hover:bg-white/20 active:scale-95">
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute inset-x-0 top-[calc(3.5rem+8px)] z-30 overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-[0_18px_50px_rgba(6,50,60,.28)] sm:top-[calc(4rem+8px)] dark:border-[#1d4650] dark:bg-[#0d2b33] dark:text-[#e8f1f3]"
          >
            <p className="hc-eyebrow px-4 pt-3 pb-1">{empty ? 'Häufige Fragen' : noHit ? 'Keine Treffer' : `${hits.length} ${hits.length === 1 ? 'Treffer' : 'Treffer'}`}</p>
            <ul id={listId} role="listbox" aria-label="Suchvorschläge">
              {items.map((d, i) => (
                <li key={d.id} role="presentation">
                  <button type="button" role="option" id={opt(i)} aria-selected={active === i} onMouseEnter={() => setActive(i)} onClick={() => go(d.id)} className={rowCls(i)}>
                    <DocIcon className="shrink-0 text-lg text-teal" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{d.title}</span>
                      {!empty && <span className="block truncate text-xs text-mut dark:text-[#9fb4ba]">{hits[i]?.excerpt}</span>}
                      {empty && <span className="block text-xs text-mut dark:text-[#9fb4ba]">{d.category}</span>}
                    </span>
                    <ChevronIcon className="shrink-0 text-[#9bb0b6]" />
                  </button>
                </li>
              ))}
              {noHit && (
                <>
                  <li role="presentation" className="px-4 pb-1 text-sm text-mut dark:text-[#9fb4ba]">Dazu haben wir (noch) keinen Artikel. Frag direkt nach:</li>
                  <li role="presentation">
                    <button type="button" role="option" id={opt(items.length)} aria-selected={active === items.length} onMouseEnter={() => setActive(items.length)} onClick={() => router.push('/chat')} className={rowCls(items.length)}>
                      <SparkIcon className="shrink-0 text-lg text-teal" /><span className="font-bold">KI-Assistent fragen: „{q.trim()}“</span>
                    </button>
                  </li>
                  <li role="presentation">
                    <button type="button" role="option" id={opt(items.length + 1)} aria-selected={active === items.length + 1} onMouseEnter={() => setActive(items.length + 1)} onClick={() => window.open(WHATSAPP_URL, '_blank')} className={rowCls(items.length + 1)}>
                      <WhatsAppIcon className="shrink-0 text-lg text-[#14543a]" /><span className="font-bold">Per WhatsApp schreiben</span>
                    </button>
                  </li>
                </>
              )}
            </ul>
            <div className="h-2" />
          </motion.div>
        )}
      </AnimatePresence>
      <p className="sr-only" role="status" aria-live="polite">{open && !empty ? (noHit ? 'Keine Treffer' : `${hits.length} Vorschläge`) : ''}</p>
    </div>
  );
}
