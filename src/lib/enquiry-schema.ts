import { z } from "zod";
import { enquiryIntents } from "@/content/services";

const intentValues = enquiryIntents.map((i) => i.value) as [string, ...string[]];

/** Accepts Indian mobiles (with or without +91 / 0) and international numbers. */
const phoneRegex = /^\+?[0-9][0-9\s-]{7,16}[0-9]$/;

export const enquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(80, "Please keep your name under 80 characters."),
  phone: z
    .string()
    .trim()
    .min(1, "Please enter a phone number so we can reach you.")
    .regex(phoneRegex, "Please enter a valid phone number, e.g. +91 98765 43210."),
  email: z
    .union([z.literal(""), z.email("Please enter a valid email address.").max(120)])
    .optional()
    .transform((v) => v || undefined),
  intent: z.enum(intentValues, { message: "Please choose what you are looking for." }),
  message: z.string().trim().max(2000, "Please keep your message under 2,000 characters.").optional(),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  property: z.string().trim().max(160).optional(),
  page: z.string().trim().max(300).optional(),
  submissionId: z.string().trim().min(8).max(64),
  /** Explicit opt-in to be contacted on WhatsApp (unticked by default). */
  whatsappConsent: z.boolean().optional(),
  /** Honeypot — must be empty. */
  company: z.string().max(0).optional(),
});

export type EnquiryInput = z.input<typeof enquirySchema>;
export type Enquiry = z.output<typeof enquirySchema>;

export type EnquiryResponse =
  | { ok: true }
  | { ok: false; error: "validation"; fieldErrors: Record<string, string> }
  | { ok: false; error: "rate_limited" | "not_configured" | "delivery_failed" | "bad_request" };

export function fieldErrorsFrom(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
