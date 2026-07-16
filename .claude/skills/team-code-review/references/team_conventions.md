# Team Conventions (TypeScript / Node)

These are the conventions the `team-code-review` skill enforces. Kept in
nivel 3 (reference file) so the SKILL.md body stays light — it is only
loaded when a review is actually running.

## Architecture & layering

- **Routes/controllers** parse input, call a service, shape the response.
  No business rules, no data access.
- **Services** hold business logic. They depend on repositories, never on
  the database driver directly.
- **Repositories** are the only layer that talks to the database. All
  queries are parameterized.
- Cross-cutting concerns (auth, logging, validation) live in middleware,
  not inline in handlers.

## Naming

- `camelCase` for variables and functions, `PascalCase` for types and
  classes, `SCREAMING_SNAKE_CASE` for module-level constants.
- Booleans read as predicates: `isActive`, `hasAccess`, `canRetry`.
- No single-letter names except loop indices. No `d2`, `tmp`, `data2`.
- Async functions that return a promise are named for the result, not the
  act: `getUser`, not `fetchUserAsync`.

## Errors & async

- Every `await` is inside a `try/catch` or a function whose caller handles
  rejection. No floating promises.
- Throw typed errors (`class NotFoundError extends Error`), never bare
  strings.
- Never swallow errors with an empty `catch {}`.

## Tests

- Every exported function and every route handler has at least one test.
- Test files live next to the source as `*.test.ts`.
- Tests use `vitest`. One behavior per `it()`; describe blocks group by
  function under test.

## Style

- No `any` unless justified with an inline comment.
- Prefer `const`; `let` only when reassigned; never `var`.
- Imports ordered: node builtins, third-party, internal (`@/...`), relative.
