import type { OpeningHours, SpecialDay } from '@/lib/dashboard/config';

export interface OpeningData {
  openingHours: OpeningHours;
  specialDays: SpecialDay[];
}

export interface OpenStatus {
  open: boolean;
  label: string; // z. B. "Heute (Mi) 09:30–13:00 · 15:00–21:30"
  detail: string; // z. B. "Jetzt geöffnet bis 13:00"
}

const KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export function getOpenStatus(cfg: OpeningData | null, now = new Date()): OpenStatus | null {
  if (!cfg?.openingHours) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  const dateStr = `${p.year}-${p.month}-${p.day}`;
  const special = cfg.specialDays?.find((d) => d.date === dateStr);
  const day = special ?? cfg.openingHours[KEYS[dow]];
  if (!day) return null;
  const prefix = special ? `Heute (${special.name})` : `Heute (${SHORT[dow]})`;
  if (day.closed || day.slots.length === 0) return { open: false, label: `${prefix} geschlossen`, detail: 'Heute geschlossen' };
  const label = `${prefix} ${day.slots.map((s) => `${s.open}–${s.close}`).join(' · ')}`;
  const cur = day.slots.find((s) => minutes >= toMin(s.open) && minutes < toMin(s.close));
  if (cur) return { open: true, label, detail: `Jetzt geöffnet bis ${cur.close}` };
  const next = day.slots.find((s) => toMin(s.open) > minutes);
  return { open: false, label, detail: next ? `Öffnet heute um ${next.open}` : 'Heute geschlossen' };
}
