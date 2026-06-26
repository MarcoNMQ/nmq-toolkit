import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { parseBriefingRawToRows, parseCsv } from '@/lib/campaign/briefing';

const CHANNEL_SETS: Record<string, Set<string>> = {
  google: new Set(['YT']),
  facebook: new Set(['FBIG', 'FB', 'IG']),
};

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return String(value);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file') as File | null;
  const channel = String(form.get('channel') ?? 'facebook');
  const channelCodes = CHANNEL_SETS[channel] ?? CHANNEL_SETS.facebook;

  if (!file) {
    return NextResponse.json({ rows: [], error: 'No file uploaded.', debug: '' });
  }

  const name = file.name.toLowerCase();
  try {
    let rawRows: string[][];
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);
      const ws = wb.worksheets[0];
      rawRows = [];
      ws.eachRow({ includeEmpty: true }, (row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => cells.push(cellToString(cell.value)));
        rawRows.push(cells);
      });
    } else {
      const text = await file.text();
      rawRows = parseCsv(text);
    }
    const { rows, debug, headers, dicts, columnMap } = parseBriefingRawToRows(rawRows, channelCodes);
    return NextResponse.json({ rows, error: null, debug, headers, dicts, columnMap });
  } catch (e) {
    return NextResponse.json({ rows: [], error: `Could not read file: ${e}`, debug: '' });
  }
}
