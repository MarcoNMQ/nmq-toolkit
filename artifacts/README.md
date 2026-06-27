# Dashboard Creator (Phase 3) — Claude artifact

`dashboard-creator.jsx` is NOT part of the Next.js app and is not built/deployed
by it. It's a standalone React component meant to be opened as a **Claude.ai
artifact**, not run inside `nmq-toolkit`.

## Why it lives here, not in `src/`
The component calls `https://api.anthropic.com/v1/messages` with no
`Authorization` header and uses no `localStorage`/`window` APIs beyond what
the artifact sandbox provides. That only works inside claude.ai's artifact
runtime, which injects credentials automatically. Run this same code in a
normal browser/Next.js context and the fetch will fail (no auth, likely
CORS-blocked too).

## How to actually use it
1. Open a claude.ai conversation.
2. Paste the contents of `dashboard-creator.jsx` and ask Claude to render it
   as an artifact (or attach the file and ask for the same).
3. It renders immediately with mock data — paste real planned/actual JSON
   into the two input boxes to replace it.
4. "Generate analysis" calls Claude directly from inside the artifact —
   billed against whoever has the conversation open, not your own API key.

## Known open question
Whether MCP connectors (Google Sheets, etc.) work for someone *other than
the creator* opening a shared/published artifact link is unconfirmed — only
relevant if this needs to run for a client without them pasting data in
manually. Worth testing directly in claude.ai before relying on it.

## Data shape assumption
The brief's planned-JSON sample only had `budget` per market; this version
expects `plannedConversions`/`actualConversions` on the market rows too, so
the breakdown table has real numbers. Adjust the merge logic in
`breakdownRows` if the real Media Plan Builder export or MCP pull uses a
different shape.
