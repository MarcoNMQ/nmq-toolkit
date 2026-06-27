import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, Sparkles, AlertCircle, Loader2, ChevronDown,
} from "lucide-react";

// ── Client configs ───────────────────────────────────────────────────────────
// Each client defines: which funnel phases exist, which KPI fields render
// under each phase, and what dimension the breakdown table groups by.
// Shimano's mirrors the real dashboard's structure (Awareness/Consideration/
// Purchase phases, Category breakdown matching its Product Mapping logic) —
// but none of that dashboard's actual data-wrangling (VLOOKUP fallbacks,
// Funnel.io "Product Not Found" handling, video-name matching) lives here.
// This artifact only renders whatever standardized snapshot the existing
// Python pipeline (or any client's equivalent) hands it.

const CLIENT_CONFIGS = {
  shimano: {
    name: "Shimano Fishing",
    industry: "Outdoor / Sporting Goods",
    accent: "#1D9E75",
    phases: {
      Awareness: { color: "#7F77DD", kpis: ["impressions", "reach", "frequency", "cpm", "videoViews", "vtr"] },
      Consideration: { color: "#1D9E75", kpis: ["clicks", "ctr", "cpc", "engagementRate", "sessions", "bounceRate"] },
      Purchase: { color: "#D85A30", kpis: ["conversions", "leads", "revenue", "roas", "cpa", "cvr"] },
    },
    breakdownDimLabel: "Category",
  },
  acme: {
    name: "Acme Corp",
    industry: "B2B SaaS",
    accent: "#2563eb",
    phases: {
      Awareness: { color: "#7F77DD", kpis: ["impressions", "reach", "cpm"] },
      Consideration: { color: "#2563eb", kpis: ["clicks", "ctr", "cpc", "sessions"] },
      Purchase: { color: "#D85A30", kpis: ["conversions", "leads", "cpa", "cvr"] },
    },
    breakdownDimLabel: "Channel",
  },
};

const KPI_LABELS = {
  impressions: "Impressions", reach: "Reach", frequency: "Frequency", cpm: "CPM (€)",
  videoViews: "Video Views", vtr: "VTR", clicks: "Clicks", ctr: "CTR", cpc: "CPC (€)",
  engagementRate: "Engagement Rate", sessions: "Sessions", bounceRate: "Bounce Rate",
  conversions: "Conversions", leads: "Leads", revenue: "Revenue (€)", roas: "ROAS",
  cpa: "CPA (€)", cvr: "CVR",
};

const PCT_KPIS = new Set(["frequency", "vtr", "ctr", "engagementRate", "bounceRate", "cvr", "roas"]);
const EUR_KPIS = new Set(["cpm", "cpc", "revenue", "cpa"]);

