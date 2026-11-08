'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { MAGICLINE_CHAT_SCRIPT_ID, MAGICLINE_CHAT_SRC, showsChatWidget } from '@/lib/help/magicline-chat';

// Lädt den Magicline-Chatbot auf allen öffentlichen Seiten (Teambereich ausgenommen).
export default function ChatWidgetLoader() {
  const pathname = usePathname();
  if (!showsChatWidget(pathname)) return null;
  return (
    <>
      <Script id={MAGICLINE_CHAT_SCRIPT_ID} src={MAGICLINE_CHAT_SRC} strategy="afterInteractive" />
      <Script id="ml-chat-groesser" strategy="afterInteractive">{`(function(){var S=1.25,ID='ml-member-chatbot-widget-iframe',o;function a(){var e=document.getElementById(ID);if(!e)return;var h=parseInt(e.style.height,10)||0,t=(h&&h<300)?'scale('+S+')':'';if(e.style.transform!==t){e.style.transformOrigin='100% 100%';e.style.transform=t}if(!e.__mlObs){e.__mlObs=1;new MutationObserver(a).observe(e,{attributes:true,attributeFilter:['style']})}}o=new MutationObserver(a);o.observe(document.documentElement,{childList:true,subtree:true});a()})();`}</Script>
    </>
  );
}
