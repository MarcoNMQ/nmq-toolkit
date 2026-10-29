import { NextRequest, NextResponse } from 'next/server';
import { buildCsv, buildKeywordsCsv, buildSitelinksCsv } from '@/lib/campaign/builder';
import { buildFbExcel, buildFbAdsOnlyExcel, validateFbCampaigns } from '@/lib/campaign/fbBuilder';
import { buildSearchBundles } from '@/lib/campaign/google/searchBridge';
import { validateSearchBundles } from '@/lib/campaign/google/searchValidation';
import { buildSearchBulkUploadWorkbook } from '@/lib/campaign/google/searchSerializer';
import { buildPmaxBundles } from '@/lib/campaign/pmax/pmaxBridge';
import { validatePmaxBundles } from '@/lib/campaign/pmax/pmaxValidation';
import { buildPmaxPackageWorkbook } from '@/lib/campaign/pmax/pmaxPackageBuilder';
import type { FbCampaign, GoogleCampaign } from '@/lib/campaign/types';
import type { PmaxCampaign } from '@/lib/campaign/pmax/pmaxTypes';

/**
 * Channels this route knows how to serialize under `platform: "google"`.
 * Anything outside this set must block export rather than silently falling
 * through to the Demand Gen/YouTube builder (buildCsv hardcodes
 * `Campaign Type = Demand Gen` for every non-Search row). That silent
 * fall-through was the exact P0 bug flagged by the PMAX audit: an unknown
 * or future channel value would previously produce a plausible-looking but
 * semantically wrong file instead of failing closed. Performance Max never
 * reaches this code path at all — it's a separate `pmaxCampaigns` collection
 * exported via `platform: "google_pmax"` below, never mixed with
 * `GoogleCampaign` rows.
 */
const KNOWN_GOOGLE_CHANNELS = new Set(['Search', 'YouTube']);

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

    const unknownChannel = googleCampaigns.filter((c) => !KNOWN_GOOGLE_CHANNELS.has(c.channel));
    if (unknownChannel.length > 0) {
      const names = unknownChannel.map((c) => `"${c.campaign_name || '—'}" (channel: "${c.channel || '(not set)'}")`).join(', ');
      return new NextResponse(
        `Can't export: ${names} ${unknownChannel.length === 1 ? 'has' : 'have'} no recognized channel. ` +
        'Pick Search or YouTube for every campaign before exporting — Performance Max campaigns are exported separately from their own list, not from this screen.',
        { status: 422 },
      );
    }

    const searchCampaigns = googleCampaigns.filter((c) => c.channel === 'Search');
    const otherCampaigns = googleCampaigns.filter((c) => c.channel === 'YouTube');

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

  if (platform === 'google_pmax') {
    // Performance Max is never a Bulk Upload/Editor CSV here — Google's own
    // CSV docs don't define the PMAX campaign-type token, asset-group rows,
    // or listing-group grammar, so claiming "Editor ready" would be a guess.
    // This produces a validated build package instead (see pmaxPackageBuilder).
    const pmaxCampaigns = campaigns as PmaxCampaign[];
    const bundles = buildPmaxBundles(pmaxCampaigns);
    const { errors } = validatePmaxBundles(bundles);
    if (errors.length > 0) {
      return new NextResponse(errors.join('\n'), { status: 422 });
    }
    const buffer = await buildPmaxPackageWorkbook(bundles);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="pmax_build_package.xlsx"',
      },
    });
  }

  if (platform === 'facebook') {
    // validateFbCampaigns covers both field-level requirements (required
    // fields, character limits, image-hash/file-name exclusivity) and
    // cross-ad-set grouping conflicts. Previously only the grouping check
    // ran here, so a campaign missing required fields entirely (blank
    // destination URL, no image, no ad copy, missing objective/countries)
    // could still be exported — the same class of silently-broken-export
    // bug the Search audit fixed.
    const fieldErrors = validateFbCampaigns(campaigns as FbCampaign[]);
    if (fieldErrors.length > 0) {
      return new NextResponse(fieldErrors.join('\n'), { status: 422 });
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
