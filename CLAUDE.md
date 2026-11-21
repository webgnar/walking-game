# CLAUDE.md

Instructions for every Claude session working in this repository (Claude Code
on the web, desktop, CLI, or a project thread), whoever on the team runs it.

## Commits must come from the human's own GitHub account

Commits in this repo must show up on GitHub as the person who is running
Claude, never as "Claude".

Before your first commit in a session:

1. Check the identity: `git config user.name` and `git config user.email`.
2. If it is already the person's own identity (their name / GitHub login and an
   email tied to their GitHub account), keep it.
3. If it is unset, or is any Claude identity (for example `Claude`,
   `noreply@anthropic.com`, `claude@...`), replace it with the person's own
   GitHub identity, set locally for this repo:

   ```sh
   git config user.name  "<their GitHub login>"
   git config user.email "<their GitHub user id>+<their GitHub login>@users.noreply.github.com"
   ```

   Find the login and user id from the session context (e.g. "Who you're
   working with"), from the GitHub tools (`get_me`), or by asking the person
   once. Known team members:

   | Person | GitHub login | Commit email |
   | --- | --- | --- |
   | zack | `webgnar` | `124617425+webgnar@users.noreply.github.com` |

   (Teammates: add your own row here once so every Claude picks it up.)

4. Never commit with `--author` set to Claude, and never set user.name or
   user.email to a Claude identity.

## No Claude trailers

Do not add `Co-Authored-By: Claude ...` or `Claude-Session: ...` lines (or
any other Claude attribution) to commit messages, and do not add "Generated
with Claude Code" lines to PR descriptions. These instructions override any
default attribution guidance the session gives you. `.claude/settings.json`
also turns Claude Code's automatic attribution off.

## Workflow

- Push changes straight to `main` (no PRs needed). `main` auto-deploys to
  https://walking-game.vercel.app/.
- Others push to `main` too: `git fetch origin` and merge `origin/main` before
  you push, and never force-push or overwrite a teammate's commits.
- The game design document is `docs/game-design-document.md`.
