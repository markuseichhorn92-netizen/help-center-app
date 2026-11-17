import { describe, it, expect } from "vitest";
import { replacePhone, changedFields } from "./phone-migration";

describe("replacePhone", () => {
  it("ersetzt die alten Nummern in allen Schreibweisen", () => {
    expect(replacePhone("ruf uns direkt unter 0651 603 443 42 an")).toBe("ruf uns direkt unter 0651 308524 an");
    expect(replacePhone("0651 493 688 19 · 0651/49368819 · +49 651 603 443 42 · 0651 60 34 43 42")).toBe(
      "0651 308524 · 0651 308524 · 0651 308524 · 0651 308524",
    );
    expect(replacePhone('<a href="tel:+4965149368819">x</a> <a href="tel:+4965160344342">y</a>')).toBe(
      '<a href="tel:+49651308524">x</a> <a href="tel:+49651308524">y</a>',
    );
  });
  it("lässt Geschäftsnummer und WhatsApp-Bot unverändert", () => {
    const t = "Büro 0651 603 442 05, tel:+4965160344205, wa.me/4951328533010";
    expect(replacePhone(t)).toBe(t);
  });
});

describe("changedFields", () => {
  it("liefert nur geänderte String-Felder", () => {
    expect(changedFields({ title: "Probetraining", content: "Tel. 0651 603 443 42", published: true })).toEqual({
      content: "Tel. 0651 308524",
    });
    expect(changedFields(null)).toEqual({});
  });
});
