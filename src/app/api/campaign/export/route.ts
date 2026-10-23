import { NextRequest, NextResponse } from 'next/server';
import { buildCsv, buildKeywordsCsv, buildSitelinksCsv } from '@/lib/campaign/builder';
import { buildFbExcel, buildFbAdsOnlyExcel } from '@/lib/campaign/fbBuilder';
import { fbGroupingErrors } from '@/lib/campaign/fbGrouping';
import { buildSearchBundles } from '@/lib/campaign/google/searchBridge';
import { validateSearchBundles } from '@/lib/campaign/google/searchValidation';
import { buildSearchBulkUploadWorkbook } from '@/lib/campaign/google/searchSerializer';
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

    const googleCampaigns = campaigns as GoogleCampaign[];
    const searchCampaigns = googleCampaigns.filter((c) => c.channel === 'Search');
    const otherCampaigns = googleCampaigns.filter((c) => c.channel !== 'Search');

    if (searchCampaigns.length > 0 && otherCampaigns.length > 0) {
      return new NextResponse(
        'This export mixes Search campaigns with YouTube/Demand Gen campaigns. Export Search campaigns separately from other channels (filter by market/channel first) — they use a different, verified Google Ads Bulk Upload format and can\'t safely share one file yet.',
        { status: 422 },
      );
    }

    if (searchCampaigns.length > 0) {
      const bundles = buildSearchBundles(searchCampaigns);
      const errors = validateSearchBundles(bundles);
      if (errors.length > 0) {
        return new NextResponse(errors.join('\n'), { status: 422 });
      }
      const buffer = await buildSearchBulkUploadWorkbook(bundles);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="google_ads_search_bulk_upload.xlsx"',
        },
      });
    }

    const csv = buildCsv(otherCampaigns);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="google_ads_campaigns.csv"',
      },
    });
  }

  if (platform === 'facebook') {
    // Conflicting campaign settings across same-named ad sets would make
    // Meta reject the file or split the campaign — never hand that file out.
    const groupingErrors = fbGroupingErrors(campaigns as FbCampaign[]);
    if (groupingErrors.length > 0) {
      return new NextResponse(groupingErrors.join('\n'), { status: 422 });
    }
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
