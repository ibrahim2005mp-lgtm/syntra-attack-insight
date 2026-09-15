import { SECURITY_CONFIG } from "./securityConfig";
import { clampDisplayText } from "./inputValidation";

/**
 * Output sanitization layer.
 *
 * SYNTRA treats ALL backend / model output as untrusted data. The React UI
 * renders plain text only — we never inject HTML (no dangerouslySetInnerHTML)
 * — so sanitization here is about reducing untrusted structures to safe,
 * typed, size-bounded render models before they reach components.
 */

/** Reduce any untrusted value to a bounded plain-text string. */
export function sanitizeText(value: unknown, max: number = SECURITY_CONFIG.maxDisplayLength): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return clampDisplayText(value, max);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

/** Sanitize an array of untrusted values into bounded plain-text strings. */
export function sanitizeTextList(value: unknown, max: number = SECURITY_CONFIG.maxExcerptLength): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeText(item, max))
    .filter((s) => s.length > 0)
    .slice(0, 50);
}

/** Sanitize a finite, bounded number (timestamps, counts, scores). */
export function sanitizeNumber(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

/** Strip characters that could form URLs/links inside plain text excerpts. */
export function sanitizeExcerpt(value: unknown): string {
  const text = sanitizeText(value, SECURITY_CONFIG.maxExcerptLength);
  // Neutralize anything resembling a URL scheme inside excerpts.
  return text.replace(/\b(javascript|data|vbscript)\s*:/gi, "$1:");
}
