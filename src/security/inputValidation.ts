import { SECURITY_CONFIG } from "./securityConfig";

export interface ValidationResult {
  valid: boolean;
  /** Normalized, safe-to-use value (trimmed). */
  value?: string;
  /** Human-readable reason when invalid. */
  error?: "empty" | "too_short" | "too_long" | "invalid_characters" | "suspicious";
}

/**
 * Characters accepted in an investigation question. Intentionally generous
 * for natural language but excludes control characters and angle brackets,
 * which have no place in a question and blunt injection attempts.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_AND_BRACKETS = /[\u0000-\u001F\u007F<>]/;

/**
 * Patterns that look like injection attempts rather than genuine questions.
 * Matched content is rejected outright — never rendered.
 */
const SUSPICIOUS_PATTERNS: RegExp[] = [
  /javascript\s*:/i,
  /data\s*:\s*text\/html/i,
  /<\s*script/i,
  /on(?:error|load|click|mouseover)\s*=/i,
  /\{\{.*?\}\}/, // template injection probes
];

/**
 * Validate and normalize an investigation question before it reaches the
 * API client. Centralized here so every entry point gets identical checks.
 */
export function validateInvestigationQuestion(raw: unknown): ValidationResult {
  if (typeof raw !== "string") {
    return { valid: false, error: "empty" };
  }

  const value = raw.trim().replace(/\s+/g, " ");

  if (value.length === 0) {
    return { valid: false, error: "empty" };
  }
  if (value.length < SECURITY_CONFIG.minQuestionLength) {
    return { valid: false, error: "too_short" };
  }
  if (value.length > SECURITY_CONFIG.maxQuestionLength) {
    return { valid: false, error: "too_long" };
  }
  if (CONTROL_AND_BRACKETS.test(value)) {
    return { valid: false, error: "invalid_characters" };
  }
  if (SUSPICIOUS_PATTERNS.some((p) => p.test(value))) {
    return { valid: false, error: "suspicious" };
  }

  return { valid: true, value };
}

/** Clamp any untrusted string to a safe display length (belt-and-braces). */
export function clampDisplayText(text: unknown, max: number): string {
  if (typeof text !== "string") return "";
  return text.length > max ? text.slice(0, max) : text;
}
