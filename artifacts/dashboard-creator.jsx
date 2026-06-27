import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Sparkles, AlertCircle, Loader2,
} from "lucide-react";

// ── Mock data ──────────────────────────────────────────────────────────────
// Shape assumption (flagged per the brief): `markets` is extended with
// plannedConversions/actualConversions so the breakdown table has real
// numbers to show — the brief's sample only had `budget` on the planned
// side. Swap this for whatever the actual Media Plan Builder export /
// MCP pull produces; the component only reads the fields below.

const MOCK_PLANNED = {
  scenarios: [{
    name: "Q3 EU Lead Gen",
    markets: [
      { market: "DE", channel: "YouTube", goal: "Conversion", budget: 8000, plannedConversions: 64 },
      { market: "FR", channel: "Search", goal: "Conversion", budget: 6000, plannedConversions: 90 },
      { market: "NL", channel: "LinkedIn", goal: "Conversion", budget: 4000, plannedConversions: 28 },
    ],
    periods: [
      { label: "Week 1", impressions: 480000, clicks: 4200, sessions: 3400, conversions: 42 },
      { label: "Week 2", impressions: 510000, clicks: 4500, sessions: 3650, conversions: 46 },
      { label: "Week 3", impressions: 495000, clicks: 4350, sessions: 3520, conversions: 44 },
      { label: "Week 4", impressions: 520000, clicks: 4600, sessions: 3720, conversions: 48 },
      { label: "Week 5", impressions: 505000, clicks: 4450, sessions: 3600, conversions: 45 },
      { label: "Week 6", impressions: 530000, clicks: 4700, sessions: 3800, conversions: 49 },
    ],
  }],
};

const MOCK_ACTUAL = {
  scenarios: [{
    name: "Q3 EU Lead Gen",
    markets: [
      { market: "DE", channel: "YouTube", goal: "Conversion", spend: 7600, actualConversions: 58 },
      { market: "FR", channel: "Search", goal: "Conversion", spend: 6400, actualConversions: 102 },
      { market: "NL", channel: "LinkedIn", goal: "Conversion", spend: 3500, actualConversions: 19 },
    ],
    periods: [
      { label: "Week 1", impressions: 440000, clicks: 3900, sessions: 3100, conversions: 38 },
      { label: "Week 2", impressions: 525000, clicks: 4800, sessions: 3900, conversions: 51 },
      { label: "Week 3", impressions: 470000, clicks: 4000, sessions: 3200, conversions: 40 },
      { label: "Week 4", impressions: 560000, clicks: 5100, sessions: 4150, conversions: 56 },
      { label: "Week 5", impressions: 480000, clicks: 4100, sessions: 3300, conversions: 41 },
      { label: "Week 6", impressions: 545000, clicks: 4900, sessions: 3950, conversions: 53 },
    ],
  }],
};

