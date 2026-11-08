'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { showsChatWidget } from '@/lib/help/magicline-chat';

// Lädt den Magicline-Chatbot auf allen öffentlichen Seiten (Teambereich ausgenommen).
export default function ChatWidgetLoader() {
  const pathname = usePathname();
  if (!showsChatWidget(pathname)) return null;
  return (
    <>
      <Script id="ml-chat-launcher" strategy="afterInteractive">{`/* Fit-Inn Chat-Launcher v2: eigener leichter Knopf im Hauptdokument, kein Iframe, erscheint sofort.
   Nach ca. 1,2 s fährt er zur Pille "Fragen? Frag Lena" auf (clip-path/opacity/transform), hält ~4 s, fährt zu (max. 3x pro Besuch).
   Das Magicline-Widget (~1,9 MB) lädt erst bei Tipp/Hover oder im Leerlauf (~5 s nach Load); sein eigener Knopf bleibt unsichtbar.
   Fällt etwas aus, führt der Knopf zur Kontaktseite. Konfig optional über window.FILAUNCH. */
(function () {
  try {
    if (window.__fiLaunch) return; window.__fiLaunch = 1;
    var C = window.FILAUNCH || {};
    var SRC = C.src || 'https://fit-inn-trier.web.magicline.com/chatbot/widget/widget.js?uuid=a48084fc-8418-4bb1-b987-4bf4d852398f&studioId=1210005460&studioName=Fit-Inn%20Trier';
    var SID = 'ml-member-chatbot-widget-script', IID = 'ml-member-chatbot-widget-iframe', KEY = 'fiLaunchShown';
    var TEXT = C.text || 'Fragen? Frag Lena 👋', FAIL = C.fail || 'Chat nicht erreichbar – zum Kontakt';
    var CONTACT = C.contact || 'https://hilfe.fit-inn-trier.de/kontakt';
    var FIRST = C.first != null ? C.first : 1200, HOLD = C.hold != null ? C.hold : 4000;
    var GAP = C.gap != null ? C.gap : 25000, MAX = C.max != null ? C.max : 3, IDLE = C.idle != null ? C.idle : 5000;
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var root = document.documentElement, wrap, ln, txt, timer, want = false, failed = false, asked = false, ready = false, expanded = false;

    function shown() { try { return +sessionStorage.getItem(KEY) || 0; } catch (e) { return 0; } }
    function bump() { try { sessionStorage.setItem(KEY, shown() + 1); } catch (e) { } }
    function doc() { try { var f = document.getElementById(IID); return f && (f.contentDocument || f.contentWindow.document); } catch (e) { return null; } }
    function isOpen() { var d = doc(); return !!(d && d.querySelector('[data-role="chatbot-container"]')); }

    // Eigener Knopf des Widgets bleibt unsichtbar (Iframe versteckt), solange der Chat zu ist
    var st = document.createElement('style');
    st.textContent =
      'html.fi-c #' + IID + '{visibility:hidden!important;pointer-events:none!important}' +
      '#fi-lw{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:2147483000;filter:drop-shadow(0 4px 12px rgba(10,73,88,.38));' +
      'opacity:0;transform:scale(.6);transform-origin:100% 100%;pointer-events:none;transition:opacity .3s ease,transform .45s cubic-bezier(.34,1.56,.5,1)}' +
      '#fi-lw.v{opacity:1;transform:none;pointer-events:auto}' +
      '#fi-lw.h{opacity:0;transform:scale(.8);pointer-events:none}' +
      '#fi-ln{position:relative;display:flex;align-items:center;box-sizing:border-box;height:62px;padding:0 62px 0 20px;border-radius:31px;color:#fff;text-decoration:none;' +
      'background:linear-gradient(135deg,#0A4958,#107E97);clip-path:inset(0 0 0 var(--o,9999px) round 31px);' +
      'transition:clip-path .7s cubic-bezier(.34,1.35,.5,1);-webkit-tap-highlight-color:transparent;cursor:pointer;outline:0}' +
      '#fi-ln.on{clip-path:inset(0 0 0 0 round 31px)}' +
      '#fi-ln:focus-visible{box-shadow:inset 0 0 0 3px #FFB54F}' +
      '#fi-ln .t{white-space:nowrap;font:600 16px/1 "Source Sans Pro",-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;opacity:0;transform:translateX(10px);' +
      'transition:opacity .25s ease,transform .4s ease}' +
      '#fi-ln.on .t{opacity:1;transform:none;transition-delay:.2s}' +
      '#fi-ln .i{position:absolute;right:0;top:0;width:62px;height:62px;display:flex;align-items:center;justify-content:center}' +
      '#fi-ln .i svg{width:30px;height:30px;transition:opacity .2s ease}' +
      '#fi-ln .sp{position:absolute;opacity:0}' +
      '#fi-ln.ld .ch{opacity:0}#fi-ln.ld .sp{opacity:1;animation:fi-spin .8s linear infinite}' +
      '@keyframes fi-spin{to{transform:rotate(360deg)}}' +
      '@media (prefers-reduced-motion:reduce){#fi-lw,#fi-ln,#fi-ln .t{transition:none}#fi-ln.ld .sp{animation-duration:1.6s}}';
    root.appendChild(st);
    root.classList.add('fi-c');

    wrap = document.createElement('div'); wrap.id = 'fi-lw';
    wrap.innerHTML =
      '<a id="fi-ln" href="' + CONTACT + '" role="button" aria-label="Chat öffnen: Fragen? Frag Lena">' +
      '<span class="t"></span><span class="i">' +
      '<svg class="ch" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-6.2l-4.3 3.4c-.5.4-1.3 0-1.3-.7V18H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" fill="#fff"/>' +
      '<circle cx="8.2" cy="11" r="1.4" fill="#0A4958"/><circle cx="12" cy="11" r="1.4" fill="#0A4958"/><circle cx="15.8" cy="11" r="1.4" fill="#0A4958"/></svg>' +
      '<svg class="sp" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,.3)" stroke-width="3"/>' +
      '<path d="M12 3a9 9 0 0 1 9 9" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></span></a>';
    root.appendChild(wrap);
    ln = wrap.firstChild; txt = ln.firstChild; txt.textContent = TEXT;
    measure();
    requestAnimationFrame(function () { wrap.classList.add('v'); });

    function measure() { ln.style.setProperty('--o', Math.max(0, Math.ceil(ln.getBoundingClientRect().width) - 62) + 'px'); }
    function expand(label) { if (label) txt.textContent = label; measure(); expanded = true; ln.classList.add('on'); }
    function collapse() { expanded = false; ln.classList.remove('on'); }

    function cycle() {
      clearTimeout(timer);
      if (want || failed || isOpen() || shown() >= MAX) return;
      if (document.hidden) { timer = setTimeout(cycle, 3000); return; }
      bump(); expand();
      timer = setTimeout(function () { collapse(); timer = setTimeout(cycle, GAP); }, HOLD);
    }
    if (!reduce) timer = setTimeout(cycle, FIRST);

    // Widget nachladen (einmalig)
    function loadWidget() {
      if (asked) return; asked = true;
      if (!document.getElementById(SID)) {
        var s = document.createElement('script'); s.id = SID; s.src = SRC; s.async = true;
        s.onerror = function () { fail(); };
        document.head.appendChild(s);
      }
      var tries = 0, poll = setInterval(function () {
        var d = doc();
        if (d && d.querySelector('[data-role="chatbot-bubble"]')) {
          clearInterval(poll); ready = true; watch(d); if (want) openChat();
        } else if (++tries > 200) { clearInterval(poll); asked = false; if (want) fail(); }
      }, 100);
    }
    function watch(d) {
      var sync = function () {
        var open = isOpen();
        root.classList.toggle('fi-c', !open);
        wrap.classList.toggle('h', open);
        if (open && expanded) collapse();
      };
      try { new MutationObserver(sync).observe(d.body, { childList: true, subtree: true }); } catch (e) { setInterval(sync, 300); }
      sync();
    }
    function openChat() {
      var d = doc(), b = d && d.querySelector('[data-role="chatbot-bubble"]');
      if (!b) return;
      want = false; ln.classList.remove('ld');
      root.classList.remove('fi-c'); b.click();
    }
    function fail() {
      failed = true; want = false; ln.classList.remove('ld');
      root.classList.remove('fi-c');
      clearTimeout(timer); expand(FAIL);
    }

    // Leerlauf: 5 s nach Load, dann wenn der Browser frei ist
    function idleLoad() {
      setTimeout(function () {
        if (window.requestIdleCallback) requestIdleCallback(loadWidget, { timeout: 3000 }); else loadWidget();
      }, IDLE);
    }
    if (document.readyState === 'complete') idleLoad(); else window.addEventListener('load', idleLoad);

    ln.addEventListener('pointerenter', loadWidget);
    ln.addEventListener('touchstart', loadWidget, { passive: true });
    ln.addEventListener('focus', loadWidget);
    function go() {
      clearTimeout(timer); collapse();
      if (ready) { openChat(); return; }
      want = true; ln.classList.add('ld');
      loadWidget();
    }
    window.fiChatOpen = function () { if (!failed) go(); }; // z. B. fuer /chat-Seiten
    ln.addEventListener('click', function (e) {
      if (failed) return; // Fallback: normaler Link zur Kontaktseite
      e.preventDefault(); go();
    });
  } catch (e) { /* nichts kaputt machen */ }
})();`}</Script>
    </>
  );
}
