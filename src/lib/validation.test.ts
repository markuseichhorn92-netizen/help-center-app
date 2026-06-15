import { describe, it, expect } from "vitest";
import {
  emailSchema,
  publicTicketSchema,
  portalTicketSchema,
  validateBody,
} from "./validation";

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    expect(emailSchema.safeParse("max@example.de").success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("publicTicketSchema via validateBody", () => {
  const valid = {
    subject: "Frage zur Mitgliedschaft",
    customerName: "Max Mustermann",
    customerEmail: "max@example.de",
    content: "Ich habe eine Frage.",
    priority: "medium",
  };

  it("accepts a valid payload", () => {
    expect(validateBody(publicTicketSchema, valid).success).toBe(true);
  });

  it("rejects a missing required field with a message", () => {
    const res = validateBody(publicTicketSchema, { ...valid, subject: "" });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.length).toBeGreaterThan(0);
  });

  it("rejects an invalid email", () => {
    expect(validateBody(publicTicketSchema, { ...valid, customerEmail: "bad" }).success).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    expect(validateBody(publicTicketSchema, { ...valid, priority: "urgent" }).success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const res = validateBody(publicTicketSchema, { ...valid, subject: "  Hallo  " });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.subject).toBe("Hallo");
  });
});

describe("portalTicketSchema via validateBody", () => {
  it("accepts a valid payload", () => {
    expect(validateBody(portalTicketSchema, { subject: "Hi", message: "Test" }).success).toBe(true);
  });

  it("rejects an empty message", () => {
    expect(validateBody(portalTicketSchema, { subject: "Hi", message: "" }).success).toBe(false);
  });
});
