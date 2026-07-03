import Link from 'next/link';

interface Step {
  text: string;
  note?: string;
}

interface Section {
  id: string;
  title: string;
  subtitle: string;
  accentHex: string;
  href: string;
  groups: {
    heading?: string;
    steps: Step[];
  }[];
  tips?: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'campaign',
    title: 'Campaign Builder',
    subtitle: 'Build Google Ads (Demand Gen) and Meta (Facebook/Instagram) campaigns, generate copy with AI, and export a bulk-upload file.',
    accentHex: '#FF6B2C',
    href: '/campaign-builder',
    groups: [
      {
        heading: 'Getting started',
        steps: [
          { text: 'Open Campaign Builder from the nav. You\'ll see a Google / Facebook toggle at the top of the left sidebar.' },
          { text: 'Click "+ New Campaign" to create a blank campaign. A form opens on the right.' },
          { text: 'Alternatively, click "Import from Briefing Sheet" inside the campaign form to bulk-create campaigns from a Google Sheet or uploaded Excel/CSV briefing.' },
        ],
      },
      {
        heading: 'Google campaigns (Demand Gen)',
        steps: [
          { text: 'Fill in Channel, Main goal, Performance goal, Month, Market and dates first — these four fields drive the auto-generated Campaign and Ad Group names shown at the top of the form.' },
          { text: 'Select a Market (e.g. SGF = Germany) and the Country Group and Countries will pre-fill automatically. Adjust the country pills if you need a custom mix.' },
          { text: 'Pick your Networks and Languages. Use "+ Add languages for selected countries" to match languages to your country selection in one click.' },
          { text: 'Click "Next: Add ad" at the bottom, then "+ Add ad" in the sidebar tree to open the ad form.' },
          { text: 'Paste a YouTube URL into the Video URL field — the Video ID extracts automatically and the real video title gets fetched.' },
          { text: 'Click "✨ Generate with AI" to auto-write headlines, long headlines and descriptions. Review and edit — limits are 30 chars for headlines, 90 for long headlines and descriptions.' },
          { text: 'Set a Final URL, then go back to the sidebar and click "Export CSV" to download the Google Ads Editor bulk-upload file.' },
          { text: 'If you use keywords (Search campaigns), export "Export Keywords CSV" separately — it\'s a different screen in Google Ads Editor.' },
        ],
      },
      {
        heading: 'Facebook / Meta campaigns',
        steps: [
          { text: 'Switch to Facebook using the toggle in the sidebar. The form changes to the Meta-specific fields.' },
          { text: 'Fill Campaign Name, Ad Set Name, Campaign Objective, Optimization Goal and Billing Event — these three should logically align (e.g. Outcome Awareness → IMPRESSIONS optimization → IMPRESSIONS billing).' },
          { text: 'Select Countries, Gender, Age range and Publisher/Device/Position targeting.' },
          { text: 'Click "Next: Add ad" to open the ad form.' },
          {
            text: 'Choose the ad type at the top of the form: "New creative" (build from an image + copy) or "Promote existing post" (reference a post already on your Page by its Story ID).',
            note: 'For Shimano and most video campaigns, use "Promote existing post". Facebook needs the numeric post ID — find it at the end of the post URL on your Page. The tool prefixes it with s: and v: automatically.',
          },
          {
            text: 'For "New creative": fill the Image Asset section. Use Image Hash for existing Business Manager assets (preferred) — the full hash format is imageId:hashValue, e.g. 1056130167741584:504fcf9d72dd... Find it in Business Manager → Media Library.',
            note: 'Facebook strips original file names, so Image File Name only works when you are uploading a brand-new image alongside the template.',
          },
          { text: 'For "New creative": fill Title (max 25 chars), Body / primary text, Link, CTA and any URL tags.' },
          { text: 'Export using one of two buttons in the sidebar footer:', },
          { text: '"Export Excel (full)" — use this for the first time you\'re setting up a campaign. Creates the full campaign + ad set + ad structure.' },
          { text: '"Export Ads only" — use this when the campaign already exists in Ads Manager and you just need to add new ads. Only exports ad rows so Facebook won\'t create a duplicate campaign.' },
        ],
      },
      {
        heading: 'Tips',
        steps: [],
      },
    ],
    tips: [
      'Don\'t open the Google CSV in Excel before uploading to Google Ads Editor — Excel converts the Logo asset ID to scientific notation. Upload directly from your Downloads folder.',
      'If Facebook bulk upload creates a Campaign and Ad Set but no ads appear, the ad row failed silently. For "Promote existing post" mode, check that the Story ID is the plain numeric post ID with no prefix — the tool adds s: automatically. For "New creative" mode, check Image Hash or Image File Name.',
      'The "Export Ads only" file is for adding ads to an existing campaign — never use it for a brand-new setup.',
      'Each campaign in the sidebar tree has Duplicate (📋) and Delete (🗑) buttons that appear on hover.',
    ],
  },
  {
    id: 'media-plan',
    title: 'Media Plan Builder',
    subtitle: 'Build multi-scenario budget plans across channels and markets, with automatic KPI projections and Excel export.',
    accentHex: '#00C896',
    href: '/media-plan',
    groups: [
      {
        heading: 'Getting started',
        steps: [
          { text: 'Open Media Plan Builder. The left sidebar is where you set up the plan — campaign name, audience, industry, date range and breakdown (daily / weekly / monthly).' },
          { text: 'Click "+ New Scenario" to add a budget scenario. You can have multiple scenarios (e.g. Conservative / Base / Aggressive) and switch between them using the sidebar list.' },
        ],
      },
      {
        heading: 'Building a scenario',
        steps: [
          { text: 'Inside a scenario, add channels using the "+ Add channel" button. Each channel gets its own budget row.' },
          { text: 'Set a budget for each channel. The KPI projections (Impressions, Clicks, Conversions, ROAS, etc.) calculate automatically based on the industry benchmarks you selected.' },
          { text: 'Use the Funnel Stage selector per channel to tag each channel as Awareness, Consideration or Conversion — this drives the benchmark KPIs.' },
          { text: 'The total budget and projected KPIs roll up automatically at the top of the scenario view.' },
          { text: 'Rename scenarios by clicking the name in the sidebar list. Duplicate a scenario using the 📋 button to quickly test budget variants.' },
        ],
      },
      {
        heading: 'Exporting',
        steps: [
          { text: 'Click "Export Excel (all scenarios)" in the sidebar footer to download a formatted Excel with all scenarios on separate tabs.' },
          { text: 'Click "Export Google Ads CSV — [Scenario name]" to export that scenario\'s channel budgets in a format compatible with Google Ads Editor.' },
          { text: 'Use "💾 Save plan" to download the full plan as a JSON file — reload it later with "📂 Load plan" to continue editing.' },
          { text: '"Clear all data" at the very bottom of the sidebar removes all scenarios and plan config. It confirms before deleting.' },
        ],
      },
    ],
    tips: [
      'The ? button (bottom right of the screen) opens a topic guide with explanations for Scenarios, Budgets, Benchmarks and Export.',
      'The AI Insights chat inside the plan can answer questions about your numbers and suggest budget reallocations.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Performance Dashboard',
    subtitle: 'Upload any paid media export (CSV, XLSX or Google Sheet) and get a visual KPI dashboard with channel and funnel breakdowns.',
    accentHex: '#4F46E5',
    href: '/dashboard',
    groups: [
      {
        heading: 'Loading your data',
        steps: [
          { text: 'Open the Performance Dashboard. You\'ll see an upload area — drop a CSV or XLSX file, or paste a Google Sheet URL.' },
          { text: 'Supported sources: Google Ads Editor exports, Meta Ads exports (including LinkedIn, which uses UTF-16 encoding — the tool handles that automatically), or any spreadsheet with recognisable column names.' },
          { text: 'After upload, the tool auto-detects your columns and shows a mapping step. Review the mapped fields and fix any mismatches before confirming.' },
        ],
      },
      {
        heading: 'Reading the dashboard',
        steps: [
          { text: 'The top row shows headline KPIs (Spend, Impressions, Clicks, CTR, CPM, CPC) for the full dataset.' },
          { text: 'Use the Channels filter (top left) to isolate one channel at a time. Use Funnel Stage to filter by Awareness / Consideration / Conversion.' },
          { text: 'The metric selector lets you pin the specific KPIs most relevant to your campaign type — e.g. CPM and VTR for awareness, CPC and CTR for consideration.' },
          { text: 'When you set a Funnel Stage filter to a single stage, the default metrics auto-switch to match — Awareness shows CPM/VTR, Consideration shows CPC/CTR, Conversion shows CVR/ROAS.' },
          { text: 'Each KPI card has a small ? button — hover it to see a plain-English explanation of that metric.' },
        ],
      },
      {
        heading: 'AI Insights from the dashboard',
        steps: [
          { text: 'Click "AI Insights" in the nav — it uses the same uploaded data and sends a structured summary to Claude for analysis.' },
          { text: 'See the AI Insight Generator section below for how to use that tool.' },
        ],
      },
    ],
    tips: [
      'LinkedIn CSV exports use UTF-16 encoding and include 4–5 metadata rows above the real data. The tool strips these automatically — upload the file as-is, no manual editing needed.',
      'If a column is not detected, it shows as "unmapped" in the mapping step. You can manually assign it to the right field there.',
      'The dashboard remembers your last uploaded data for the session — you don\'t need to re-upload if you switch to another tool and come back.',
    ],
  },
  {
    id: 'insights',
    title: 'AI Insight Generator',
    subtitle: 'Upload paid media data and get a full strategic analysis from Claude — channel performance, top opportunities, watch points and more.',
    accentHex: '#7C3AED',
    href: '/insights',
    groups: [
      {
        heading: 'Getting started',
        steps: [
          { text: 'Open AI Insights. Drop a CSV, XLSX file or paste a Google Sheet URL — the same formats as the Dashboard.' },
          { text: 'The tool reads the file and shows a data summary: row count, date range, channels and markets detected.' },
        ],
      },
      {
        heading: 'Setting up the analysis',
        steps: [
          { text: 'Before generating, use the Client selector to pick the right context: Generic (any account), Rituals, or Lineage. Each client has pre-built analysis types relevant to how they report.' },
          { text: 'Select one or more Analysis types — these are multi-select pills. For example, pick "Creative A vs B performance" and "Week vs week performance" together to get a report focused on both.', note: 'These tell Claude what angle to prioritise. They don\'t filter the data — Claude still sees all of it.' },
          { text: 'Use the "Extra direction" text box for any context that isn\'t covered by the pills — e.g. "Campaign A used image assets, Campaign B used video" or "Week 1 was a test budget, ignore it in the trend analysis".' },
          { text: 'Toggle Deep mode on/off. Haiku (off) is faster and cheaper. Sonnet (on) gives a more thorough, nuanced analysis — use it for client-facing reports.' },
          { text: 'Click "✦ Generate insights".' },
        ],
      },
      {
        heading: 'Reading the output',
        steps: [
          { text: 'The output is structured into sections: Executive Summary, Awareness / Consideration / Conversion Performance (whichever data is present), Top Opportunities, and Watch Points.' },
          { text: 'Every bullet point references a specific number from your data — no generic statements.' },
          { text: 'Click "Copy text" (top right of the output) to copy the full analysis as plain text — use it in a client email, slide deck or ritual document.' },
          { text: 'Click "New analysis" to start over with a different file or different focus.' },
          { text: 'The KPI Guide panel on the right (collapsible) shows the recommended core/secondary/diagnostic metrics per channel and funnel phase — use it as a reference while reading the output.' },
        ],
      },
    ],
    tips: [
      'The analysis always uses the currency detected in your data (£, $ or €). If the wrong currency appears, check that the raw data file contains the right currency symbol in the values.',
      'For Lineage: select the Lineage client and pick MQL/SQL analysis types. Claude will focus on pipeline metrics rather than standard digital KPIs.',
      'For Rituals: select Creative A vs B + Week vs week together. Add extra direction to clarify which creative is which — Claude can\'t infer that from the data alone.',
      'Deep mode (Sonnet) uses roughly 3× the tokens of Haiku. For exploratory work use Haiku; for final client-facing reports switch to Sonnet.',
    ],
  },
];

