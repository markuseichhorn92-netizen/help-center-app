// Reiner Server-Render: Text ist sofort sichtbar (LCP), die Animation läuft per CSS (hc-rise) und
// wird bei prefers-reduced-motion global abgeschaltet.
export default function HeroTitle() {
  const words = ['Wie', 'können', 'wir', 'dir', 'helfen?'];
  return (
    <div>
      <h1 className="text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
        {words.map((w, i) => (
          <span key={w + i} className="hc-rise mr-[.25em] inline-block" style={{ animationDelay: `${i * 60}ms` }}>
            {w}
          </span>
        ))}
      </h1>
      <p className="mt-3 text-base text-[#cfe5ea] sm:text-lg">Frag einfach – die Antwort ist meist nur einen Klick entfernt.</p>
    </div>
  );
}
