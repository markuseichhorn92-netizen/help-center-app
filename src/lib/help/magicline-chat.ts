// Magicline-Chatbot (Widget von Magicline, Studio Fit-Inn Trier). Ersetzt jexitychat.
export const MAGICLINE_CHAT_SRC =
  "https://fit-inn-trier.web.magicline.com/chatbot/widget/widget.js?uuid=a48084fc-8418-4bb1-b987-4bf4d852398f&studioId=1210005460&studioName=Fit-Inn%20Trier";
export const MAGICLINE_CHAT_SCRIPT_ID = "ml-member-chatbot-widget-script";
export const MAGICLINE_CHAT_IFRAME_ID = "ml-member-chatbot-widget-iframe";

// Teambereich bekommt kein Kunden-Chat-Widget.
export function showsChatWidget(pathname: string | null | undefined): boolean {
  return !(pathname === "/admin" || (pathname ?? "").startsWith("/admin/"));
}

// Das Widget liegt in einem Iframe; die Blase wird per Klick geöffnet (Skript ist groß, daher Wiederholungen).
export function openMagicline(maxTries = 60, delayMs = 150): () => void {
  let tries = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const go = () => {
    try {
      const f = document.getElementById(MAGICLINE_CHAT_IFRAME_ID) as HTMLIFrameElement | null;
      const d = f && (f.contentDocument || f.contentWindow?.document);
      const b = d && (d.querySelector('[data-role="chatbot-bubble"]') || d.querySelector('[data-role="chatbot-cta"] [role="button"]'));
      if (b) { (b as HTMLElement).click(); return; }
    } catch { /* Iframe noch nicht bereit */ }
    if (++tries < maxTries) timer = setTimeout(go, delayMs);
  };
  go();
  return () => { if (timer) clearTimeout(timer); };
}
