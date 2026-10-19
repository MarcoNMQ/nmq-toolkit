'use client';

import { useState } from 'react';
import { BENCH_HELP, BENCH_IS_PCT, LI_VIDEO_HELP, benchFieldsFor, channelKeyFor } from '@/lib/mediaplan/constants';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import type { BenchmarkField, Channel, ChannelConfig, Goal } from '@/lib/mediaplan/types';

const PRESETS = ['Conservative', 'Average', 'Aggressive'] as const;
const LI_VIDEO_PRIMARY: BenchmarkField[] = ['cpv', 'view_rate'];

export function BenchmarkEditor({
  scenarioId, market, goal, channel, channelConfig, audience, industry,
}: {
  scenarioId: string; market: string; goal: Goal; channel: Channel; channelConfig: ChannelConfig;
  audience: string; industry: string;
}) {
  const setField = useMediaPlanStore((s) => s.setChannelBenchmarkField);
  const applyPreset = useMediaPlanStore((s) => s.applyBenchPreset);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const key = channelKeyFor(channel, channelConfig.liFormat);
  const fields = benchFieldsFor(key, goal, channelConfig.amazonFormat);
  const isLiVideo = channel === 'LinkedIn' && channelConfig.liFormat === 'Video';
  const primaryFields = isLiVideo ? fields.filter((f) => LI_VIDEO_PRIMARY.includes(f)) : fields;
  const secondaryFields = isLiVideo ? fields.filter((f) => !LI_VIDEO_PRIMARY.includes(f)) : [];
  const cpvMissing = isLiVideo && !(channelConfig.benchmark.cpv ?? 0);
  const vtrMissing = isLiVideo && !(channelConfig.benchmark.view_rate ?? 0);

  async function applyAiPreset(preset: typeof PRESETS[number]) {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/media-plan/ai-bench-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market, channel, goal, liFormat: channelConfig.liFormat, amazonFormat: channelConfig.amazonFormat, preset, audience, industry }),
      });
      if (!res.ok) throw new Error(await res.text());
      const values: Record<string, number> = await res.json();
      Object.entries(values).forEach(([f, v]) => setField(scenarioId, market, goal, channelConfig.id, f, v));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="rounded-md border border-ink-100 bg-ink-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-ink-700">Benchmark assumptions</span>
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={aiLoading}
              onClick={() => applyPreset(scenarioId, market, goal, channelConfig.id, p)}
              className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 hover:bg-ink-100 disabled:opacity-40"
              title={`Apply ${p} preset (static multiplier on market defaults)`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={aiLoading}
            onClick={() => applyAiPreset('Average')}
            className="rounded-full bg-mint-500 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-mint-600 disabled:opacity-40"
            title="Ask Claude for audience/industry-specific benchmarks"
          >
            {aiLoading ? 'Asking AI…' : '✨ AI suggest'}
          </button>
        </div>
      </div>
      {aiError && <p className="mb-2 text-xs text-red-500">{aiError}</p>}
      {isLiVideo && (cpvMissing || vtrMissing) && (
        <p className="mb-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
          Add CPV and view rate to calculate
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {primaryFields.map((f) => renderField(f, isLiVideo))}
      </div>
      {isLiVideo && secondaryFields.length > 0 && (
        <div className="mt-3">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Secondary metrics</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {secondaryFields.map((f) => renderField(f, false))}
          </div>
        </div>
      )}
    </div>
  );

  // `isRequired` only ever applies to LinkedIn Video's CPV/VTR — every
  // other field keeps the original "blank shows as 0, clearing sets 0"
  // behavior unchanged, since no other channel treats a benchmark as
  // "must be filled in, no invented default".
  function renderField(f: BenchmarkField, isRequired: boolean) {
    const isPct = BENCH_IS_PCT.has(f);
    const raw = channelConfig.benchmark[f];
    const showEmpty = isRequired && raw === undefined;
    const display = showEmpty ? '' : Math.round((isPct ? (raw ?? 0) * 100 : (raw ?? 0)) * 10000) / 10000;
    const help = (isLiVideo && LI_VIDEO_HELP[f]) || BENCH_HELP[f];
    return (
      <label key={f} className="flex flex-col gap-0.5 text-xs" title={help}>
        <span className={`font-semibold ${showEmpty ? 'text-amber-700' : 'text-ink-600'}`}>
          {f}{isPct ? ' (%)' : ''}{isRequired ? ' *' : ''}
        </span>
        <input
          type="number"
          step="any"
          value={display}
          placeholder={isRequired ? 'required' : undefined}
          onChange={(e) => {
            const v = e.target.value;
            if (isRequired && v === '') {
              setField(scenarioId, market, goal, channelConfig.id, f, undefined);
              return;
            }
            const n = parseFloat(v) || 0;
            setField(scenarioId, market, goal, channelConfig.id, f, isPct ? n / 100 : n);
          }}
          className={`rounded-md border px-2 py-1 text-xs outline-none focus:border-brand-500 ${showEmpty ? 'border-amber-300' : 'border-ink-200'}`}
        />
      </label>
    );
  }
}
