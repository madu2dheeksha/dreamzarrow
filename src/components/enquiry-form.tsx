"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, MessageCircle, Phone, TriangleAlert } from "lucide-react";
import { enquiryIntents, type EnquiryIntent } from "@/content/services";
import { enquirySchema, fieldErrorsFrom, type EnquiryResponse } from "@/lib/enquiry-schema";
import { site, telLink, whatsappLink } from "@/content/site";
import { buttonClasses } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; reason: "not_configured" | "delivery_failed" | "rate_limited" | "network" | "bad_request" };

const noopSubscribe = () => () => {};

/** Reads ?intent=… so links like /contact?intent=list#enquire preselect the enquiry type. */
function useUrlIntent() {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      const v = new URLSearchParams(window.location.search).get("intent");
      return v && enquiryIntents.some((i) => i.value === v) ? v : null;
    },
    () => null,
  );
}

function useToday() {
  return useSyncExternalStore(
    noopSubscribe,
    () => new Date().toISOString().slice(0, 10),
    () => undefined,
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-[0.82rem] font-medium text-danger">
      {message}
    </p>
  );
}

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function EnquiryForm({
  defaultIntent = "buy",
  property,
  submitLabel = "Send enquiry",
  showIntent = true,
  compact = false,
}: {
  defaultIntent?: EnquiryIntent;
  /** Human-readable property reference, e.g. "4 BHK Villa for Rent in Kondapur — Vessella Woods". */
  property?: string;
  submitLabel?: string;
  showIntent?: boolean;
  compact?: boolean;
}) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const submissionId = useRef<string>("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);
  const urlIntent = useUrlIntent();
  const today = useToday();
  const [chosenIntent, setIntent] = useState<string | null>(null);
  const intent = chosenIntent ?? (showIntent ? urlIntent : null) ?? defaultIntent;
  const [summary, setSummary] = useState<{ name: string; message: string }>({ name: "", message: "" });

  useEffect(() => {
    submissionId.current = newId();
  }, []);

  const id = (name: string) => `${uid}-${name}`;

  function readForm() {
    const fd = new FormData(formRef.current!);
    return {
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      intent: showIntent ? String(fd.get("intent") ?? "") : defaultIntent,
      message: String(fd.get("message") ?? ""),
      preferredDate: String(fd.get("preferredDate") ?? ""),
      company: String(fd.get("company") ?? ""),
      property,
      page: typeof window !== "undefined" ? window.location.pathname : undefined,
      submissionId: submissionId.current || newId(),
    };
  }

  function validate() {
    const result = enquirySchema.safeParse(readForm());
    const errs = result.success ? {} : fieldErrorsFrom(result.error);
    setErrors(errs);
    return { result, errs };
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.kind === "submitting") return; // guard against double submits
    setAttempted(true);
    const { result, errs } = validate();
    if (!result.success) {
      const first = Object.keys(errs)[0];
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    const payload = readForm();
    setSummary({ name: payload.name, message: payload.message });
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as EnquiryResponse | null;
      if (data?.ok) {
        setStatus({ kind: "success" });
        formRef.current?.reset();
        submissionId.current = newId();
      } else if (data && data.error === "validation") {
        setErrors(data.fieldErrors);
        setStatus({ kind: "idle" });
      } else {
        setStatus({
          kind: "error",
          reason: data && !data.ok ? data.error : "delivery_failed",
        });
      }
    } catch {
      setStatus({ kind: "error", reason: "network" });
    }
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  const whatsappFallback = whatsappLink(
    [
      `Hello ${site.name}, I'm ${summary.name || "interested"}.`,
      property ? `I'm enquiring about: ${property}.` : `I'd like help to ${enquiryIntents.find((i) => i.value === intent)?.label.toLowerCase() ?? "find a property"}.`,
      summary.message,
    ]
      .filter(Boolean)
      .join(" "),
  );

  if (status.kind === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="rounded-[var(--radius-card)] border border-line bg-paper p-8 outline-none">
        <CheckCircle2 className="size-8 text-success" aria-hidden />
        <h3 className="mt-4 font-display text-2xl">Thank you{summary.name ? `, ${summary.name.split(" ")[0]}` : ""}.</h3>
        <p className="mt-3 leading-relaxed text-muted">
          Your enquiry has reached our team. We will be in touch shortly during office hours. If it is urgent, call us
          on{" "}
          <a href={telLink} className="font-semibold text-ink underline underline-offset-4">
            {site.phone.display}
          </a>
          .
        </p>
        <button type="button" onClick={() => setStatus({ kind: "idle" })} className={`mt-6 ${buttonClasses("secondary")}`}>
          Send another enquiry
        </button>
      </div>
    );
  }

  // Once the visitor has tried to submit, re-validate as they correct each field.
  const handleBlur = () => {
    if (attempted) validate();
  };

  const fieldProps = (name: string) => ({
    id: id(name),
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? id(`${name}-error`) : undefined,
  });

  const submitting = status.kind === "submitting";

  return (
    <form ref={formRef} onSubmit={onSubmit} onBlur={handleBlur} noValidate className="relative grid gap-5" aria-busy={submitting}>
      <div className={`grid gap-5 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div>
          <label htmlFor={id("name")} className="field-label">
            Full name <span aria-hidden className="text-brass">*</span>
          </label>
          <input {...fieldProps("name")} className="field" autoComplete="name" required maxLength={80} />
          <FieldError id={id("name-error")} message={errors.name} />
        </div>
        <div>
          <label htmlFor={id("phone")} className="field-label">
            Phone / WhatsApp <span aria-hidden className="text-brass">*</span>
          </label>
          <input
            {...fieldProps("phone")}
            className="field"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91"
            required
            maxLength={20}
          />
          <FieldError id={id("phone-error")} message={errors.phone} />
        </div>
      </div>

      <div>
        <label htmlFor={id("email")} className="field-label">
          Email <span className="font-normal text-muted">(optional)</span>
        </label>
        <input {...fieldProps("email")} className="field" type="email" autoComplete="email" maxLength={120} />
        <FieldError id={id("email-error")} message={errors.email} />
      </div>

      {showIntent && (
        <div>
          <label htmlFor={id("intent")} className="field-label">
            I would like to <span aria-hidden className="text-brass">*</span>
          </label>
          <select
            {...fieldProps("intent")}
            className="field"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
          >
            {enquiryIntents.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
          <FieldError id={id("intent-error")} message={errors.intent} />
        </div>
      )}

      {(intent === "site-visit" || (!showIntent && defaultIntent === "site-visit")) && (
        <div>
          <label htmlFor={id("preferredDate")} className="field-label">
            Preferred visit date <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            {...fieldProps("preferredDate")}
            className="field"
            type="date"
            min={today}
          />
          <p className="mt-1.5 text-[0.8rem] text-muted">We are closed on Tuesdays. We will confirm a time with you.</p>
        </div>
      )}

      <div>
        <label htmlFor={id("message")} className="field-label">
          {property ? "Anything we should know?" : "Tell us a little about what you need"}{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          {...fieldProps("message")}
          className="field min-h-28 resize-y"
          rows={compact ? 3 : 4}
          maxLength={2000}
          placeholder={property ? "Move-in timeline, questions about the home…" : "Preferred areas, size, budget, timeline…"}
        />
        <FieldError id={id("message-error")} message={errors.message} />
      </div>

      {/* Honeypot — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("company")}>Company</label>
        <input id={id("company")} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      {status.kind === "error" && (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="rounded-[var(--radius-card)] border border-danger/30 bg-danger/5 p-5 text-[0.92rem] outline-none"
        >
          <p className="flex items-start gap-2 font-semibold text-danger">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {status.reason === "rate_limited"
              ? "You have sent several enquiries in a short time. Please wait a few minutes, or reach us directly."
              : status.reason === "network"
                ? "We could not reach the server. Please check your connection and try again, or reach us directly."
                : "Online enquiries are not reaching us right now. Please contact us directly — we will respond quickly."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={whatsappFallback} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary")}>
              <MessageCircle className="size-4" aria-hidden />
              Send on WhatsApp
            </a>
            <a href={telLink} className={buttonClasses("secondary")}>
              <Phone className="size-4" aria-hidden />
              Call {site.phone.display}
            </a>
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-4 pt-1 ${compact ? "" : "sm:flex-row sm:items-center sm:justify-between"}`}>
        <button type="submit" disabled={submitting} className={buttonClasses("primary", "lg", compact ? "w-full" : "w-full sm:w-auto")}>
          {submitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            submitLabel
          )}
        </button>
        <p className={`text-[0.8rem] leading-relaxed text-muted ${compact ? "" : "sm:max-w-xs"}`}>
          We use your details only to respond to this enquiry. See our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
            privacy policy
          </Link>
          .
        </p>
      </div>
      <div className="sr-only" aria-live="polite">
        {submitting ? "Sending your enquiry" : ""}
      </div>
    </form>
  );
}
