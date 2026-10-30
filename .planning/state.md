# NMQ Toolkit — saved state (2026-10-29)

## Where things stand
Live at `https://nmq-toolkit.vercel.app`, repo `github.com/MarcoNMQ/nmq-toolkit`, Vercel team `nmq-personal`. All four tools are unlocked and live: Campaign Builder, Media Plan Builder, Performance Dashboard, AI Insight Generator (they were briefly restricted to only Media Plan Builder while Marco shared that link externally — since reverted).

## What this is
Bundle of four Next.js tools under one deployment:
- `/` — landing picker
- `/campaign-builder` — Google Ads (Search, Performance Max, YouTube/Demand Gen) + Facebook/Instagram bulk-upload builder
- `/media-plan` — scenario/market/goal/channel budget planner with KPI engine, Excel/Google Ads exports, AI insights
- `/dashboard` — Performance Dashboard
- `/insights` — AI Insight Generator

Each tool's code lives in its own namespaced folder — don't import across `campaign/`, `mediaplan/`, `dashboard/`, `insights/` namespaces.

## AI backend — migrated off Anthropic to NMQ's own gateway (2026-10-29)
**All 7 AI features in this app now call NMQ's internal "Coruscant" LLM gateway (`src/lib/coruscant.ts`), not the Anthropic SDK.** This happened because the shared Anthropic key ran out of credit, and Marco asked to switch to Coruscant instead of topping it up, then asked for every AI feature to be migrated, not just the two that were broken.

- Gateway: `https://coruscant.nmq.digital/api/gateway/v1`, OpenAI-chat-completions-compatible. Credentials in `.env.local` as `CORUSCANT_API_KEY`/`CORUSCANT_BASE_URL`, and set in Vercel prod env vars.
- Model: **every call uses `gpt-4o`**, never `gpt-4o-mini` — mini was found unreliable on this specific gateway (corrupts non-ASCII characters mid-generation, e.g. "€" → replacement character or even "£"). This reproduces on the gateway's plain non-streaming endpoint too, independent of model in some cases, so `coruscantChat` also retries a corrupted response up to twice and, as a last resort, swaps any remaining replacement character back to "€" (every piece of text this app generates is for a euro-denominated agency).
- Streaming (`coruscantTextStream`, used by AI Insight Generator) does NOT use the gateway's own `stream: true` SSE support — that reproduces the corruption too. It fetches the complete text via the regular call, then re-emits it in small code-point-safe chunks to preserve the UI's incremental reveal.
- Migrated routes: `generate-copy`, `ai-bench-preset`, `ai-compare`, `ai-text`, `ai-chat` (all in campaign/media-plan), `dashboard/ai`, `insights/generate`.
- The old Anthropic key/SDK is no longer used anywhere in this app as of this session. If Coruscant itself ever has an outage or the corruption issue gets worse, that's the thing to revisit — not the Anthropic credits.

## Facebook Campaign Builder — production-safety audit + fixes (2026-10-29)
Same bar as Search/PMAX got earlier: a dedicated audit found `validateFbCampaigns()` already existed with solid checks but was **never wired to actually block anything** (server only checked grouping conflicts, client only showed an informational accordion). Fixed — now blocks both client-side (export button disabled) and server-side (422).

Also found and fixed a second, more serious gap: Meta's bulk upload requires a **Link Object ID** (`o:<Facebook Page ID>`) on every new-creative ad row, telling Meta which Page runs it. That column existed in the header list but was never populated anywhere, and there was no field to capture a Page ID at all — every Facebook export this tool had ever produced was likely missing that required linkage.

Solved with a scalable design (a client can run dozens of Pages — Shimano alone has ~30, one per brand line × market):
- `useClientsStore` (`src/lib/clients/store.ts`, shared with Google's client picker and AI Insight Generator) — each `ClientEntry` now has a `facebookPages: {id, name, pageId}[]` list.
- `FbCampaign` gained `client_profile` (which client) and `facebook_page_ref` (which of that client's Pages) — both are campaign-level fields (ad sets of one campaign must agree, like objective/budget).
- The Facebook campaign form has a client picker → Page picker (by name), plus a **bulk-paste importer**: paste a client's whole Page list as copied straight from Meta Business Settings (tab/comma-separated "name, numeric id" per line) and it parses + merges in one go (`src/lib/clients/parseFbPages.ts`). Re-pasting only adds/updates, never deletes.
- **Shimano's real ~30-Page list is seeded in by default** (`src/lib/clients/shimanoPages.ts`) — works out of the box, no paste needed. A store migration back-fills this onto anyone who already had a bare "Shimano" client entry from before this existed.
- Campaign Builder store (`nmq-campaign-builder-store`) is now at version 3 (PMAX collection → client_profile → facebook_page_ref, each a migration step). Clients store (`nmq-clients-store`) is at version 1 (Shimano Pages seed).

Still open / lower priority: Facebook's export header list (`FB_HEADERS` in `fbConstants.ts`) has never been freshly verified against a real downloaded Meta template this session (inherited from the old Python tool, looks legitimate but unconfirmed) — the recommended way to verify it is exporting a real existing ad from Marco's own Ads Manager (Meta doesn't publish a static blank template the way Google does). Instagram Account ID (also required for Instagram placements per Meta's docs) has no column or field at all yet — not added without a verified source for the exact column name.

## Process notes for next time
- If adding a new API route to either tool, the route's URL path AND its fetch() call site in the matching namespaced component must both use the same prefix (`/api/campaign/...` or `/api/media-plan/...`).
- Vercel CLI on this machine: `npx vercel ls` / `npx vercel --prod` work directly in this session (already linked via `.vercel/project.json` to `nmq-personal/nmq-toolkit`); push to `master` also auto-deploys via the GitHub integration, so a manual deploy is only needed when env vars changed after the push already fired.
- `.next/` build cache occasionally hits a transient Windows/OneDrive `EPERM: operation not permitted, unlink` error — `rm -rf .next` and rebuild fixes it, not a real problem.
- Git author identity on this machine shows as `KaomboDJ <baratapk@gmail.com>` sometimes (global git config) even though pushes authenticate fine as MarcoNMQ — Marco confirmed this is expected (he switches between two accounts for credits) and not worth "fixing" going forward.
- Facebook Campaign Builder: same-campaign-name grouping (ad sets sharing a campaign name export as one Meta campaign, conflicts blocked) — see `.planning/facebook-campaign-test-checklist.md`.

## API key (superseded, see "AI backend" section above)
The Anthropic key story (shared NMQ key, "credit balance too low" in 2026-09-30 and again 2026-10-28) is why the Coruscant migration happened. Don't suggest topping up the Anthropic key as a fix for AI features in this app anymore — they don't use it.
