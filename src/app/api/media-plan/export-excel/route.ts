import { NextRequest, NextResponse } from 'next/server';
import { buildExcelAll } from '@/lib/mediaplan/excelExport';
import type { PlanConfig, Scenario } from '@/lib/mediaplan/types';

export async function POST(req: NextRequest) {
  const { scenarios, plan } = await req.json() as { scenarios: Scenario[]; plan: PlanConfig };
  const buffer = await buildExcelAll(scenarios, plan);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${(plan.campaignName || 'media_plan').replace(/[^a-z0-9]+/gi, '_')}.xlsx"`,
    },
  });
}
