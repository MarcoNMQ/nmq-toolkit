'use client';

import { useState } from 'react';
import { BENCH_FIELDS, BENCH_HELP, BENCH_IS_PCT, channelKeyFor } from '@/lib/mediaplan/constants';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import type { Channel, ChannelConfig, Goal } from '@/lib/mediaplan/types';

const PRESETS = ['Conservative', 'Average', 'Aggressive'] as const;

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
  const fields = BENCH_FIELDS[`${key}|${goal}`] ?? [];

  async function applyAiPreset(preset: typeof PRESETS[number]) {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/media-plan/ai-bench-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market, channel, goal, liFormat: channelConfig.liFormat, preset, audience, industry }),
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {fields.map((f) => {
          const isPct = BENCH_IS_PCT.has(f);
          const raw = channelConfig.benchmark[f] ?? 0;
          const display = Math.round((isPct ? raw * 100 : raw) * 10000) / 10000;
          return (
            <label key={f} className="flex flex-col gap-0.5 text-xs" title={BENCH_HELP[f]}>
              <span className="font-semibold text-ink-600">{f}{isPct ? ' (%)' : ''}</span>
              <input
                type="number"
                step="any"
                value={display}
                onChange={(e) => {
                  const v = parseFloat(e.target.value) || 0;
                  setField(scenarioId, market, goal, channelConfig.id, f, isPct ? v / 100 : v);
                }}
                className="rounded-md border border-ink-200 px-2 py-1 text-xs outline-none focus:border-brand-500"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
