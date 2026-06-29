'use client';
import { motion } from 'framer-motion';

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  index?: number;
}

export default function KpiCard({ label, value, sub, accent = '#4F46E5', index = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="rounded-xl border border-ink-100 bg-white p-4 shadow-sm cursor-default"
      style={{ '--card-accent': accent } as React.CSSProperties}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px -6px ${accent}30, 0 0 0 1px ${accent}15`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold text-ink-900" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
    </motion.div>
  );
}
