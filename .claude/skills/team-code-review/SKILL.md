---
name: team-code-review
description: >
  Use when reviewing a diff, pull request, or staged changes in this repo.
  Triggers on "review", "code review", "check my PR", "review my changes",
  "look at my diff". Applies the team checklist: correctness, security
  (OWASP), layering, naming, and test coverage, then reports findings
  grouped by severity. Do NOT use for writing new features, generating
  tests (use gen-tests), scaffolding services (use scaffold-service),
  or reviewing prose/documentation.
allowed-tools: Read, Grep, Bash
---

# Team Code Review

Review TypeScript/Node changes against the team's standards. Be specific,
cite `file:line`, and never approve silently.

## Step 0 — Load context (required)

First, read `references/team_conventions.md`. For any change that touches
input handling, authentication, database queries, or external requests,
also read `references/owasp_checklist.md` before reviewing.

## Step 1 — Get the changes

If the user gave a path or PR, review that. Otherwise collect the staged
diff:

```bash
bash ${CLAUDE_SKILL_DIR}/scripts/collect_diff.sh
```

If the diff is empty, say so and stop — do not invent findings.

## Step 2 — Review in this fixed order

1. **Correctness & edge cases** — off-by-one, null/undefined, unhandled
   promise rejections, missing `await`, error paths.
2. **Security** — apply `references/owasp_checklist.md` to any input
   handling, auth, queries, or external calls. Flag injection,
   missing validation, secrets in code, unsafe deserialization.
3. **Layering** — no business logic in controllers/routes; no SQL or
   data access in services that should delegate to repositories.
4. **Naming & readability** — per `team_conventions.md`.
5. **Test coverage** — flag any new exported function or route handler
   that has no corresponding test.

## Step 3 — Output format

Group findings by severity. For each finding give `file:line`, the
problem in one sentence, and a concrete suggested fix.

```
## Code Review — <branch or PR>

### 🔴 Blocker (N)
- src/auth/login.ts:42 — Password compared with `==`, allowing type
  coercion bypass. Use a constant-time compare (`crypto.timingSafeEqual`).

### 🟡 Should-fix (N)
- src/orders/service.ts:88 — Raw SQL built via string interpolation.
  Parameterize the query.

### ⚪ Nit (N)
- src/utils/date.ts:12 — `d2` is unclear; rename to `endDate`.

### ✅ Verdict
Blockers must be resolved before merge. If clean, say so explicitly.
```

Never end without an explicit verdict. If there are zero findings, state
that the change passes the checklist and why.
