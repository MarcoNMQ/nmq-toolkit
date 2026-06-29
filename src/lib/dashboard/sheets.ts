import { google } from 'googleapis';
import type { AdRow, ClientConfig } from './types';

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var is not set');
  const creds = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

function safeDivide(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

function toNum(val: string | null | undefined): number {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function normalizeDate(raw: string): string {
  if (!raw) return '';
  // Handles "2026-01-15", "15/01/2026", "Jan 15, 2026"
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  // Try DD/MM/YYYY
  const parts = raw.split('/');
  if (parts.length === 3) {
    const iso = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    const d2 = new Date(iso);
    if (!isNaN(d2.getTime())) return iso;
  }
  return raw;
}

async function readTab(
  sheetId: string,
  tabName: string,
  auth: ReturnType<typeof getAuth>
): Promise<string[][]> {
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() as never });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: tabName,
  });
  return (res.data.values ?? []) as string[][];
}

export async function fetchClientRows(client: ClientConfig): Promise<AdRow[]> {
  const auth = getAuth();
  const allRows: AdRow[] = [];

  for (const sheetCfg of client.sheets) {
    const rawValues = await readTab(client.sheetId, sheetCfg.tabName, auth);
    if (rawValues.length < 2) continue;

    const headers = rawValues[0].map((h) => h.trim());
    const dataRows = rawValues.slice(1);

    for (const rawRow of dataRows) {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = rawRow[i] ?? ''; });

      // Skip completely blank rows
      if (!obj['Date'] && !obj['Campaign'] && !obj['Campaign Name']) continue;

      const row: AdRow = {
        date: '',
        campaign_name: '',
        platform: sheetCfg.platform,
        spend: 0,
        impressions: 0,
        clicks: 0,
      };

      // Map columns
      for (const [rawCol, stdField] of Object.entries(sheetCfg.columnMap)) {
        const val = obj[rawCol];
        if (val === undefined || val === '') continue;

        if (stdField === 'date') {
          row.date = normalizeDate(val);
        } else if (stdField === 'funnel_stage') {
          // Handled below
        } else if (
          ['spend','impressions','clicks','link_clicks','landing_page_views',
           'engagements','video_plays','video_25','video_50','video_75','video_100',
           'conversions','revenue'].includes(stdField as string)
        ) {
          (row as unknown as Record<string, number>)[stdField as string] = toNum(val);
        } else {
          (row as unknown as Record<string, string>)[stdField as string] = val;
        }
      }

      // Only include rows from 2026 onwards
      if (row.date && row.date < '2026-01-01') continue;

      // Funnel stage resolution
      if (sheetCfg.funnelStageColumn && sheetCfg.funnelStageMap) {
        const rawStage = obj[
          // Get the original header that maps to funnel_stage
          Object.entries(sheetCfg.columnMap).find(([, v]) => v === 'funnel_stage')?.[0] ?? ''
        ] ?? '';
        row.funnel_stage = sheetCfg.funnelStageMap[rawStage.trim()] ?? 'unknown';
      } else if (sheetCfg.channelToFunnelStage && row.channel) {
        row.funnel_stage = sheetCfg.channelToFunnelStage[row.channel] ?? 'unknown';
      }

      // Normalize multi-product rows (category == product)
      if (row.product && row.category) {
        if (row.product.trim().toLowerCase() === row.category.trim().toLowerCase()) {
          row.product = 'Multi-product';
        }
      }

      // Calculated KPIs
      row.ctr = safeDivide(row.clicks, row.impressions);
      row.cpc = safeDivide(row.spend, row.clicks);
      row.cpm = safeDivide(row.spend, row.impressions) * 1000;
      if (row.revenue) row.roas = safeDivide(row.revenue, row.spend);
      if (row.conversions) row.cvr = safeDivide(row.conversions, row.clicks);
      if (row.video_100 && row.impressions) {
        row.vtr = safeDivide(row.video_100, row.impressions);
      }

      allRows.push(row);
    }
  }

  return allRows;
}
