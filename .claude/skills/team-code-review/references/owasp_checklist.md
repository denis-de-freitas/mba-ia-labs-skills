# OWASP Review Checklist (condensed)

Loaded only when a change touches input handling, auth, queries, or
external calls. This is the "heavy" reference that justifies keeping it
out of the SKILL.md body.

## A01 — Broken Access Control
- Does every protected route check authorization, not just authentication?
- Are object IDs validated against the current user (no IDOR)?
- Are admin-only actions gated server-side, not just hidden in the UI?

## A02 — Cryptographic Failures
- Secrets read from env/secret manager, never hardcoded.
- Passwords hashed with bcrypt/argon2, never MD5/SHA1, never plaintext.
- Comparisons of secrets/tokens use constant-time compare.
- TLS enforced for any external call carrying credentials.

## A03 — Injection
- SQL queries parameterized — no string interpolation into queries.
- Shell calls avoid `exec` with interpolated user input.
- NoSQL filters validated (no operator injection via `$where`, `$ne`).
- Output encoded for the sink (HTML, URL, shell) to prevent XSS.

## A04 — Insecure Design
- Rate limiting on auth and expensive endpoints.
- Server-side validation of all client input (never trust the client).

## A05 — Security Misconfiguration
- No verbose stack traces or internal errors leaked to clients.
- CORS not set to `*` for credentialed endpoints.
- Security headers present (helmet or equivalent).

## A08 — Software & Data Integrity
- No `eval`, no `Function(...)`, no unsafe `JSON` from untrusted source
  feeding into deserialization that constructs objects.

## A09 — Logging & Monitoring
- Auth failures and access-control denials are logged.
- Logs do NOT contain passwords, tokens, or full PII.

## Quick red flags (grep targets)
- `== ` on a password/token, `exec(`, `eval(`, `${` inside a SQL string,
  `process.env` value logged, `cors({ origin: "*" ... credentials`,
  hardcoded `apiKey =`, `password =`, `secret =`.
