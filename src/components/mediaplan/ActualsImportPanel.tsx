'use client';

import { useRef, useState } from 'react';
import {
  ACTUALS_FIELDS, autoDetectColumnMap, buildActualsRows, missingRequiredFields, parseCsv, rowsToDicts,
  type ColumnMap,
} from '@/lib/mediaplan/actualsImport';
import { useActualsStore } from '@/lib/mediaplan/actualsStore';
import { Field, Select, TextInput } from '@/components/Field';
import type { ActualsRow } from '@/lib/mediaplan/types';

type Step = 'upload' | 'map' | 'review';

export function ActualsImportPanel({ onClose, defaultClientName }: { onClose: () => void; defaultClientName: string }) {
  const datasets = useActualsStore((s) => s.datasets);
  const addDataset = useActualsStore((s) => s.addDataset);
  const appendRows = useActualsStore((s) => s.appendRows);
  const deleteDataset = useActualsStore((s) => s.deleteDataset);

  const [step, setStep] = useState<Step>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dicts, setDicts] = useState<Record<string, string>[]>([]);
  const [map, setMap] = useState<ColumnMap>({});
  const [built, setBuilt] = useState<{ rows: ActualsRow[]; skipped: { rowIndex: number; reason: string }[]; notices: string[] } | null>(null);
  const [saveMode, setSaveMode] = useState<'new' | 'append'>('new');
  const [newName, setNewName] = useState('');
  const [newClientName, setNewClientName] = useState(defaultClientName);
  const [appendTargetId, setAppendTargetId] = useState(datasets[0]?.id ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      let rawRows: string[][];
      if (file.name.toLowerCase().endsWith('.csv')) {
        rawRows = parseCsv(await file.text());
      } else {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/media-plan/parse-actuals-file', { method: 'POST', body: form });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json() as { rows: string[][] };
        rawRows = data.rows;
      }
      const { headers: h, dicts: d } = rowsToDicts(rawRows);
      if (h.length === 0) throw new Error('No columns found — is this file empty, or missing a header row?');
      setHeaders(h);
      setDicts(d);
      setMap(autoDetectColumnMap(h));
      setStep('map');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this file.');
    } finally {
      setLoading(false);
    }
  }

  function confirmMapping() {
    const missing = missingRequiredFields(map);
    if (missing.length > 0) {
      setError(`Map these required fields before continuing: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setError(null);
    setBuilt(buildActualsRows(dicts, map));
    setStep('review');
  }

  function save() {
    if (!built) return;
    if (saveMode === 'new') {
      if (!newName.trim() || !newClientName.trim()) {
        setError('Name and client name are both required to save a new dataset.');
        return;
      }
      addDataset(newName.trim(), newClientName.trim(), built.rows);
    } else {
      if (!appendTargetId) { setError('Pick a dataset to add these rows to.'); return; }
      appendRows(appendTargetId, built.rows);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink-900">Import actuals</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-400 hover:bg-ink-50" aria-label="Close">✕</button>
        </div>

        {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-xs text-ink-500">Upload a CSV or Excel export of completed campaign results. You&apos;ll map its columns to this app&apos;s fields on the next step.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              disabled={loading}
              className="block w-full text-xs"
            />
            {loading && <p className="text-xs text-ink-400">Reading file…</p>}

            {datasets.length > 0 && (
              <div className="border-t border-ink-100 pt-3">
                <p className="mb-2 text-xs font-bold text-ink-600">Existing datasets</p>
                <div className="space-y-1.5">
                  {datasets.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-md border border-ink-100 px-3 py-2 text-xs">
                      <div>
                        <p className="font-semibold text-ink-800">{d.name}</p>
                        <p className="text-ink-400">{d.clientName} · {d.rows.length} row{d.rows.length === 1 ? '' : 's'}</p>
                      </div>
                      <button
                        onClick={() => { if (window.confirm(`Delete "${d.name}"? This cannot be undone.`)) deleteDataset(d.id); }}
                        className="rounded-md px-1.5 py-1 text-ink-400 hover:bg-red-50 hover:text-red-500"
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-3">
            <p className="text-xs text-ink-500">{dicts.length} rows found. Map each field below to the matching column, or leave optional ones blank if this file doesn&apos;t have them.</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ACTUALS_FIELDS.map((f) => (
                <Field key={f.key} label={`${f.label}${f.required ? ' *' : ''}`}>
                  <Select
                    value={map[f.key] ?? ''}
                    onChange={(e) => setMap((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                  >
                    <option value="">— not in this file —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </Field>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setStep('upload')} className="rounded-md px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-50">Back</button>
              <button onClick={confirmMapping} className="rounded-md bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-600">Continue</button>
            </div>
          </div>
        )}

        {step === 'review' && built && (
          <div className="space-y-4">
            <div className="flex gap-4 text-xs">
              <p><span className="font-bold text-mint-600">{built.rows.length}</span> rows ready to import</p>
              {built.skipped.length > 0 && <p><span className="font-bold text-red-500">{built.skipped.length}</span> rows skipped</p>}
            </div>
            {built.notices.map((n, i) => (
              <p key={i} className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">{n}</p>
            ))}
            {built.skipped.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md border border-ink-100 p-2 text-[11px] text-ink-500">
                {built.skipped.slice(0, 50).map((s, i) => <p key={i}>Row {s.rowIndex}: {s.reason}</p>)}
                {built.skipped.length > 50 && <p>…and {built.skipped.length - 50} more</p>}
              </div>
            )}

            {built.rows.length > 0 && (
              <div className="space-y-2 border-t border-ink-100 pt-3">
                <div className="flex gap-3 text-xs">
                  <label className="flex items-center gap-1"><input type="radio" checked={saveMode === 'new'} onChange={() => setSaveMode('new')} /> New dataset</label>
                  <label className="flex items-center gap-1"><input type="radio" checked={saveMode === 'append'} onChange={() => setSaveMode('append')} disabled={datasets.length === 0} /> Add to existing</label>
                </div>
                {saveMode === 'new' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Dataset name"><TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="2026 campaigns" /></Field>
                    <Field label="Client name"><TextInput value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Acme Robotics" /></Field>
                  </div>
                ) : (
                  <Field label="Dataset">
                    <Select value={appendTargetId} onChange={(e) => setAppendTargetId(e.target.value)}>
                      {datasets.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.clientName})</option>)}
                    </Select>
                  </Field>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setStep('map')} className="rounded-md px-3 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-50">Back</button>
              <button
                onClick={save}
                disabled={built.rows.length === 0}
                className="rounded-md bg-brand-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
