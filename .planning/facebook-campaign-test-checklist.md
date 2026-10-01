# Facebook Campaign Builder: test checklist

_Written 2026-10-01, after commit `0d98fdb` ("same campaign name = one Facebook campaign")._

The rule: **anything with the same campaign name is ONE Meta campaign.** Meta's bulk import groups rows by Campaign Name, so every ad set in a campaign has to carry identical campaign settings. Logic lives in `src/lib/campaign/fbGrouping.ts`.

Campaign settings (shared by all ad sets): objective, budget, budget type, bid strategy, status, start and stop dates, buying type, tags.
Ad set settings (separate per ad set): countries, gender, age, placements, optimization goal, billing event, bid amount.

## ✅ Should work

**Building a campaign with several ad sets**
1. Create a campaign, fill in the campaign settings, add an ad, then click **+ Add ad set** under the campaign in the sidebar. The new ad set opens with the campaign name and all campaign settings already filled in, and the ad set name left blank.
2. Hover an ad set and click 📋. You get a copy called "*name* (Copy)" inside the **same** campaign, with its ads copied too.
3. The sidebar shows one campaign row with an "X ad sets" badge and the ad sets nested underneath.
4. The form shows a mint banner: "Shared campaign: X ad sets use this campaign name…"

**Settings staying in sync**
5. Change a campaign setting (budget, objective, status, dates, bid strategy, budget type) on any ad set. Every other ad set in that campaign updates too.
6. Change an ad set setting. Only that ad set changes.

**Name matching**
7. "Shimano_Reels" and "shimano_reels " (different capitals, trailing space) count as the same campaign. The export uses the first ad set's spelling, and the form says "Exported as …".
8. The same ad set name in **different** campaigns is fine.

**Export**
9. In the Excel file, every row of a campaign has the identical campaign name and campaign values, and its rows sit together.
10. The sidebar footer counts campaigns and ad sets separately, and adds each campaign's budget once, not once per ad set.
11. **Download Ads only** works the same way, using the same campaign names.

## 🚫 Should be blocked

12. **Different campaign settings under one name** (usually from a briefing import or a rename). Expect:
    - a red **!** on the campaign in the sidebar, which lists the issues when clicked
    - a red box in the form, for example "Campaign budget: €5000.00 vs €3000.00", with **Use the campaign's settings** and **Apply this ad set's settings to all** buttons
    - an "Export blocked" box in the Export panel, with both Download buttons greyed out
    - clicking either fix button clears it all
13. **Two ad sets with the same name inside one campaign.** Blocked because Meta would merge them into one ad set. Capitals count as the same name.
14. **Typing a name that matches another campaign doesn't copy its settings.** You get the conflict warning and choose which side wins, so nothing is overwritten silently.

The server also refuses a conflicting export (HTTP 422), so a broken file can't be downloaded even if the UI check is bypassed.

## ⚠️ Behaviour that might surprise you

- **Renaming changes only that one ad set.** It leaves the group and becomes its own campaign, while the others keep the old name. To rename a whole campaign, rename each ad set.
- **Blank campaign names never group.** Each unnamed ad set is its own campaign and gets the usual "Campaign Name is required" error.
- **🗑 on the campaign row deletes all its ad sets** (with a confirmation when there's more than one). To remove a single ad set, use the 🗑 on that ad set's row. It only appears when the campaign has more than one ad set.
- **Briefing imports:** each row becomes its own ad set. Rows that share a campaign name but have different budgets show as a conflict. That's expected: pick the right budget, then export.
- **The older validation errors** (missing objective, countries, ad name, image, and so on) show in the issues list but still **don't block** the export. Only the grouping problems block it. Open question for Marco: should those block too?

## Test status

- [x] Automated: 15 store and export checks passed, including reading the Excel file back (2026-09-30)
- [x] Server blocks a conflicting export with 422 (2026-09-30)
- [x] Live on nmq-toolkit.vercel.app (2026-10-01)
- [ ] Manual click-through of the new sidebar and banners in a browser (not done yet)
