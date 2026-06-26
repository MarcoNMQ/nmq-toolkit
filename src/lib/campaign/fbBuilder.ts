// Ported 1:1 from shimano_campaign_builder/fb_builder.py — Facebook Excel building + validation

import ExcelJS from 'exceljs';
import { FB_HEADERS, FB_COUNTRY_ISO } from './fbConstants';
import type { FbCampaign } from './types';

/** Convert a YYYY-MM-DD string to MM/DD/YY HH:MM for Facebook. */
function fmtFbDate(dt: string | undefined | null): string {
  if (!dt) return '';
  const s = String(dt);
  if (s.length >= 10 && s[4] === '-') {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${m}/${d}/${y.slice(2)} 00:00`;
  }
  return s;
}

/** Convert internal country codes list to comma-separated ISO codes. */
function toIso(codes: string[]): string {
  return codes.map((c) => FB_COUNTRY_ISO[c] ?? c).join(',');
}

/** Build the Facebook Ads Manager .xlsx file, one row per ad. */
export async function buildFbExcel(campaigns: FbCampaign[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Ads Manager Template');
  ws.addRow(FB_HEADERS);

  for (const camp of campaigns) {
    for (const ad of camp.ads ?? []) {
      const row: Record<string, string> = {};
      for (const h of FB_HEADERS) row[h] = '';

      // Campaign level
      row['Campaign Name'] = camp.campaign_name ?? '';
      row['Campaign Status'] = camp.campaign_status || 'PAUSED';
      row['Special Ad Categories'] = 'none';
      row['Campaign Objective'] = camp.campaign_objective ?? '';
      row['Buying Type'] = camp.buying_type || 'AUCTION';
      row['Campaign Bid Strategy'] = camp.campaign_bid_strategy ?? '';
      row['Tags'] = camp.tags ?? '';
      row['Campaign Start Time'] = fmtFbDate(camp.campaign_start_time);
      row['Campaign Stop Time'] = fmtFbDate(camp.campaign_stop_time);

      if (camp.budget_type === 'Daily') {
        row['Campaign Daily Budget'] = Number(camp.budget ?? 0).toFixed(2);
      } else {
        row['Campaign Lifetime Budget'] = Number(camp.budget ?? 0).toFixed(2);
      }

      // Ad Set level
      row['Ad Set Run Status'] = camp.adset_status || 'PAUSED';
      row['Ad Set Name'] = camp.adset_name ?? '';
      row['Ad Set Time Start'] = fmtFbDate(camp.adset_start_time);
      row['Ad Set Time Stop'] = fmtFbDate(camp.adset_stop_time);

      const adsetBud = camp.adset_budget ?? 0;
      if (adsetBud) {
        if (camp.adset_budget_type === 'Daily') {
          row['Ad Set Daily Budget'] = Number(adsetBud).toFixed(2);
        } else {
          row['Ad Set Lifetime Budget'] = Number(adsetBud).toFixed(2);
        }
      }

      row['Link'] = ad.link ?? '';
      row['Countries'] = toIso(camp.countries ?? []);
      row['Gender'] = camp.gender ?? '';
      row['Age Min'] = camp.age_min ? String(camp.age_min) : '';
      row['Age Max'] = camp.age_max ? String(camp.age_max) : '';
      row['Custom Audiences'] = camp.custom_audiences ?? '';
      row['Excluded Custom Audiences'] = camp.excluded_custom_audiences ?? '';
      row['Publisher Platforms'] = (camp.publisher_platforms ?? []).join(',');
      row['Device Platforms'] = (camp.device_platforms ?? []).join(',');
      row['Facebook Positions'] = (camp.facebook_positions ?? []).join(',');
      row['Instagram Positions'] = (camp.instagram_positions ?? []).join(',');
      row['Optimization Goal'] = camp.optimization_goal ?? '';
      row['Billing Event'] = camp.billing_event ?? '';
      row['Bid Amount'] = camp.bid_amount ? Number(camp.bid_amount).toFixed(2) : '';
      row['Ad Set Bid Strategy'] = camp.adset_bid_strategy ?? '';
      row['Ad Set Minimum Spend Limit'] = camp.adset_min_spend ? Number(camp.adset_min_spend).toFixed(2) : '';
      row['Ad Set Maximum Spend Limit'] = camp.adset_max_spend ? Number(camp.adset_max_spend).toFixed(2) : '';

      // Ad level
      row['Ad Status'] = ad.ad_status || 'PAUSED';
      row['Ad Name'] = ad.ad_name ?? '';
      row['Title'] = ad.title ?? '';
      row['Body'] = ad.body ?? '';
      row['Link Description'] = ad.link_description ?? '';
      row['Display Link'] = ad.display_link ?? '';
      row['Image File Name'] = ad.image_file_name ?? '';
      row['Creative Type'] = ad.creative_type || 'Page post ad';
      row['URL Tags'] = ad.url_tags ?? '';
      row['Call to Action'] = ad.cta ?? '';

      ws.addRow(FB_HEADERS.map((h) => row[h]));
    }
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export function validateFbCampaigns(campaigns: FbCampaign[]): string[] {
  const errors: string[] = [];
  if (!campaigns || campaigns.length === 0) {
    errors.push('Add at least one campaign before exporting.');
    return errors;
  }

  campaigns.forEach((c, i) => {
    const label = `Campaign ${i + 1} (${c.campaign_name || '—'})`;
    if (!c.campaign_name) errors.push(`${label}: Campaign Name is required.`);
    if (!c.adset_name) errors.push(`${label}: Ad Set Name is required.`);
    if (!c.campaign_objective) errors.push(`${label}: Campaign Objective is required.`);
    if (!c.countries || c.countries.length === 0) errors.push(`${label}: Select at least one country.`);
    if (!c.optimization_goal) errors.push(`${label}: Optimization Goal is required.`);
    if (!c.billing_event) errors.push(`${label}: Billing Event is required.`);
    if (!c.ads || c.ads.length === 0) errors.push(`${label}: Add at least one ad.`);

    (c.ads ?? []).forEach((ad, j) => {
      const al = `${label} › Ad ${j + 1} (${ad.ad_name || '—'})`;
      if (!ad.ad_name) errors.push(`${al}: Ad Name is required.`);
      if (!ad.link) errors.push(`${al}: Destination URL is required.`);
      if (!ad.image_file_name) errors.push(`${al}: Image File Name is required.`);
      if (!ad.body) errors.push(`${al}: Body (primary text) is required.`);
      if (ad.title && ad.title.length > 25) errors.push(`${al}: Title is ${ad.title.length} chars (max 25).`);
      if (ad.body && ad.body.length > 500) errors.push(`${al}: Body is ${ad.body.length} chars (max 500).`);
    });
  });

  return errors;
}
