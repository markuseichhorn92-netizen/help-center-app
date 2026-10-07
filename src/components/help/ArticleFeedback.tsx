'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence,  useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { CheckIcon, ThumbDownIcon, ThumbUpIcon } from './icons';

type Vote = 'helpful' | 'not_helpful' | null;

function visitorHash(): string {
  const data = [navigator.userAgent, navigator.language, screen.width, screen.height, new Date().getTimezoneOffset()].join('|');
  let h = 0;
  for (let i = 0; i < data.length; i++) { h = (h << 5) - h + data.charCodeAt(i); h |= 0; }
  return h.toString(36);
}

export default function ArticleFeedback({ articleId, contact }: { articleId: string; contact: ReactNode }) {
  const reduce = useReducedMotion();
  const [vote, setVote] = useState<Vote>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`feedback_${articleId}`);
    if (stored === 'helpful' || stored === 'not_helpful') setVote(stored);
  }, [articleId]);

  const send = async (helpful: boolean) => {
    if (vote || busy) return;
    setBusy(true);
    const v: Vote = helpful ? 'helpful' : 'not_helpful';
    try {
      const res = await fetch(`/api/articles/${articleId}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful, visitorHash: visitorHash() }),
      });
      if (res.ok || res.status === 409) { setVote(v); localStorage.setItem(`feedback_${articleId}`, v); }
    } catch { /* still: Nutzer nicht stören */ } finally { setBusy(false); }
  };

  const btn = 'inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-white px-6 font-bold text-ink transition hover:border-teal hover:bg-teal-soft active:scale-95 disabled:opacity-60 dark:border-[#1d4650] dark:bg-transparent dark:text-[#e8f1f3] dark:hover:bg-[#12404b]';

  return (
    <div>
      <div className="hc-card p-5 text-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {!vote ? (
            <m.div key="ask" exit={reduce ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              <h2 className="text-lg font-extrabold">War das hilfreich?</h2>
              <div className="mt-3 flex justify-center gap-3">
                <button type="button" className={btn} disabled={busy} onClick={() => send(true)}><ThumbUpIcon /> Ja</button>
                <button type="button" className={btn} disabled={busy} onClick={() => send(false)}><ThumbDownIcon /> Nein</button>
              </div>
            </m.div>
          ) : (
            <m.div key="thanks" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2 py-1">
              <span className="hc-pop grid h-11 w-11 place-items-center rounded-full bg-[#e8f6ee] text-xl text-ok"><CheckIcon /></span>
              <p className="font-extrabold">{vote === 'helpful' ? 'Danke für dein Feedback!' : 'Danke – das tut uns leid.'}</p>
              {vote === 'not_helpful' && <p className="text-sm text-mut dark:text-[#9fb4ba]">Dann hilft dir unser Team direkt weiter:</p>}
            </m.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {vote === 'not_helpful' && (
          <m.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">{contact}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
