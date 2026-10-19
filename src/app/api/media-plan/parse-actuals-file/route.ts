import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

// Parses an uploaded .xlsx file's first worksheet into raw rows (array of
// string arrays, header row included) — the same shape actualsImport.ts's
// parseCsv() produces, so the client-side mapping/validation code is
// format-agnostic. CSV files are parsed entirely client-side and never hit
// this route; this exists only because reading .xlsx needs exceljs, which
// already lives server-side for the export routes.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  // exceljs's own .d.ts declares a Buffer type that doesn't structurally
  // match this project's @types/node version (a dependency-version
  // quirk, not a runtime issue) — no cast to the real Buffer type
  // satisfies it, so this one call is cast through `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buf as any);
  const ws = wb.worksheets[0];
  if (!ws) {
    return NextResponse.json({ error: 'Workbook has no worksheets' }, { status: 400 });
  }

  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell.value;
      if (v === null || v === undefined) cells.push('');
      else if (v instanceof Date) cells.push(v.toISOString().slice(0, 10));
      else if (typeof v === 'object' && 'text' in v) cells.push(String((v as { text: unknown }).text ?? ''));
      else if (typeof v === 'object' && 'result' in v) cells.push(String((v as { result: unknown }).result ?? ''));
      else cells.push(String(v));
    });
    rows.push(cells);
  });

  return NextResponse.json({ rows });
}
