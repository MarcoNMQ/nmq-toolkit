'use client';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { TrendPoint } from '@/lib/dashboard/types';
import { METRIC_DEFS, formatMetric, type MetricKey } from '@/lib/dashboard/metrics';

interface TrendChartProps {
  data: TrendPoint[];
  metric: MetricKey;
  color?: string;
}

export default function TrendChart({ data, metric, color = '#4F46E5' }: TrendChartProps) {
  if (!data.length) return <div className="flex h-48 items-center justify-center text-sm text-ink-400">No data</div>;

  const def = METRIC_DEFS[metric];
  const isPct = def?.format === 'pct';

  // Sample dense data to keep the chart readable
  const displayData = data.length > 90
    ? data.filter((_, i) => i % Math.ceil(data.length / 60) === 0)
    : data;

  // For pct metrics, multiply by 100 so recharts scales the Y axis correctly (e.g. 5 not 0.05)
  const DISPLAY_KEY = '_v';
  const chartData = displayData.map((d) => {
    const raw = (d[metric] ?? 0) as number;
    return { ...d, [DISPLAY_KEY]: isPct ? raw * 100 : raw };
  });

  const tickFormatter = (v: number) => {
    if (isPct) return `${v.toFixed(1)}%`;
    return formatMetric(metric, isPct ? v / 100 : v);
  };

  const tooltipFormatter = (v: unknown) => {
    const n = Number(v);
    return [isPct ? `${n.toFixed(2)}%` : formatMetric(metric, n), def?.label ?? metric];
  };

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
          tickFormatter={tickFormatter}
          width={54}
        />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey={DISPLAY_KEY}
          name={def?.label ?? metric}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
