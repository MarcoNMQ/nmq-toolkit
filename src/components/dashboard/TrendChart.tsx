'use client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { TrendPoint } from '@/lib/dashboard/types';

interface TrendChartProps {
  data: TrendPoint[];
  metric: 'impressions' | 'clicks' | 'spend' | 'cpm' | 'ctr';
  color?: string;
}

const METRIC_LABELS: Record<string, string> = {
  impressions: 'Impressions',
  clicks: 'Clicks',
  spend: 'Spend (€)',
  cpm: 'CPM (€)',
  ctr: 'CTR (%)',
};

function formatY(metric: string, val: number): string {
  if (metric === 'impressions' || metric === 'clicks') {
    return val >= 1_000_000
      ? `${(val / 1_000_000).toFixed(1)}M`
      : val >= 1_000
      ? `${(val / 1_000).toFixed(0)}K`
      : String(val);
  }
  if (metric === 'spend' || metric === 'cpm') return `€${val.toFixed(0)}`;
  if (metric === 'ctr') return `${(val * 100).toFixed(2)}%`;
  return String(val);
}

export default function TrendChart({ data, metric, color = '#4F46E5' }: TrendChartProps) {
  if (!data.length) return <div className="flex h-48 items-center justify-center text-sm text-ink-400">No data</div>;

  // For daily data with many points, sample to avoid overloading the chart
  const displayData = data.length > 90
    ? data.filter((_, i) => i % Math.ceil(data.length / 60) === 0)
    : data;

  const chartData = displayData.map((d) => ({
    ...d,
    ctr_pct: d.ctr * 100,
  }));

  const dataKey = metric === 'ctr' ? 'ctr_pct' : metric;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b6b6b' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b6b6b' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatY(metric, v)}
          width={52}
        />
        <Tooltip
          formatter={(val) => [formatY(metric, Number(val)), METRIC_LABELS[metric]]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={METRIC_LABELS[metric]}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
