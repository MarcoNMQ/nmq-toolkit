'use client';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { CompareTrendPoint } from '@/lib/dashboard/mediaPlanTypes';

interface Props {
  data: CompareTrendPoint[];
}

function fmtEur(v: number) {
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}k`;
  return `€${v.toFixed(0)}`;
}

export default function CompareTrendChart({ data }: Props) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={fmtEur}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          formatter={(v: unknown, name: unknown) => [fmtEur(Number(v)), name === 'planned' ? 'Planned' : 'Actual']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          labelStyle={{ fontWeight: 700, marginBottom: 4 }}
        />
        <Legend
          iconType="line"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => v === 'planned' ? 'Planned' : 'Actual'}
        />
        <Line
          type="monotone"
          dataKey="planned"
          stroke="#d1d5db"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#4F46E5"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
