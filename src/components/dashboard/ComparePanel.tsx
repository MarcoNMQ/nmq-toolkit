'use client';
import { useRef, useState } from 'react';
import type { ParsedMediaPlan, CompareResult } from '@/lib/dashboard/mediaPlanTypes';
import { parseMediaPlanFile } from '@/lib/dashboard/mediaPlanParser';
import CompareTrendChart from './CompareTrendChart';
import CompareTable from './CompareTable';

interface Props {
  compareResult: CompareResult | null;
  mediaPlan: ParsedMediaPlan | null;
  onPlanLoaded: (plan: ParsedMediaPlan) => void;
  onPlanRemoved: () => void;
}

function fmtEur(n: number) {
  return `€${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="flex-1 rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold" style={{ color: accent ?? '#111827' }}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

export default function ComparePanel({ compareResult, mediaPlan, onPlanLoaded, onPlanRemoved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError('');
    try {
      const plan = await parseMediaPlanFile(file);
      onPlanLoaded(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse this file.');
    } finally {
      setLoading(false);
    }
  }

  // ── No plan loaded: show dropzone ─────────────────────────────────────────
  if (!mediaPlan || !compareResult) {
    return (
      <div className="space-y-4">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-12 transition-colors ${
            dragging ? 'border-indigo-400 bg-indigo-50' : 'border-ink-200 hover:border-ink-400 hover:bg-ink-50'
          }`}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth={1.75} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          {loading ? (
            <p className="text-sm font-semibold text-ink-500">Parsing media plan…</p>
          ) : (
            <>
              <p className="text-sm font-bold text-ink-800">Load media plan for comparison</p>
              <p className="mt-1 text-xs text-ink-400">Drag & drop or click · JSON (NMQ Toolkit) · XLSX · CSV</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".json,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs text-ink-500">
          <p className="mb-1 font-semibold text-ink-700">What can you load?</p>
          <ul className="list-inside list-disc space-y-0.5">
            <li><strong>NMQ Toolkit JSON</strong> — saved directly from the Media Plan Builder. KPIs are derived automatically from your benchmarks and budget splits.</li>
            <li><strong>CSV or XLSX</strong> — any spreadsheet with columns for channel, phase/goal, budget, and optionally a date/period column for trend comparison.</li>
          </ul>
        </div>
      </div>
    );
  }

  // ── Plan loaded: show comparison ──────────────────────────────────────────
  const overallPacingColor = compareResult.pacing > 1.05 ? '#f97316' : compareResult.pacing < 0.75 ? '#6b7280' : '#10b981';

  return (
    <div className="space-y-6">
      {/* Plan header */}
      <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9zm2 1a.5.5 0 000 1h8a.5.5 0 000-1H4zm0 3a.5.5 0 000 1h8a.5.5 0 000-1H4zm0 3a.5.5 0 000 1h4a.5.5 0 000-1H4z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-ink-900">{mediaPlan.scenarioName}</p>
            <p className="text-xs text-ink-400">
              {mediaPlan.source === 'toolkit' ? 'NMQ Toolkit' : 'External plan'}
              {mediaPlan.dateRange ? ` · ${mediaPlan.dateRange}` : ''}
              {mediaPlan.breakdown ? ` · ${mediaPlan.breakdown}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-50 transition"
          >
            Change plan
          </button>
          <button
            onClick={onPlanRemoved}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition"
          >
            Remove
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".json,.csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </div>

      {/* Summary KPIs */}
      <div className="flex gap-3">
        <SummaryCard label="Planned spend" value={fmtEur(compareResult.totalPlanned)} />
        <SummaryCard label="Actual spend" value={fmtEur(compareResult.totalActual)} accent="#4F46E5" />
        <SummaryCard
          label="Budget pacing"
          value={`${(compareResult.pacing * 100).toFixed(1)}%`}
          sub={compareResult.pacing < 1 ? `${fmtEur(compareResult.totalPlanned - compareResult.totalActual)} remaining` : 'over planned'}
          accent={overallPacingColor}
        />
      </div>

      {/* Trend chart (only when period data exists) */}
      {compareResult.trendPoints.length > 1 && (
        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-sm font-bold text-ink-900">
            Spend trend — Planned vs Actual
          </h4>
          <CompareTrendChart data={compareResult.trendPoints} />
        </div>
      )}

      {/* Breakdown table */}
      <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-sm">
        <h4 className="mb-4 text-sm font-bold text-ink-900">Channel breakdown</h4>
        <CompareTable rows={compareResult.rows} />
      </div>
    </div>
  );
}
