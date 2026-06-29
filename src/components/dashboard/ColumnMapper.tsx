'use client';
import { useState } from 'react';
import type { ColumnMapping } from '@/lib/dashboard/columnDetect';
import { COLUMN_ALIASES } from '@/lib/dashboard/columnDetect';

const ALL_STD_FIELDS = Object.keys(COLUMN_ALIASES) as Array<keyof typeof COLUMN_ALIASES>;

interface ColumnMapperProps {
  columns: string[];
  initialMapping: ColumnMapping[];
  unmapped: string[];
  onConfirm: (mapping: ColumnMapping[]) => void;
  onBack: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  date: 'Date', campaign_name: 'Campaign Name', adset_name: 'Ad Set/Group',
  ad_name: 'Ad Name', platform: 'Platform', channel: 'Channel',
  market: 'Market', country: 'Country', category: 'Category',
  product: 'Product', product_family: 'Product Family', key_family: 'Key Family',
  funnel_stage: 'Funnel Stage', spend: 'Spend', impressions: 'Impressions',
  clicks: 'Clicks', link_clicks: 'Link Clicks', landing_page_views: 'Landing Page Views',
  engagements: 'Engagements', video_plays: 'Video Plays', video_25: 'Video 25%',
  video_50: 'Video 50%', video_75: 'Video 75%', video_100: 'Video 100%',
  conversions: 'Conversions', revenue: 'Revenue', ctr: 'CTR',
  cpc: 'CPC', cpm: 'CPM', roas: 'ROAS', cvr: 'CVR', vtr: 'VTR',
};

// Fields that are required for the dashboard to render
const REQUIRED_FIELDS = new Set(['date', 'impressions', 'spend', 'clicks']);

export default function ColumnMapper({ columns, initialMapping, unmapped, onConfirm, onBack }: ColumnMapperProps) {
  // mapping: rawColumn → stdField
  const [mapping, setMapping] = useState<ColumnMapping[]>(initialMapping);

  function updateMapping(rawColumn: string, stdField: string) {
    setMapping((prev) => {
      // Remove any existing mapping for this raw column or this std field
      const filtered = prev.filter(
        (m) => m.rawColumn !== rawColumn && m.stdField !== (stdField as keyof typeof COLUMN_ALIASES)
      );
      if (!stdField) return filtered;
      return [...filtered, { rawColumn, stdField: stdField as keyof typeof COLUMN_ALIASES, confidence: 'manual' }];
    });
  }

  const mappedStdFields = new Set(mapping.map((m) => m.stdField));
  const mappedRawCols = new Set(mapping.map((m) => m.rawColumn));
  const missingRequired = [...REQUIRED_FIELDS].filter((f) => !mappedStdFields.has(f as keyof typeof COLUMN_ALIASES));

  const allColumns = [...columns];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-base font-bold text-ink-900">Confirm Column Mapping</h2>
        <p className="mt-1 text-sm text-ink-500">
          We auto-detected {mapping.length} of {columns.length} columns. Review and adjust if needed.
        </p>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4">
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
          ✓ {mapping.length} mapped
        </span>
        {unmapped.length > 0 && (
          <span className="rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-500">
            {unmapped.length} not recognised (will be ignored)
          </span>
        )}
        {missingRequired.length > 0 && (
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
            ⚠ Missing: {missingRequired.join(', ')}
          </span>
        )}
      </div>

      {/* Mapping table */}
      <div className="rounded-xl border border-ink-100 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-2 border-b border-ink-100 bg-ink-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          <span>Your Column</span>
          <span>Maps to</span>
        </div>
        <div className="divide-y divide-ink-50 max-h-96 overflow-y-auto">
          {allColumns.map((col) => {
            const current = mapping.find((m) => m.rawColumn === col);
            return (
              <div key={col} className="grid grid-cols-2 items-center gap-3 px-4 py-2.5">
                <span className="text-sm font-medium text-ink-700 truncate" title={col}>{col}</span>
                <select
                  value={current?.stdField ?? ''}
                  onChange={(e) => updateMapping(col, e.target.value)}
                  className={`w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none ${
                    current
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : 'border-ink-200 bg-white text-ink-500'
                  }`}
                >
                  <option value="">— ignore —</option>
                  {ALL_STD_FIELDS.map((f) => (
                    <option
                      key={f}
                      value={f}
                      disabled={mappedStdFields.has(f) && f !== current?.stdField}
                    >
                      {FIELD_LABELS[f] ?? f}
                      {mappedStdFields.has(f) && f !== current?.stdField ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="rounded-xl border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-50"
        >
          ← Back
        </button>
        <button
          onClick={() => onConfirm(mapping)}
          disabled={missingRequired.length > 0}
          className="flex-1 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-ink-700 disabled:opacity-40"
        >
          {missingRequired.length > 0
            ? `Map required fields first: ${missingRequired.join(', ')}`
            : `Apply mapping and load dashboard →`}
        </button>
      </div>
    </div>
  );
}
