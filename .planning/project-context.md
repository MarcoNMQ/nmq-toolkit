# Project Context — NMQ Toolkit

## What this tool does
A combined web app bundling two paid-media workflow tools under one deployment: a **Campaign Builder** that turns a brief into ready-to-import Google Ads (Demand Gen + Search) and Facebook/Instagram bulk-upload files, and a **Media Plan Builder** that plans multi-scenario budget allocation across markets/goals/channels, calculates projected KPIs, and exports a formula-driven Excel workbook plus a Google Ads CSV. Used by NMQ campaign managers to go from brief/plan to actual bulk-upload-ready files, fast — no manual CSV building, no manual funnel math.

## Tech stack
Next.js 16 (App Router) + TypeScript + Tailwind v4 · Zustand (state, `persist` middleware to localStorage) · `exceljs` (Excel/Facebook bulk-upload generation, formula-based) · `@anthropic-ai/sdk` (Claude Haiku for ad copy/benchmark presets, Claude Sonnet for insights/recommendations/chat) · Vercel (hosting + Speed Insights) · GitHub (`MarcoNMQ/nmq-toolkit`). No database — everything is session-based, browser localStorage, and CSV/Excel/JSON export/import.

## Current state — what exists
Both tools are fully built and live at `https://nmq-toolkit.vercel.app`:
- `/` — landing picker
- `/campaign-builder` — Google Ads (Demand Gen + Search, with Keywords/Sitelinks) and Facebook/Instagram campaign builder, with a Shimano-specific locked naming convention plus a generic one for any client, briefing-sheet import (Google Sheet URL or uploaded file, with manual column-mapping fallback), AI ad-copy generation with hard character-limit enforcement, duplicate-name collision handling at export time
- `/media-plan` — scenario/market/goal/channel budget planner with bidirectional %↔€ sync, benchmark presets (manual + AI-suggested), period-by-period KPI tables, funnel visuals, scenario comparison, AI insights/recommendations/benchmark-explanation chat, Save/Load as JSON, built-in plan templates, and import support for plans saved by the original Streamlit tool's format
- Both tools' code is namespaced (`src/lib/campaign/*` vs `src/lib/mediaplan/*`, `/api/campaign/*` vs `/api/media-plan/*`) so they don't collide, but they are NOT integrated with each other — no shared state, no handoff of data from one tool to the other yet.

Nothing here talks to Google Sheets, Drive, Funnel.io, or Analytics via MCP — all I/O today is manual upload/paste (briefing sheet URL or file) and manual download (CSV/Excel/JSON).

## Target workflow
**Campaign Builder:**
1. User picks a client profile (or leaves blank for free-text) and a platform (Google or Facebook)
2. User either fills in a campaign/ad group/ad manually, or imports rows from a briefing Google Sheet/file
3. Tool generates the naming-convention-compliant campaign/ad group names, lets the user edit creative fields, optionally AI-generates ad copy within character limits
4. User exports a Google Ads Editor CSV (or Facebook bulk-upload Excel) ready to import directly into Ads Editor/Ads Manager

**Media Plan Builder:**
1. User sets campaign name/audience/industry/flight dates/breakdown period
2. User builds one or more scenarios: picks markets, goals, channels, sets budget splits, edits or AI-suggests benchmark assumptions
3. Tool calculates period-by-period KPI projections and funnel visuals live as inputs change
4. User compares scenarios, generates AI strategist insights/recommendations, and exports a formula-driven Excel workbook and/or a Google Ads CSV

## Example input → output
**Campaign Builder:** Input — a briefing sheet row with market code `DE`, goal code, channel code, product taxonomy fields, budget, dates. Output — a CSV row with a fully-formed campaign name like `DE_YT_AWA_PERF_JUN`, ad group name, and all required Google Ads Editor bulk-upload columns populated, ready to import.

**Media Plan Builder:** Input — Germany, €10,000 budget, Conversion goal, YouTube channel, default DE benchmarks. Output — a period-by-period table (impressions/clicks/sessions/conversions/MQL/SQL per week) plus a TOTAL row, and an Excel export where every cell is a live formula referencing the editable yellow assumption cells.

## Where I am stuck / what I need help with
Nothing currently blocking — both tools are functionally complete and deployed. Open/unfinished items, if useful to track:
- Campaign Builder has no Save/Load JSON (session-based by original design) — Media Plan Builder does. Not a blocker, just an asymmetry.
- The two tools don't share data — e.g. a media plan's budget/market/goal allocation isn't passed into Campaign Builder to pre-fill campaigns. No handoff exists yet.
- Location targeting default ("Campaign level") in Campaign Builder has never been verified against a real Google Ads Editor import.

## How this connects to the MCP + Artifact pipeline
This toolkit covers the first two phases of the pipeline:
- **Campaign Builder** (client input / brief) — turns a brief or briefing sheet into bulk-upload-ready Google Ads/Facebook files
- **Media Plan Creator** (planning / budget allocation) — scenario/market/goal/channel budget planning with KPI projections and exports

The third phase, **Dashboard Creator** (reporting / performance analysis), does not exist yet — Marco will build it separately. Nothing in this toolkit talks to any MCP tool today (Sheets, Drive, Funnel.io, Analytics) — both phases are currently manual upload/download (briefing sheet via pasted URL or file, exports via CSV/Excel/JSON download). Whether/how live MCP data sources get wired into Campaign Builder or Media Plan Creator, and how Dashboard Creator will eventually connect to either, is still open and not yet designed.
