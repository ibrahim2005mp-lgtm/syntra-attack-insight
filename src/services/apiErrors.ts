/** Error normalization: backend/transport failures → safe user messages. */

export type ApiErrorKind =
  | "auth"
  | "validation"
  | "not_found"
  | "temporary";

export interface ApiError extends Error {
  kind: ApiErrorKind;
}

const SAFE_FALLBACK = "The investigation could not be completed. Please try again.";

/**
 * Normalize any thrown error into a safe, user-facing message.
 * Raw exceptions, stack traces and backend internals never reach the UI:
 * only deliberately friendly backend validation messages pass through.
 */
export function mapApiError(error: unknown): ApiError {
  const raw = error instanceof Error ? error.message : "";
  const message = typeof raw === "string" && raw.length > 0 && raw.length < 300 ? raw : SAFE_FALLBACK;

  let kind: ApiErrorKind = "temporary";
  if (/authentication required/i.test(message)) kind = "auth";
  else if (/question|characters|short|long|enter/i.test(message)) kind = "validation";

  const normalized = new Error(
    kind === "validation" ? message : SAFE_FALLBACK,
  ) as ApiError;
  normalized.kind = kind;
  return normalized;
}
