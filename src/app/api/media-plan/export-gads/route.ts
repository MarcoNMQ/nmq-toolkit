import { NextRequest, NextResponse } from 'next/server';
import { buildGadsCsv } from '@/lib/mediaplan/gadsExport';
import type { PlanConfig, Scenario } from '@/lib/mediaplan/types';

export async function POST(req: NextRequest) {
  const { scenario, plan } = await req.json() as { scenario: Scenario; plan: PlanConfig };
  const csv = buildGadsCsv(scenario, plan);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="google_ads_${scenario.name.replace(/[^a-z0-9]+/gi, '_')}.csv"`,
    },
  });
}