function StepItem({ step, index }: { step: Step; index: number }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-600">
        {index + 1}
      </span>
      <div>
        <p className="text-sm text-ink-700 leading-relaxed">{step.text}</p>
        {step.note && (
          <p className="mt-1 rounded-md bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs text-amber-700">
            {step.note}
          </p>
        )}
      </div>
    </li>
  );
}

export default function GuidePage() {
  return (
    <div className="h-full overflow-y-auto bg-ink-50">
      {/* Header */}
      <div className="border-b border-ink-100 bg-white px-8 py-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">NMQ Toolkit — User Guide</h1>
        <p className="mt-2 text-sm text-ink-500 max-w-xl mx-auto">
          Everything you need to know to use all four tools from scratch. Jump to any section using the links below.
        </p>
        {/* Jump links */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-ink-200 bg-white px-4 py-1.5 text-xs font-semibold text-ink-600 transition hover:border-ink-400 hover:text-ink-900"
            >
              {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-16">
        {SECTIONS.map((section) => (
          <div key={section.id} id={section.id} className="scroll-mt-16">
            {/* Section header */}
            <div className="mb-6 flex items-start gap-4">
              <div
                className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: section.accentHex + '18' }}
              >
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: section.accentHex }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-extrabold text-ink-900">{section.title}</h2>
                  <Link
                    href={section.href}
                    className="rounded-full px-3 py-0.5 text-[11px] font-bold transition hover:opacity-80"
                    style={{ backgroundColor: section.accentHex + '18', color: section.accentHex }}
                  >
                    Open →
                  </Link>
                </div>
                <p className="mt-1 text-sm text-ink-500">{section.subtitle}</p>
              </div>
            </div>

            {/* Step groups */}
            <div className="space-y-6">
              {section.groups.map((group, gi) => (
                group.steps.length > 0 && (
                  <div key={gi} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
                    {group.heading && group.heading !== 'Tips' && (
                      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-400">{group.heading}</h3>
                    )}
                    <ol className="space-y-3">
                      {group.steps.map((step, si) => (
                        <StepItem key={si} step={step} index={si} />
                      ))}
                    </ol>
                  </div>
                )
              ))}

              {/* Tips */}
              {section.tips && section.tips.length > 0 && (
                <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-400">Tips & gotchas</h3>
                  <ul className="space-y-2.5">
                    {section.tips.map((tip, ti) => (
                      <li key={ti} className="flex gap-3 text-sm text-ink-600 leading-relaxed">
                        <span className="mt-1 flex-shrink-0 text-base leading-none" style={{ color: section.accentHex }}>▸</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Footer note */}
        <div className="rounded-2xl border border-ink-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-ink-700">Something not covered here?</p>
          <p className="mt-1 text-xs text-ink-400">
            Each tool has a context-sensitive <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-white text-[10px] font-bold">?</span> guide button that explains the current screen. Check the bottom-right corner of any tool.
          </p>
        </div>
      </div>
    </div>
  );
}
