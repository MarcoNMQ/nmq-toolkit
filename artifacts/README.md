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

## What it actually replaces
Not the data pipeline behind `shimano-paid-media-dashboard` — that app's real
value is the hard-won data engineering (Product Mapping VLOOKUP fallbacks,
Funnel.io "Product Not Found" handling, video-name matching against a
briefing file), which stays exactly where it is, in Python. This artifact is
a free, reactive **front end** on top of whatever standardized snapshot that
pipeline (or any client's equivalent) produces — visualization + an AI judge
that runs on the viewer's Claude usage instead of your own API key.

## Multi-client design
`CLIENT_CONFIGS` at the top of the file is the only place client-specific
structure lives: funnel phases, which KPI fields render under each phase, the
breakdown table's grouping dimension, and an accent color. Shimano's mirrors
the real dashboard's Awareness/Consideration/Purchase phase structure and a
Category breakdown (Predator/Saltwater/Aero/Tribal — matches the real
Product Mapping categories, just as labels here, no actual mapping logic).

**To add a new client:** add one entry to `CLIENT_CONFIGS` (phases, KPIs per
phase, breakdown label) and one matching entry in `MOCK_DATA` so it renders
immediately. Nothing else in the component needs to change — the client
selector, KPI cards, chart, breakdown table, and AI prompt all read from
whichever config is currently selected.

## Snapshot data shape
```json
{
  "periods": [{ "label": "Week 1", "impressions": 480000, "clicks": 4200, "...": "any KPI field used by that client's phases" }],
  "breakdown": [{ "dim": "Predator", "impressions": 380000, "clicks": 3200, "conversions": 32, "revenue": 14200 }]
}
```
`periods` feeds the KPI cards and trend chart; `breakdown` feeds the table,
grouped by whatever `breakdownDimLabel` is for that client (Category for
Shimano, Channel for a generic client, etc).

## How to actually use it
1. Open a claude.ai conversation.
2. Paste the contents of `dashboard-creator.jsx` and ask Claude to render it
   as an artifact (or attach the file and ask for the same).
3. It renders immediately with mock data for both configured clients — pick
   a client from the dropdown, paste a real snapshot to replace its data.
4. "Generate insights" calls Claude directly from inside the artifact —
   billed against whoever has the conversation open, not your own API key.

## Known open question
Whether MCP connectors (Google Sheets, etc.) work for someone *other than
the creator* opening a shared/published artifact link is unconfirmed — only
relevant if this needs to run for a client without them pasting data in
manually. Worth testing directly in claude.ai before relying on it.
