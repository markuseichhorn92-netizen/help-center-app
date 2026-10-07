'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from './icons';

export default function ThemeButton() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
      className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-lg text-p7 transition hover:border-teal active:scale-95 dark:border-[#1d4650] dark:bg-transparent dark:text-[#8ccbd9]">
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