const METRICS = [
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "sessions", label: "Sessions" },
  { key: "conversions", label: "Conversions" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sumMetric(periods, key) {
  return periods.reduce((n, p) => n + (Number(p[key]) || 0), 0);
}

function pctDelta(actual, planned) {
  if (!planned) return null;
  return ((actual - planned) / planned) * 100;
}

function deltaColor(pct) {
  if (pct === null) return "text-ink-400";
  if (pct >= 0) return "text-emerald-600";
  if (pct >= -20) return "text-amber-600";
  return "text-red-600";
}

function deltaBg(pct) {
  if (pct === null) return "bg-gray-50 border-gray-200";
  if (pct >= 0) return "bg-emerald-50 border-emerald-200";
  if (pct >= -20) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function fmtNum(n) {
  return Math.round(n).toLocaleString();
}

function fmtPct(pct) {
  if (pct === null) return "–";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardCreator() {
  const [planned, setPlanned] = useState(MOCK_PLANNED);
  const [actual, setActual] = useState(MOCK_ACTUAL);
  const [plannedText, setPlannedText] = useState("");
  const [actualText, setActualText] = useState("");
  const [parseError, setParseError] = useState("");
  const [activeMetric, setActiveMetric] = useState("conversions");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const scenario = planned.scenarios?.[0];
  const actualScenario = actual.scenarios?.[0];
  const plannedPeriods = scenario?.periods ?? [];
  const actualPeriods = actualScenario?.periods ?? [];
  const markets = scenario?.markets ?? [];
  const actualMarkets = actualScenario?.markets ?? [];

  function loadPlanned() {
    try {
      const parsed = JSON.parse(plannedText);
      setPlanned(parsed);
      setParseError("");
    } catch (e) {
      setParseError(`Couldn't parse planned data: ${e.message}`);
    }
  }

  function loadActual() {
    try {
      const parsed = JSON.parse(actualText);
      setActual(parsed);
      setParseError("");
    } catch (e) {
      setParseError(`Couldn't parse actual data: ${e.message}`);
    }
  }

  // Merge market rows by (market, channel) so the breakdown table shows
  // planned + actual side by side even if the two payloads list markets
  // in a different order.
  const breakdownRows = markets.map((m) => {
    const match = actualMarkets.find((a) => a.market === m.market && a.channel === m.channel) ?? {};
    return {
      market: m.market,
      channel: m.channel,
      plannedBudget: m.budget ?? 0,
      actualSpend: match.spend ?? 0,
      plannedConversions: m.plannedConversions ?? 0,
      actualConversions: match.actualConversions ?? 0,
    };
  });

  // One merged series per metric for the chart, keyed by period label.
  const chartData = plannedPeriods.map((p, i) => ({
    label: p.label,
    planned: p[activeMetric] ?? 0,
    actual: actualPeriods[i]?.[activeMetric] ?? 0,
  }));

  async function generateAnalysis() {
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysis("");
    try {
      const totalsSummary = METRICS.map(({ key, label }) => {
        const p = sumMetric(plannedPeriods, key);
        const a = sumMetric(actualPeriods, key);
        return `${label}: planned ${fmtNum(p)}, actual ${fmtNum(a)} (${fmtPct(pctDelta(a, p))})`;
      }).join("\n");

      const breakdownSummary = breakdownRows.map((r) => (
        `${r.market} / ${r.channel}: budget planned €${r.plannedBudget} vs spent €${r.actualSpend}, `
        + `conversions planned ${r.plannedConversions} vs actual ${r.actualConversions} (${fmtPct(pctDelta(r.actualConversions, r.plannedConversions))})`
      )).join("\n");

      const prompt = `You are a senior paid media strategist reviewing campaign performance for "${scenario?.name ?? "this plan"}" against its original media plan.

Overall KPIs (planned vs actual):
${totalsSummary}

Breakdown by market/channel:
${breakdownSummary}

Identify the top 3 performance gaps (where actual diverges most meaningfully from planned, in either direction) and give one specific, actionable recommendation per gap. Be direct and reference the actual numbers. No generic advice — ground everything in the data above. Keep it under 200 words.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}. This call only works when this component is opened as a Claude.ai artifact, not run standalone.`);
      }

      const data = await response.json();
      const text = data.content?.find((b) => b.type === "text")?.text ?? "";
      setAnalysis(text || "No analysis returned.");
    } catch (e) {
      setAnalysisError(e.message || String(e));
    } finally {
      setAnalysisLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
          <p className="text-sm text-gray-500">{scenario?.name ?? "Planned vs actual"} — gap analysis</p>
        </div>

        {/* 1. Data input panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-gray-700">Load data</h2>
          {parseError && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Media plan JSON (planned)</label>
              <textarea
                value={plannedText}
                onChange={(e) => setPlannedText(e.target.value)}
                placeholder="Paste the planned media plan JSON here..."
                className="h-24 w-full rounded-lg border border-gray-200 p-2 text-xs font-mono outline-none focus:border-gray-400"
              />
              <button
                onClick={loadPlanned}
                disabled={!plannedText.trim()}
                className="mt-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
              >
                Load planned
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Actual performance JSON</label>
              <textarea
                value={actualText}
                onChange={(e) => setActualText(e.target.value)}
                placeholder="Paste actual performance data here..."
                className="h-24 w-full rounded-lg border border-gray-200 p-2 text-xs font-mono outline-none focus:border-gray-400"
              />
              <button
                onClick={loadActual}
                disabled={!actualText.trim()}
                className="mt-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
              >
                Load actual
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">Showing mock data until you load both. Paste valid JSON matching the agreed shape above.</p>
        </div>

        {/* 2. KPI summary cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {METRICS.map(({ key, label }) => {
            const p = sumMetric(plannedPeriods, key);
            const a = sumMetric(actualPeriods, key);
            const pct = pctDelta(a, p);
            const Icon = pct !== null && pct >= 0 ? TrendingUp : TrendingDown;
            return (
              <div key={key} className={`rounded-xl border p-4 ${deltaBg(pct)}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{fmtNum(a)}</p>
                <p className="text-xs text-gray-400">planned {fmtNum(p)}</p>
                <div className={`mt-1 flex items-center gap-1 text-xs font-bold ${deltaColor(pct)}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {fmtPct(pct)}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. Line chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">Planned vs actual over time</h2>
            <div className="flex gap-1">
              {METRICS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveMetric(key)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    activeMetric === key ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="planned" name="Planned" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 4. Breakdown table */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-gray-700">Breakdown by market / channel</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="py-2 pr-4">Market</th>
                  <th className="py-2 pr-4">Channel</th>
                  <th className="py-2 pr-4">Planned budget</th>
                  <th className="py-2 pr-4">Actual spend</th>
                  <th className="py-2 pr-4">Planned conv.</th>
                  <th className="py-2 pr-4">Actual conv.</th>
                  <th className="py-2 pr-4">Delta %</th>
                </tr>
              </thead>
              <tbody>
                {breakdownRows.map((r) => {
                  const pct = pctDelta(r.actualConversions, r.plannedConversions);
                  return (
                    <tr key={`${r.market}-${r.channel}`} className="border-b border-gray-50">
                      <td className="py-2 pr-4 font-semibold text-gray-900">{r.market}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.channel}</td>
                      <td className="py-2 pr-4 text-gray-600">€{fmtNum(r.plannedBudget)}</td>
                      <td className="py-2 pr-4 text-gray-600">€{fmtNum(r.actualSpend)}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.plannedConversions}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.actualConversions}</td>
                      <td className={`py-2 pr-4 font-bold ${deltaColor(pct)}`}>{fmtPct(pct)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. LLM judge panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <Sparkles className="h-4 w-4 text-gray-400" />
              Strategist analysis
            </h2>
            <button
              onClick={generateAnalysis}
              disabled={analysisLoading}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {analysisLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {analysisLoading ? "Analysing…" : "Generate analysis"}
            </button>
          </div>
          {analysisError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {analysisError}
            </div>
          )}
          {analysis && !analysisError && (
            <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800">{analysis}</div>
          )}
          {!analysis && !analysisError && !analysisLoading && (
            <p className="text-xs text-gray-400">Click "Generate analysis" to have Claude review the gaps above and suggest next steps.</p>
          )}
        </div>
      </div>
    </div>
  );
}
