'use client';

import { Fragment, useMemo, useState } from 'react';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { useActualsStore } from '@/lib/mediaplan/actualsStore';
import { compareScenarioToActuals } from '@/lib/mediaplan/actualsCompare';
import { ActualsImportPanel } from '@/components/mediaplan/ActualsImportPanel';
import { Select } from '@/components/Field';
import type { Scenario } from '@/lib/mediaplan/types';

function fmt(key: string, v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return '–';
  if (key === 'ctr') return `${(v * 100).toFixed(2)}%`;
  if (key === 'Budget' || key === 'cpc') return `€${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return Math.round(v).toLocaleString();
}

function fmtPct(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return '–';
  const pct = (v * 100).toFixed(1);
  return `${v >= 0 ? '+' : ''}${pct}%`;
}

export function ActualsComparisonPanel({ scenario }: { scenario: Scenario }) {
  const plan = useMediaPlanStore((s) => s.plan);
  const datasets = useActualsStore((s) => s.datasets);
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
  const [showImport, setShowImport] = useState(false);

  const dataset = datasets.find((d) => d.id === datasetId);
  const comparisons = useMemo(
    () => (dataset ? compareScenarioToActuals(scenario, plan, dataset.rows) : []),
    [scenario, plan, dataset],
  );

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-900">Plan vs Actuals</h2>
        <div className="flex items-center gap-2">
          {datasets.length > 0 && (
            <Select value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className="text-xs">
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.clientName})</option>)}
            </Select>
          )}
          <button
            onClick={() => setShowImport(true)}
            className="rounded-md border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 hover:bg-ink-50"
          >
            📂 Import actuals…
          </button>
        </div>
      </div>

      {datasets.length === 0 && (
        <p className="rounded-md border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
          No actuals imported yet. Import a CSV or Excel of completed campaign results to compare against this plan.
        </p>
      )}

      {dataset && comparisons.length === 0 && (
        <p className="rounded-md border border-dashed border-ink-200 p-4 text-center text-xs text-ink-400">
          Nothing in &quot;{dataset.name}&quot; matches this scenario&apos;s markets/channels yet — a match needs the same market and channel (and format, for LinkedIn/Amazon Ads).
        </p>
      )}

      {comparisons.map((c, ci) => (
        <div key={ci} className="rounded-md border border-ink-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold text-ink-900">{c.marketLabel} · {c.channelLabel} · {c.goal}</span>
            <span className="text-xs text-ink-400">{c.matchedRowCount} matched row{c.matchedRowCount === 1 ? '' : 's'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-xs">
              <thead>
                <tr className="bg-ink-50 text-left text-ink-500">
                  <th className="px-2 py-1.5 font-semibold">Period</th>
                  {c.periods[0].metrics.map((m) => (
                    <th key={m.key} colSpan={3} className="whitespace-nowrap px-2 py-1.5 text-center font-semibold">{m.label}</th>
                  ))}
                </tr>
                <tr className="bg-ink-50 text-left text-ink-400">
                  <th />
                  {c.periods[0].metrics.map((m) => (
                    <Fragment key={m.key}>
                      <th className="px-2 py-1 font-normal">Planned</th>
                      <th className="px-2 py-1 font-normal">Actual</th>
                      <th className="px-2 py-1 font-normal">Diff</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.periods.map((p, pi) => {
                  const isTotal = p.period === 'TOTAL';
                  return (
                    <tr key={pi} className={`border-t border-ink-50 ${isTotal ? 'bg-mint-100 font-bold text-ink-900' : 'text-ink-700'}`}>
                      <td className="whitespace-nowrap px-2 py-1.5">{p.period}</td>
                      {p.metrics.map((m) => (
                        <Fragment key={m.key}>
                          <td className="whitespace-nowrap px-2 py-1.5">{fmt(m.key, m.planned)}</td>
                          <td className="whitespace-nowrap px-2 py-1.5">{fmt(m.key, m.actual)}</td>
                          <td className="whitespace-nowrap px-2 py-1.5">
                            {fmt(m.key, m.absDiff)} <span className="text-ink-400">({fmtPct(m.pctDiff)})</span>
                          </td>
                        </Fragment>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {showImport && <ActualsImportPanel onClose={() => setShowImport(false)} defaultClientName={plan.clientName ?? ''} />}
    </div>
  );
}
