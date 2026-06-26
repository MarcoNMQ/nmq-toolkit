# NMQ Toolkit — saved state (2026-06-26)

## Where things stand
Live at `https://nmq-toolkit.vercel.app`, repo `github.com/MarcoNMQ/nmq-toolkit`, Vercel team `nmq-personal`. This is now the **only** live deployment for either tool — the two standalone apps it was merged from have been retired (Vercel projects deleted, GitHub repos archived, not deleted, so history is recoverable if ever needed).

## What this is
Bundle of two independent Next.js apps under one deployment:
- `/` — landing picker
- `/campaign-builder` — Google Ads (Demand Gen + Search) + Facebook/Instagram bulk-upload builder
- `/media-plan` — scenario/market/goal/channel budget planner with KPI engine, Excel/Google Ads exports, AI insights

Each tool's code lives in its own namespaced folder so the merge didn't require touching either tool's actual logic:
- `src/lib/campaign/*`, `src/components/campaign/*`, `src/app/api/campaign/*`
- `src/lib/mediaplan/*`, `src/components/mediaplan/*`, `src/app/api/media-plan/*` (note: hyphenated route folder, non-hyphenated lib/component namespace — these were independent choices, don't "fix" one to match the other)
- `src/components/Field.tsx` is the one genuinely shared file (both tools had byte-identical copies)

Each tool keeps its own Zustand store with its own pre-existing localStorage key (`nmq-campaign-builder-store` / `nmq-media-plan-builder-store`) — fully isolated, no shared state by design.

## Process notes for next time
- If extending either tool, work inside its namespaced folder only — don't import across `campaign/` and `mediaplan/` namespaces, they're deliberately independent.
- If adding a new API route to either tool, the route's URL path AND its fetch() call site in the matching namespaced component must both use the same prefix (`/api/campaign/...` or `/api/media-plan/...`) — verified once already via a repo-wide grep for stray un-namespaced `@/lib/`, `@/components/`, and `fetch('/api/` references; worth re-running that grep after any future copy-paste from one of the original standalone repos (which no longer exist live, but their archived GitHub history could still be a copy-paste source).
- Campaign Builder has no Save/Load JSON feature (session-based by original design — matches the original Streamlit tool's intent). If this ever becomes a real pain point, Media Plan Builder's `legacyImport.ts` + Sidebar save/load buttons are the reference implementation to copy the pattern from.
- Vercel CLI on this machine needs `--scope nmq-personal` explicitly for any non-interactive command (deploy, env add, project rm) — the CLI's non-interactive mode won't auto-pick the only team. Use `npx vercel@54.17.3` (pinned) if `npx vercel` hits a transient "no matching version" registry error.
- `gh` CLI is not installed on this machine — repo creation/archiving was done via direct GitHub REST API calls using the token already cached by `git-credential-manager` (`git credential fill` for `host=github.com`). Avoid em-dashes or other non-ASCII characters in `curl -d` JSON payloads — they've broken GitHub's JSON parser at least once (400 "Problems parsing JSON"); use `--data-binary` and plain ASCII instead.

## API key
Same Anthropic key as the other NMQ apps, in `.env.local` (gitignored) and as a Vercel production env var.
