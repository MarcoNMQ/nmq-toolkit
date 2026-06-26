import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { parseBriefingRawToRows, parseGSheetUrl, type BriefingRow } from '@/lib/campaign/briefing';

const CHANNEL_SETS: Record<string, Set<string>> = {
  google: new Set(['YT']),
  facebook: new Set(['FBIG', 'FB', 'IG']),
};

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'object' && 'text' in (value as { text?: string })) {
    return String((value as { text?: string }).text ?? '');
  }
  if (typeof value === 'object' && 'result' in (value as { result?: unknown })) {
    return String((value as { result?: unknown }).result ?? '');
  }
  return String(value);
}

export async function POST(req: NextRequest) {
  const { url, channel } = await req.json();
  const channelCodes = CHANNEL_SETS[channel] ?? CHANNEL_SETS.facebook;

  const { sheetId } = parseGSheetUrl(url ?? '');
  if (!sheetId) {
    return NextResponse.json({ rows: [], error: 'Could not parse a Google Sheets URL from that input.', debug: '' });
  }
  const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

  let buffer: ArrayBuffer;
  try {
    const res = await fetch(xlsxUrl, { redirect: 'follow' });
    if (!res.ok) {
      return NextResponse.json({ rows: [], error: `HTTP ${res.status} when downloading workbook.`, debug: '' });
    }
    buffer = await res.arrayBuffer();
  } catch (e) {
    return NextResponse.json({ rows: [], error: `Request failed: ${e}`, debug: '' });
  }

  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);
    const allRows: BriefingRow[] = [];
    const debugParts: string[] = [];
    // For the manual column-mapping UI, we can only represent one sheet's
    // column structure at a time — use whichever tab produced the most
    // data rows as the representative one (most briefing workbooks repeat
    // the same column layout across tabs anyway).
    let bestHeaders: string[] = [];
    let bestDicts: Record<string, string>[] = [];
    let bestColumnMap: Record<string, string> = {};
    let bestCount = -1;

    for (const ws of wb.worksheets) {
      if (['lists', 'sheet1'].includes(ws.name.toLowerCase())) continue;
      const raw: string[][] = [];
      ws.eachRow({ includeEmpty: true }, (row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          cells.push(cellToString(cell.value));
        });
        raw.push(cells);
      });
      const { rows, debug, headers, dicts, columnMap } = parseBriefingRawToRows(raw, channelCodes);
      if (rows.length) {
        allRows.push(...rows);
        debugParts.push(`${ws.name}: ${rows.length} rows (${debug})`);
      }
      if (dicts.length > bestCount) {
        bestCount = dicts.length;
        bestHeaders = headers;
        bestDicts = dicts;
        bestColumnMap = columnMap;
      }
    }

    if (!allRows.length) {
      return NextResponse.json({
        rows: [],
        error: null,
        debug: `Scanned ${wb.worksheets.length} tab(s), no matching rows. Tabs: ${wb.worksheets.map((w) => w.name).join(', ')}`,
        headers: bestHeaders,
        dicts: bestDicts,
        columnMap: bestColumnMap,
      });
    }
    return NextResponse.json({
      rows: allRows,
      error: null,
      debug: `Scanned ${wb.worksheets.length} tabs → ${allRows.length} total rows | ${debugParts.join(', ')}`,
      headers: bestHeaders,
      dicts: bestDicts,
      columnMap: bestColumnMap,
    });
  } catch (e) {
    return NextResponse.json({ rows: [], error: `Could not read workbook: ${e}`, debug: '' });
  }
}
