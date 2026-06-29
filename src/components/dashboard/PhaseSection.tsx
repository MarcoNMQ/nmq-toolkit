'use client';
import KpiCard from './KpiCard';
import { METRIC_DEFS, type MetricKey } from '@/lib/dashboard/metrics';
import type { KpiBlock } from '@/lib/dashboard/types';

function fmt(n: number | undefined, type: 'int' | 'eur' | 'pct' | 'dec'): string {
  if (n === undefined || n === null || isNaN(n)) return '—';
  switch (type) {
    case 'int': return n.toLocaleString('en-GB', { maximumFractionDigits: 0 });
    case 'eur': return `€${n.toLocaleString('en-GB', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
    case 'pct': return `${(n * 100).toFixed(2)}%`;
    case 'dec': return n.toFixed(2);
  }
}

interface PhaseSectionProps {
  label: string;
  color: string;
  kpis: KpiBlock;
  phase: 'awareness' | 'consideration' | 'conversion';
}

const PHASE_KPIS: Record<string, Array<{ key: keyof KpiBlock; label: string; type: 'int' | 'eur' | 'pct' | 'dec'; sub?: string }>> = {
  awareness: [
    { key: 'impressions', label: 'Impressions', type: 'int' },
    { key: 'cpm',         label: 'CPM',         type: 'eur', sub: 'cost per 1k impr.' },
    { key: 'video_plays', label: 'Video Views',  type: 'int' },
    { key: 'vtr',         label: 'VTR',          type: 'pct', sub: 'video completion rate' },
    { key: 'engagements', label: 'Engagements',  type: 'int' },
    { key: 'spend',       label: 'Spend',        type: 'eur' },
  ],
  consideration: [
    { key: 'clicks',              label: 'Clicks',             type: 'int' },
    { key: 'ctr',                 label: 'CTR',                type: 'pct' },
    { key: 'cpc',                 label: 'CPC',                type: 'eur' },
    { key: 'landing_page_views',  label: 'Landing Page Views', type: 'int' },
    { key: 'engagements',         label: 'Engagements',        type: 'int' },
    { key: 'spend',               label: 'Spend',              type: 'eur' },
  ],
  conversion: [
    { key: 'conversions', label: 'Conversions', type: 'int' },
    { key: 'cvr',         label: 'CVR',         type: 'pct', sub: 'conversion rate' },
    { key: 'cpc',         label: 'CPC',         type: 'eur' },
    { key: 'roas',        label: 'ROAS',        type: 'dec' },
    { key: 'clicks',      label: 'Clicks',      type: 'int' },
    { key: 'spend',       label: 'Spend',       type: 'eur' },
  ],
};

export default function PhaseSection({ label, color, kpis, phase }: PhaseSectionProps) {
  const cards = PHASE_KPIS[phase] ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color }}>
          {label}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c, i) => (
          <KpiCard
            key={c.key}
            label={c.label}
            value={fmt(kpis[c.key] as number | undefined, c.type)}
            sub={c.sub}
            accent={color}
            index={i}
            description={METRIC_DEFS[c.key as MetricKey]?.description}
          />
        ))}
      </div>
    </div>
  );
}
