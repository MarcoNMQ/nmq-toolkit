'use client';

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}

export default function KpiCard({ label, value, sub, accent = '#4F46E5' }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold text-ink-900" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}
