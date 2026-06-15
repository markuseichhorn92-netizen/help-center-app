import { z } from 'zod';

// Same permissive email shape the routes used before (kept identical to avoid
// behaviour changes), expressed once and reused.
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const emailSchema = z
  .string()
  .trim()
  .max(200)
  .regex(emailRegex, 'Bitte geben Sie eine gültige E-Mail-Adresse an.');

export const prioritySchema = z.enum(['low', 'medium', 'high']);

// Public "create ticket" payload (web/support form -> POST /api/tickets)
export const publicTicketSchema = z.object({
  subject: z.string().trim().min(1, 'Betreff ist erforderlich').max(200),
  customerName: z.string().trim().min(1, 'Name ist erforderlich').max(120),
  customerEmail: emailSchema,
  content: z.string().trim().min(1, 'Nachricht ist erforderlich').max(10000),
  priority: prioritySchema.optional(),
  honeypot: z.string().optional(),
});
export type PublicTicketInput = z.infer<typeof publicTicketSchema>;

// Portal "create ticket" payload (POST /api/portal/tickets/create).
// Attachments are validated separately in the route to preserve their full shape.
export const portalTicketSchema = z.object({
  subject: z.string().trim().min(1, 'Betreff ist erforderlich').max(200),
  message: z.string().trim().min(1, 'Nachricht ist erforderlich').max(10000),
  priority: prioritySchema.optional(),
  name: z.string().trim().max(120).optional(),
});
export type PortalTicketInput = z.infer<typeof portalTicketSchema>;

/**
 * Helper that validates an unknown payload against a schema and returns either
 * the typed data or a flat, user-facing error message (first issue).
 */
export function validateBody<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstIssue = result.error.issues[0];
  return {
    success: false,
    error: firstIssue?.message ?? 'Ungültige Eingabe.',
  };
}