function fmtKpi(key, v) {
  if (v == null) return "–";
  if (EUR_KPIS.has(key)) return `€${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (key === "roas") return `${Number(v).toFixed(2)}x`;
  if (PCT_KPIS.has(key)) return `${Number(v).toFixed(2)}%`;
  return Math.round(v).toLocaleString();
}

// ── Mock data per client ──────────────────────────────────────────────────────
// One snapshot per client: a time series + a breakdown table. Real data
// would arrive in this same shape from the standardization pipeline.

const MOCK_DATA = {
  shimano: {
    periods: [
      { label: "Week 1", impressions: 480000, reach: 210000, frequency: 2.3, cpm: 9.2, videoViews: 140000, vtr: 29.1, clicks: 4200, ctr: 0.88, cpc: 1.05, engagementRate: 3.1, sessions: 3400, bounceRate: 41, conversions: 42, leads: 38, revenue: 18900, roas: 2.1, cpa: 104.5, cvr: 1.2 },
      { label: "Week 2", impressions: 510000, reach: 225000, frequency: 2.4, cpm: 9.0, videoViews: 152000, vtr: 29.8, clicks: 4500, ctr: 0.88, cpc: 1.0, engagementRate: 3.3, sessions: 3650, bounceRate: 40, conversions: 46, leads: 41, revenue: 20700, roas: 2.3, cpa: 99.1, cvr: 1.3 },
      { label: "Week 3", impressions: 495000, reach: 218000, frequency: 2.3, cpm: 9.4, videoViews: 144000, vtr: 29.0, clicks: 4350, ctr: 0.88, cpc: 1.08, engagementRate: 3.0, sessions: 3520, bounceRate: 42, conversions: 44, leads: 39, revenue: 19500, roas: 2.0, cpa: 106.8, cvr: 1.2 },
      { label: "Week 4", impressions: 520000, reach: 232000, frequency: 2.4, cpm: 8.8, videoViews: 158000, vtr: 30.4, clicks: 4600, ctr: 0.88, cpc: 0.97, engagementRate: 3.4, sessions: 3720, bounceRate: 39, conversions: 48, leads: 43, revenue: 21800, roas: 2.4, cpa: 93.0, cvr: 1.3 },
    ],
    breakdown: [
      { dim: "Predator", impressions: 380000, clicks: 3200, conversions: 32, revenue: 14200 },
      { dim: "Saltwater", impressions: 290000, clicks: 2400, conversions: 21, revenue: 9800 },
      { dim: "Aero", impressions: 210000, clicks: 1900, conversions: 18, revenue: 7600 },
      { dim: "Tribal", impressions: 125000, clicks: 980, conversions: 9, revenue: 4100 },
    ],
  },
  acme: {
    periods: [
      { label: "Week 1", impressions: 220000, reach: 95000, cpm: 14.2, clicks: 2100, ctr: 0.95, cpc: 1.9, sessions: 1700, conversions: 28, leads: 28, cpa: 129.0, cvr: 1.6 },
      { label: "Week 2", impressions: 235000, reach: 99000, cpm: 13.8, clicks: 2250, ctr: 0.96, cpc: 1.85, sessions: 1820, conversions: 31, leads: 31, cpa: 121.4, cvr: 1.7 },
      { label: "Week 3", impressions: 228000, reach: 97000, cpm: 14.5, clicks: 2180, ctr: 0.96, cpc: 1.92, sessions: 1760, conversions: 29, leads: 29, cpa: 127.3, cvr: 1.6 },
      { label: "Week 4", impressions: 241000, reach: 102000, cpm: 13.5, clicks: 2310, ctr: 0.96, cpc: 1.8, sessions: 1870, conversions: 33, leads: 33, cpa: 115.9, cvr: 1.8 },
    ],
    breakdown: [
      { dim: "LinkedIn", impressions: 140000, clicks: 1300, conversions: 22, revenue: 0 },
      { dim: "Search", impressions: 60000, clicks: 780, conversions: 9, revenue: 0 },
      { dim: "Display", impressions: 35000, clicks: 220, conversions: 2, revenue: 0 },
    ],
  },
};

const PHASE_ALL = "All";

// ── Helpers ──────────────────────────────────────────────────────────────────

function avgKpi(periods, key) {
  const vals = periods.map((p) => p[key]).filter((v) => v != null);
  if (!vals.length) return null;
  // Additive metrics get summed, rate/ratio metrics get averaged — a crude
  // but reasonable split based on the same PCT_KPIS set used for formatting.
  if (PCT_KPIS.has(key)) return vals.reduce((a, b) => a + b, 0) / vals.length;
  return vals.reduce((a, b) => a + b, 0);
}

function trendPct(periods, key) {
  if (periods.length < 2) return null;
  const first = periods[0][key];
  const last = periods[periods.length - 1][key];
  if (!first) return null;
  return ((last - first) / first) * 100;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DashboardCreator() {
  const [clientKey, setClientKey] = useState("shimano");
  const [data, setData] = useState(MOCK_DATA);
  const [activePhase, setActivePhase] = useState(PHASE_ALL);
  const [activeMetric, setActiveMetric] = useState(null);
  const [snapshotText, setSnapshotText] = useState("");
  const [parseError, setParseError] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const config = CLIENT_CONFIGS[clientKey];
  const snapshot = data[clientKey] ?? { periods: [], breakdown: [] };
  const phaseNames = Object.keys(config.phases);
  const activePhases = activePhase === PHASE_ALL ? phaseNames : [activePhase];
  const metric = activeMetric ?? config.phases[activePhases[0]]?.kpis[0];

  function loadSnapshot() {
    try {
      const parsed = JSON.parse(snapshotText);
      setData((prev) => ({ ...prev, [clientKey]: parsed }));
      setParseError("");
    } catch (e) {
      setParseError(`Couldn't parse snapshot: ${e.message}`);
    }
  }

  const chartData = useMemo(
    () => snapshot.periods.map((p) => ({ label: p.label, value: p[metric] })),
    [snapshot, metric],
  );

  async function generateAnalysis() {
    setAnalysisLoading(true);
    setAnalysisError("");
    setAnalysis("");
    try {
      const kpiSummary = activePhases.flatMap((ph) => config.phases[ph].kpis.map((k) => {
        const avg = avgKpi(snapshot.periods, k);
        const trend = trendPct(snapshot.periods, k);
        return `${KPI_LABELS[k] ?? k}: ${fmtKpi(k, avg)} (${trend === null ? "n/a" : `${trend >= 0 ? "+" : ""}${trend.toFixed(1)}% over the period`})`;
      })).join("\n");

      const breakdownSummary = snapshot.breakdown
        .map((r) => `${r.dim}: ${r.impressions?.toLocaleString() ?? "–"} impressions, ${r.clicks?.toLocaleString() ?? "–"} clicks, ${r.conversions ?? "–"} conversions`)
        .join("\n");

      const prompt = `You are a senior paid media strategist reviewing performance for ${config.name} (${config.industry}).

Phase(s) in scope: ${activePhases.join(", ")}

KPI summary:
${kpiSummary}

${config.breakdownDimLabel} breakdown:
${breakdownSummary}

Write a concise analysis (120-180 words): what's working, what's not, and one specific recommendation. Be direct, reference the actual numbers, no generic advice.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}. This call only works when this component is opened as a Claude.ai artifact, not run standalone.`);
      }

      const result = await response.json();
      const text = result.content?.find((b) => b.type === "text")?.text ?? "";
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
        {/* Client selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-sm text-gray-500">{config.industry}</p>
          </div>
          <div className="relative">
            <select
              value={clientKey}
              onChange={(e) => { setClientKey(e.target.value); setActivePhase(PHASE_ALL); setActiveMetric(null); setAnalysis(""); }}
              className="appearance-none rounded-lg border border-gray-200 bg-white px-4 py-2 pr-9 text-sm font-bold text-gray-900"
              style={{ borderColor: config.accent }}
            >
              {Object.entries(CLIENT_CONFIGS).map(([key, c]) => (
                <option key={key} value={key}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Data input */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold text-gray-700">Load snapshot for {config.name}</h2>
          {parseError && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {parseError}
            </div>
          )}
          <textarea
            value={snapshotText}
            onChange={(e) => setSnapshotText(e.target.value)}
            placeholder={`Paste a standardized { periods: [...], breakdown: [...] } snapshot for ${config.name}...`}
            className="h-20 w-full rounded-lg border border-gray-200 p-2 text-xs font-mono outline-none focus:border-gray-400"
          />
          <button
            onClick={loadSnapshot}
            disabled={!snapshotText.trim()}
            className="mt-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30"
            style={{ backgroundColor: config.accent }}
          >
            Load snapshot
          </button>
          <p className="mt-1 text-xs text-gray-400">Showing mock data until you load a real one.</p>
        </div>

        {/* Phase toggle */}
        <div className="flex flex-wrap gap-1.5">
          {[PHASE_ALL, ...phaseNames].map((ph) => (
            <button
              key={ph}
              onClick={() => { setActivePhase(ph); setActiveMetric(null); }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                activePhase === ph ? "text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
              style={activePhase === ph ? { backgroundColor: ph === PHASE_ALL ? "#1f2937" : config.phases[ph].color } : {}}
            >
              {ph}
            </button>
          ))}
        </div>

        {/* KPI cards, grouped by phase */}
        {activePhases.map((ph) => (
          <div key={ph}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: config.phases[ph].color }}>{ph}</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {config.phases[ph].kpis.map((key) => {
                const avg = avgKpi(snapshot.periods, key);
                const trend = trendPct(snapshot.periods, key);
                const Icon = trend !== null && trend >= 0 ? TrendingUp : TrendingDown;
                const isActiveMetric = metric === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveMetric(key)}
                    className={`rounded-xl border p-3 text-left transition ${isActiveMetric ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{KPI_LABELS[key] ?? key}</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{fmtKpi(key, avg)}</p>
                    {trend !== null && (
                      <div className={`mt-0.5 flex items-center gap-1 text-[11px] font-bold ${trend >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        <Icon className="h-3 w-3" />
                        {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Trend chart for the selected metric */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-gray-700">{KPI_LABELS[metric] ?? metric} over time</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => fmtKpi(metric, v)} />
              <Legend />
              <Line type="monotone" dataKey="value" name={KPI_LABELS[metric] ?? metric} stroke={config.accent} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown table */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-bold text-gray-700">Breakdown by {config.breakdownDimLabel}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="py-2 pr-4">{config.breakdownDimLabel}</th>
                  <th className="py-2 pr-4">Impressions</th>
                  <th className="py-2 pr-4">Clicks</th>
                  <th className="py-2 pr-4">Conversions</th>
                  <th className="py-2 pr-4">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.breakdown.map((r) => (
                  <tr key={r.dim} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-semibold text-gray-900">{r.dim}</td>
                    <td className="py-2 pr-4 text-gray-600">{r.impressions?.toLocaleString() ?? "–"}</td>
                    <td className="py-2 pr-4 text-gray-600">{r.clicks?.toLocaleString() ?? "–"}</td>
                    <td className="py-2 pr-4 text-gray-600">{r.conversions ?? "–"}</td>
                    <td className="py-2 pr-4 text-gray-600">{r.revenue ? `€${r.revenue.toLocaleString()}` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI judge panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <Sparkles className="h-4 w-4 text-gray-400" />
              AI insights — {activePhases.join(", ")}
            </h2>
            <button
              onClick={generateAnalysis}
              disabled={analysisLoading}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: config.accent }}
            >
              {analysisLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {analysisLoading ? "Analysing…" : "Generate insights"}
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
            <p className="text-xs text-gray-400">Click "Generate insights" for a Claude-written read of the {activePhases.join("/")} numbers above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
