import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const runtime = 'nodejs';

const RED      = 'FFFF4C4C';
const HDR_BG   = 'FF1A1A2E';
const HL_BG    = 'FFF0F4FF';
const LH_BG    = 'FFF0FFF4';
const DESC_BG  = 'FFFFF8F0';

export async function POST(req: NextRequest) {
  const { adName, headlines, longHeadlines, descriptions, isSearch } = await req.json() as {
    adName: string;
    headlines: string[];
    longHeadlines: string[];
    descriptions: string[];
    isSearch: boolean;
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'NMQ Toolkit';
  const ws = wb.addWorksheet('Ad Copy');

  ws.getColumn(1).width = 16;
  ws.getColumn(2).width = 62;
  ws.getColumn(3).width = 12;
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // ── Header ──────────────────────────────────────────────────────────────────
  ws.addRow(['Type', 'Copy', 'Chars']);
  ws.getRow(1).height = 22;
  ['A1', 'B1', 'C1'].forEach((ref) => {
    const cell = ws.getCell(ref);
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: HDR_BG } };
    cell.alignment = { vertical: 'middle', horizontal: ref === 'B1' ? 'left' : 'center' };
  });

  // ── Row builder ─────────────────────────────────────────────────────────────
  function addSection(
    type: string,
    items: string[],
    bg: string,
  ): { start: number; end: number } {
    const start = ws.rowCount + 1;
    for (const text of items) {
      const rowNum = ws.rowCount + 1;
      const row = ws.addRow([
        type,
        text,
        { formula: `LEN(B${rowNum})`, result: text.length },
      ]);
      row.height = 26;
      (['A', 'B', 'C'] as const).forEach((col) => {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      });
      row.getCell('A').font      = { italic: true, color: { argb: 'FF555555' } };
      row.getCell('B').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('C').alignment = { horizontal: 'center', vertical: 'middle' };
    }
    return { start, end: ws.rowCount };
  }

  // ── Content ─────────────────────────────────────────────────────────────────
  const hl = addSection('Headline',      (headlines      ?? []).slice(0, 15).map((h) => h ?? ''), HL_BG);
  let lhStart = 0, lhEnd = 0;
  if (!isSearch) {
    const lh = addSection('Long Headline', (longHeadlines ?? []).slice(0, 5).map((h)  => h ?? ''), LH_BG);
    lhStart = lh.start;
    lhEnd   = lh.end;
  }
  const dc = addSection('Description',   (descriptions   ?? []).slice(0, isSearch ? 4 : 5).map((d) => d ?? ''), DESC_BG);

  // ── Conditional formatting — red fill when over character limit ─────────────
  // CF fill uses bgColor (not fgColor) in exceljs rule styles.
  const redFill = { type: 'pattern' as const, pattern: 'solid' as const, bgColor: { argb: RED } };

  ws.addConditionalFormatting({
    ref: `B${hl.start}:C${hl.end}`,
    rules: [{
      type: 'expression',
      formulae: [`LEN($B${hl.start})>30`],
      style: { fill: redFill },
      priority: 1,
    }],
  });

  if (!isSearch && lhStart > 0) {
    ws.addConditionalFormatting({
      ref: `B${lhStart}:C${lhEnd}`,
      rules: [{
        type: 'expression',
        formulae: [`LEN($B${lhStart})>90`],
        style: { fill: redFill },
        priority: 1,
      }],
    });
  }

  ws.addConditionalFormatting({
    ref: `B${dc.start}:C${dc.end}`,
    rules: [{
      type: 'expression',
      formulae: [`LEN($B${dc.start})>90`],
      style: { fill: redFill },
      priority: 1,
    }],
  });

  // ── Output ──────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const safeName = (adName || 'ad-copy').replace(/[^\w-]/g, '_').slice(0, 50);

  return new NextResponse(buffer as Buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
    },
  });
}
