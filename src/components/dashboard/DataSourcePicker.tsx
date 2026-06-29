'use client';
import { useState, useRef } from 'react';
import type { ColumnMapping } from '@/lib/dashboard/columnDetect';

interface IngestResponse {
  columns: string[];
  rows: Record<string, string>[];
  detection: { mapped: ColumnMapping[]; unmapped: string[] };
  sheetTabs: string[];
  serviceAccountEmail: string;
  error?: string;
}

interface DataSourcePickerProps {
  onData: (data: IngestResponse) => void;
}

export default function DataSourcePicker({ onData }: DataSourcePickerProps) {
  const [mode, setMode] = useState<'upload' | 'sheet'>('upload');
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serviceEmail] = useState('reporting-reader-for-claude@gen-lang-client-0576732174.iam.gserviceaccount.com');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/dashboard/ingest', { method: 'POST', body: form });
      const data: IngestResponse = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Unknown error'); return; }
      onData(data);
    } catch {
      setError('Failed to read file.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSheet() {
    if (!sheetUrl.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });
      const data: IngestResponse = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? 'Unknown error'); return; }
      onData(data);
    } catch {
      setError('Failed to read sheet.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl w-full">
      {/* Mode toggle */}
      <div className="mb-6 flex gap-1 rounded-xl border border-ink-100 bg-white p-1 shadow-sm w-fit">
        {(['upload', 'sheet'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); }}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
              mode === m ? 'bg-ink-900 text-white shadow-sm' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            {m === 'upload' ? '↑ Upload file' : '⬡ Google Sheet'}
          </button>
        ))}
      </div>

      {mode === 'upload' && (
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 bg-white p-12 text-center transition hover:border-ink-400"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <div className="text-4xl">📂</div>
          <div>
            <p className="font-semibold text-ink-900">Drop a file or click to browse</p>
            <p className="mt-1 text-sm text-ink-400">CSV or XLSX — any column layout, we'll detect the KPIs</p>
          </div>
          {loading && <p className="text-sm text-ink-500">Reading file…</p>}
        </div>
      )}

      {mode === 'sheet' && (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-400">Google Sheet URL</label>
            <input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-ink-400 focus:outline-none"
            />
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700 space-y-1">
            <p className="font-semibold">The sheet must be shared with this service account:</p>
            <p className="font-mono break-all select-all">{serviceEmail}</p>
            <p className="text-amber-600">Share with Viewer access — no edit permissions needed.</p>
          </div>

          <button
            onClick={handleSheet}
            disabled={loading || !sheetUrl.trim()}
            className="w-full rounded-xl bg-ink-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-ink-700 disabled:opacity-40"
          >
            {loading ? 'Loading sheet…' : 'Load Sheet'}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
