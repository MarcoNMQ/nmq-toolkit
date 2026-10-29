'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BENCH_HELP, BENCH_IS_PCT, LI_VIDEO_HELP, benchFieldsFor, channelKeyFor } from '@/lib/mediaplan/constants';
import { useMediaPlanStore } from '@/lib/mediaplan/store';
import { useActualsStore } from '@/lib/mediaplan/actualsStore';
import { suggestBenchmarks } from '@/lib/mediaplan/actualsSuggest';
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
  const setAiBenchmark = useMediaPlanStore((s) => s.setChannelBenchmarkAi);
  const applyPreset = useMediaPlanStore((s) => s.applyBenchPreset);
  const clientName = useMediaPlanStore((s) => s.plan.clientName);
  const datasets = useActualsStore((s) => s.datasets);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  // Guards the auto-suggest effect below against firing twice for the same
  // channel instance (React StrictMode double-invokes effects in dev, and
  // the benchmarkSource flip to 'ai' only lands after the fetch resolves).
  const autoFiredRef = useRef(false);

  const suggestion = useMemo(() => {
    if (!clientName?.trim()) return null;
    return suggestBenchmarks(datasets, {
      clientName: clientName.trim(), channel, goal, liFormat: channelConfig.liFormat, amazonFormat: channelConfig.amazonFormat, market,
    });
  }, [clientName, datasets, channel, goal, channelConfig.liFormat, channelConfig.amazonFormat, market]);

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
      setAiBenchmark(scenarioId, market, goal, channelConfig.id, values);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiLoading(false);
    }
  }

  // Every channel starts on generic, country-only numbers (BENCH[market]).
  // As soon as audience + industry + market are all known for a channel
  // that hasn't been touched yet, calibrate it automatically instead of
  // waiting for someone to notice and click "AI suggest" by hand.
  useEffect(() => {
    const isUntouched = !channelConfig.benchmarkSource || channelConfig.benchmarkSource === 'default';
    if (!isUntouched || !market || !audience?.trim() || !industry?.trim() || autoFiredRef.current) return;
    autoFiredRef.current = true;
    applyAiPreset('Average');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelConfig.id, channelConfig.benchmarkSource, market, audience, industry]);

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
          <button
            type="button"
            onClick={() => setShowSuggest((v) => !v)}
            className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-600 hover:bg-ink-100"
            title="Suggest benchmarks from this client's own historical actuals — local only, no AI"
          >
            📈 Suggest from actuals
          </button>
        </div>
      </div>
      {renderCalibrationStatus()}
      {showSuggest && renderSuggestPanel()}
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

  // Tells the person looking at these numbers where they came from, so
  // "AI suggest" being automatic doesn't read as a black box: a generic
  // market default looks identical to an audience/industry-calibrated one
  // unless something says so.
  function renderCalibrationStatus() {
    if (aiLoading) {
      return (
        <p className="mb-2 rounded-md bg-mint-50 px-2 py-1 text-[11px] font-semibold text-mint-700">
          Calibrating for {audience || 'this audience'} · {industry || 'this industry'} · {market}…
        </p>
      );
    }
    if (channelConfig.benchmarkSource === 'ai') {
      return (
        <p className="mb-2 rounded-md bg-mint-50 px-2 py-1 text-[11px] text-mint-700">
          ✨ AI-calibrated for {audience} · {industry || 'no industry set'} · {market}. Edit any field to override, or re-run AI suggest after changing audience/industry.
        </p>
      );
    }
    if (!audience?.trim() || !industry?.trim()) {
      return (
        <p className="mb-2 rounded-md bg-ink-100 px-2 py-1 text-[11px] text-ink-500">
          Showing generic {market} market defaults. Set audience and industry in the sidebar to auto-calibrate these benchmarks with AI.
        </p>
      );
    }
    return null;
  }

  function renderSuggestPanel() {
    if (!clientName?.trim()) {
      return (
        <p className="mb-2 rounded-md bg-ink-100 px-2 py-1.5 text-[11px] text-ink-500">
          Set a client name in the sidebar to suggest benchmarks from this client&apos;s own historical actuals.
        </p>
      );
    }
    if (!suggestion) {
      return (
        <p className="mb-2 rounded-md bg-ink-100 px-2 py-1.5 text-[11px] text-ink-500">
          No historical data found for {clientName} · {channel} · {goal} in {market}.
        </p>
      );
    }
    const strengthColor = suggestion.matchStrength === 'high' ? 'bg-mint-100 text-mint-700'
      : suggestion.matchStrength === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-ink-100 text-ink-500';
    return (
      <div className="mb-2 rounded-md border border-ink-200 bg-white p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-bold text-ink-700">
            Based on {suggestion.matchedRowCount} matching row{suggestion.matchedRowCount === 1 ? '' : 's'}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${strengthColor}`} title="A rough indicator of sample size and how many dimensions (objective, format, market) were confirmed to match — not a statistical confidence interval.">
            {suggestion.matchStrength} match
          </span>
        </div>
        {suggestion.suggestions.length === 0 ? (
          <p className="text-[11px] text-ink-400">Matching history found, but none of it has the impressions/clicks/views/spend data needed to derive this format&apos;s benchmark fields.</p>
        ) : (
          <div className="space-y-1">
            {suggestion.suggestions.map((s) => {
              const isPct = BENCH_IS_PCT.has(s.field);
              const display = isPct ? `${(s.value * 100).toFixed(2)}%` : s.value.toFixed(4);
              return (
                <div key={s.field} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-ink-600">{s.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-ink-900">{display}</span>
                    <button
                      type="button"
                      onClick={() => setField(scenarioId, market, goal, channelConfig.id, s.field, s.value)}
                      className="rounded-full bg-mint-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-mint-600"
                    >
                      Accept
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <details className="mt-2 text-[11px] text-ink-400">
          <summary className="cursor-pointer font-semibold">Which campaigns were used</summary>
          <ul className="mt-1 space-y-0.5">
            {suggestion.matchedCampaigns.map((c, i) => (
              <li key={i}>{c.campaignName ?? '(unnamed)'} — {c.market ?? 'unknown market'} — {c.dateRange} — €{c.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</li>
            ))}
          </ul>
        </details>
      </div>
    );
  }

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
