# SYNTRA Frontend Security Layer

> **Scope statement:** this frontend layer is *hardening only*. It reduces
> common client-side risks but does **not** eliminate vulnerabilities.
> Authentication, authorization, rate limiting, request validation, and
> access control are enforced by the backend (Convex functions). Never treat
> client-side checks as the security boundary.

## Architecture

```
User Input
   ↓  security/inputValidation.ts      — question validation (length, chars, probes)
API Client (services/api.ts)
   ↓  Convex function call             — backend validates + authorizes again
Backend
   ↓  validated response
security/outputSanitization.ts          — reduce to bounded, typed render models
   ↓
React UI (plain-text rendering only — no HTML injection)
```

## Modules

| Module | Responsibility |
| --- | --- |
| `securityConfig.ts` | Central limits + external source domain allowlist. |
| `inputValidation.ts` | Validates the investigation question before any API call: empty, too short/long, control characters, angle brackets, injection probes (`javascript:`, `<script`, event handlers, template expressions). |
| `urlValidation.ts` | Every external link passes `validateExternalUrl()`: HTTPS only, domain allowlist only. Internal routes validated with `validateInternalRoute()`. Failed URLs render as non-clickable labels via `safeUrlLabel()`. |
| `outputSanitization.ts` | Treats backend/LLM output as untrusted: reduces values to bounded plain text (`sanitizeText`, `sanitizeTextList`, `sanitizeExcerpt`), strips URL schemes inside excerpts. |

## Rules enforced across the UI

- **XSS:** React's escaping is the baseline. The codebase must not use
  `dangerouslySetInnerHTML`; no untrusted HTML is ever injected. Evidence
  excerpts render as plain text in `<pre>`-styled blocks.
- **URLs:** no raw API string is ever bound to `href`/`src` without
  `validateExternalUrl()`. `javascript:`/`data:` and non-allowlisted domains
  are blocked. External links use `rel="noopener noreferrer"`.
- **Input:** validated centrally before the API client is invoked; the
  backend re-validates independently (defense in depth).
- **Output:** model output is data, never markup. Sanitized before render.
- **Secrets:** no API keys, tokens, or credentials exist in frontend code.
  Backend keys stay in Convex environment variables, read server-side only.
- **Storage:** no sensitive data in `localStorage`. Only non-sensitive UI
  preferences (e.g. sidebar state) may be persisted.
- **External content:** no iframes or embedded external pages/scripts in the
  default experience.
- **Dependencies:** minimal, auditable dependency set; no client-side
  markdown/HTML sanitizers needed because no rich HTML is rendered.

## Backend responsibilities (not reproducible client-side)

- Session issuance/validation (Convex Auth), per-user data isolation
  (`investigations` are scoped to the authenticated user).
- Rate limiting and abuse control on investigation requests.
- Re-validation of every field of every stored response.
- Transport security (HTTPS) and secure deployment headers.
