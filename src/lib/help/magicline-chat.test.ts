import { describe, it, expect } from "vitest";
import { MAGICLINE_CHAT_SRC, MAGICLINE_CHAT_SCRIPT_ID, showsChatWidget } from "./magicline-chat";

describe("Magicline-Chat", () => {
  it("nutzt die freigegebene Widget-Adresse und Script-ID", () => {
    expect(MAGICLINE_CHAT_SRC).toBe(
      "https://fit-inn-trier.web.magicline.com/chatbot/widget/widget.js?uuid=a48084fc-8418-4bb1-b987-4bf4d852398f&studioId=1210005460&studioName=Fit-Inn%20Trier",
    );
    expect(MAGICLINE_CHAT_SCRIPT_ID).toBe("ml-member-chatbot-widget-script");
  });
  it("zeigt das Widget überall außer im Teambereich", () => {
    expect(showsChatWidget("/")).toBe(true);
    expect(showsChatWidget("/chat")).toBe(true);
    expect(showsChatWidget("/artikel/x")).toBe(true);
    expect(showsChatWidget("/admin")).toBe(false);
    expect(showsChatWidget("/admin/tickets")).toBe(false);
    expect(showsChatWidget(null)).toBe(true);
  });
});
