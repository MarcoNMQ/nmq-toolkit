import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { google } from 'googleapis';
import { detectColumns } from '@/lib/dashboard/columnDetect';

// The service account email users need to share their sheet with
export const SERVICE_ACCOUNT_EMAIL =
  'reporting-reader-for-claude@gen-lang-client-0576732174.iam.gserviceaccount.com';

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function extractGid(url: string): string | null {
  const m = url.match(/[#&]gid=(\d+)/);
  return m ? m[1] : null;
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON env var is not set');
  const creds = JSON.parse(raw);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

async function readSheet(sheetId: string, gid?: string | null): Promise<{ columns: string[]; rows: Record<string, string>[]; sheetTabs: string[] }> {
  const auth = getAuth();
  const sheetsApi = google.sheets({ version: 'v4', auth: await auth.getClient() as never });

  // Get spreadsheet metadata to list tabs
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetTabs = (meta.data.sheets ?? []).map((s) => s.properties?.title ?? '').filter(Boolean);

  // Pick the tab: by gid, or first tab
  let tabTitle = sheetTabs[0];
  if (gid) {
    const match = meta.data.sheets?.find((s) => String(s.properties?.sheetId) === gid);
    if (match?.properties?.title) tabTitle = match.properties.title;
  }

  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: tabTitle,
  });

  const values = (res.data.values ?? []) as string[][];
  if (values.length < 2) return { columns: [], rows: [], sheetTabs };

  const columns = values[0].map((h) => String(h).trim()).filter(Boolean);
  const rows = values.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    columns.forEach((col, i) => { obj[col] = row[i] ?? ''; });
    return obj;
  }).filter((r) => Object.values(r).some((v) => v !== ''));

  return { columns, rows, sheetTabs };
}

// Detect BOM and decode UTF-16 / UTF-8 accordingly. Falls back to Windows-1252 when the
// bytes aren't valid UTF-8 — the common case for CSVs saved from Excel on Windows, where a
// currency symbol like € (0x80 in cp1252) is not a valid UTF-8 byte sequence on its own and
// would otherwise get silently mangled into "�", breaking every numeric value that follows it.
function decodeBuffer(buffer: ArrayBuffer): string {
  const b = new Uint8Array(buffer);
  if (b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder('utf-16le').decode(buffer);
  if (b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

// Skip platform metadata rows (LinkedIn, Meta, Google Ads exports put 3-5 header lines
// before the actual column row). Find the first line that contains known data keywords.
const DATA_HEADER_RE = /\b(impression|click|spend|cost|date|campaign|channel|market|ctr|cpc|cpm|conv|roas|reach|view|video|engag|start|end|name)\b/i;
function skipMetadataRows(text: string): string {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (DATA_HEADER_RE.test(lines[i])) return lines.slice(i).join('\n');
  }
  return text;
}

async function parseCsv(text: string): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  const cleaned = skipMetadataRows(text);
  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const columns = result.meta.fields ?? [];
  return { columns, rows: result.data };
}

// Reads every worksheet in the workbook (not just the first tab) and merges them into one
// row set. Real-world exports routinely split data across tabs — e.g. one tab per platform,
// per market, or a "Creatives" tab alongside a "Summary" cover tab — and only reading tab 1
// would silently drop everything else.
async function parseXlsx(buffer: ArrayBuffer): Promise<{ columns: string[]; rows: Record<string, string>[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const allColumns = new Set<string>();
  const allRows: Record<string, string>[] = [];

  for (const ws of wb.worksheets) {
    if (!ws || ws.rowCount < 2) continue;

    const headerRow = ws.getRow(1);
    const columns: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      columns.push(String(cell.value ?? '').trim());
    });
    if (!columns.length) continue;

    // Skip tabs that don't look like tabular ad data (cover pages, notes, legends, etc.)
    if (!DATA_HEADER_RE.test(columns.join(' '))) continue;

    const sheetRows: Record<string, string>[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, string> = {};
      columns.forEach((col, i) => {
        const cell = row.getCell(i + 1);
        let val = cell.value;
        if (val instanceof Date) val = val.toISOString().slice(0, 10);
        else if (val && typeof val === 'object' && 'result' in val) val = String((val as { result: unknown }).result ?? '');
        else if (val && typeof val === 'object' && 'text' in val) val = String((val as { text: unknown }).text ?? '');
        obj[col] = val !== null && val !== undefined ? String(val) : '';
      });
      if (Object.values(obj).some((v) => v !== '')) sheetRows.push(obj);
    });
    if (!sheetRows.length) continue;

    columns.forEach((c) => allColumns.add(c));
    allRows.push(...sheetRows);
  }

  return { columns: [...allColumns], rows: allRows };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    let columns: string[] = [];
    let rows: Record<string, string>[] = [];
    let sheetTabs: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

      const arrayBuf = await file.arrayBuffer();
      const name = file.name.toLowerCase();

      if (name.endsWith('.csv')) {
        const text = decodeBuffer(arrayBuf);
        ({ columns, rows } = await parseCsv(text));
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        ({ columns, rows } = await parseXlsx(arrayBuf));
      } else {
        return NextResponse.json({ error: 'Unsupported file type. Use CSV or XLSX.' }, { status: 400 });
      }
    } else {
      const body = await req.json();
      const { sheetUrl } = body as { sheetUrl: string };
      if (!sheetUrl) return NextResponse.json({ error: 'sheetUrl is required' }, { status: 400 });

      const sheetId = extractSheetId(sheetUrl);
      if (!sheetId) return NextResponse.json({ error: 'Could not extract sheet ID from URL.' }, { status: 400 });

      const gid = extractGid(sheetUrl);
      ({ columns, rows, sheetTabs } = await readSheet(sheetId, gid));
    }

    if (!columns.length) {
      return NextResponse.json({ error: 'No columns found in the data.' }, { status: 400 });
    }

    const detection = detectColumns(columns);

    return NextResponse.json({
      columns,
      rows,
      detection,
      sheetTabs,
      serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
    });
  } catch (err) {
    console.error('[dashboard/ingest]', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    // Surface auth errors cleanly
    const isAuthError = msg.includes('PERMISSION_DENIED') || msg.includes('403') || msg.includes('not have permission');
    return NextResponse.json(
      {
        error: isAuthError
          ? `Permission denied. Make sure the sheet is shared with: ${SERVICE_ACCOUNT_EMAIL}`
          : msg,
      },
      { status: isAuthError ? 403 : 500 }
    );
  }
}
