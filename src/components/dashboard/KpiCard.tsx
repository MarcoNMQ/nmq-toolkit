'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  index?: number;
  description?: string;
}

export default function KpiCard({ label, value, sub, accent = '#4F46E5', index = 0, description }: KpiCardProps) {
  const [tipVisible, setTipVisible] = useState(false);

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
      <div className="flex items-center gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
        {description && (
          <div className="relative">
            <button
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ink-100 text-[9px] font-bold text-ink-400 transition hover:bg-ink-200 hover:text-ink-600"
              onMouseEnter={() => setTipVisible(true)}
              onMouseLeave={() => setTipVisible(false)}
              onFocus={() => setTipVisible(true)}
              onBlur={() => setTipVisible(false)}
              tabIndex={0}
              aria-label={`About ${label}`}
            >
              ?
            </button>
            {tipVisible && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-xl">
                {description}
                <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-ink-900" />
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-1.5 text-2xl font-extrabold text-ink-900" style={{ color: accent }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
    </motion.div>
  );
}
