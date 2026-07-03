import { NextRequest, NextResponse } from 'next/server';
import { buildCsv, buildKeywordsCsv, buildSitelinksCsv } from '@/lib/campaign/builder';
import { buildFbExcel, buildFbAdsOnlyExcel } from '@/lib/campaign/fbBuilder';
import type { FbCampaign, GoogleCampaign } from '@/lib/campaign/types';

export async function POST(req: NextRequest) {
  const { platform, campaigns, exportType } = await req.json();

  if (platform === 'google') {
    if (exportType === 'keywords') {
      const csv = buildKeywordsCsv(campaigns as GoogleCampaign[]);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="google_ads_keywords.csv"',
        },
      });
    }
    if (exportType === 'sitelinks') {
      const csv = buildSitelinksCsv(campaigns as GoogleCampaign[]);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="google_ads_sitelinks.csv"',
        },
      });
    }
    const csv = buildCsv(campaigns as GoogleCampaign[]);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="google_ads_campaigns.csv"',
      },
    });
  }

  if (platform === 'facebook') {
    const isAdsOnly = exportType === 'fb_ads_only';
    const buffer = isAdsOnly
      ? await buildFbAdsOnlyExcel(campaigns as FbCampaign[])
      : await buildFbExcel(campaigns as FbCampaign[]);
    const filename = isAdsOnly ? 'facebook_ads_only.xlsx' : 'facebook_campaigns.xlsx';
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
}
