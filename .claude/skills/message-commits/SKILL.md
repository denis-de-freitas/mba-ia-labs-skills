---
name: message-commits
description: >-
  Use when creating or reviewing a commit message from staged changes —
  analyzes the git diff and proposes a Conventional Commits title. Triggers on
  requests like "write the commit message for this", "what message should I use
  for this diff?", "generate a commit message for the staged changes", "review
  this commit message", "turn 'fixed the login' into a conventional commit",
  "summarize what I staged into a one-line commit subject", or "what type and
  scope should I use here?". Do NOT use to review code
  CORRECTNESS, bugs, security, or test coverage of the diff — that is
  team-code-review. Produces a single type(scope): description line (e.g.
  feat(auth): add JWT token-based user authentication, fix(payment): resolve bug
  in payment processing, docs(readme): update installation instructions), ready
  for git commit.
---


# Message Commits

## Commit message format

Generate commit message follwing the format below:

```
** Example 1 **
Input: Added user authentication with JWT tokens
Output: feat(auth): add JWT token-based user authentication

** Example 2 **
Input: Fixed bug in payment processing
Output: fix(payment): resolve bug in payment processing

** Example 3 **
Input: Updated README with installation instructions
Output: docs(readme): update installation instructions in README
```