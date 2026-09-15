import { ALLOWED_SOURCE_DOMAINS, INTERNAL_ROUTES } from "./securityConfig";

export type UrlCheckResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

function isAllowedDomain(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ALLOWED_SOURCE_DOMAINS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

/**
 * Validate an external source URL before it is rendered as a link.
 *
 * Allows only https: URLs on the source allowlist. Blocks javascript:,
 * data:, vbscript:, file:, malformed URLs and unknown domains.
 * Call this for EVERY untrusted URL before rendering — never bind raw
 * API-provided strings to href/src.
 */
export function validateExternalUrl(raw: unknown): UrlCheckResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, reason: "empty" };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "protocol_not_allowed" };
  }
  if (!isAllowedDomain(parsed.hostname)) {
    return { ok: false, reason: "domain_not_allowed" };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * Validate an internal app route (used for history restore links).
 * Only known local paths are allowed; scheme-relative "//..." is rejected.
 */
export function validateInternalRoute(raw: unknown): UrlCheckResult {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 300) {
    return { ok: false, reason: "malformed" };
  }
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return { ok: false, reason: "not_a_local_path" };
  }
  const path = raw.split("?")[0].split("#")[0];
  const isKnown = INTERNAL_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
  if (!isKnown) {
    return { ok: false, reason: "route_not_allowed" };
  }
  return { ok: true, url: raw };
}

/**
 * Human-readable label for a URL that failed validation, for the source list.
 * Shows the origin only — never renders the raw URL as a link.
 */
export function safeUrlLabel(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim().length === 0) return "Unavailable source";
  try {
    const parsed = new URL(raw.trim());
    return `${parsed.hostname} (unverified link)`;
  } catch {
    return "Unavailable source";
  }
}
