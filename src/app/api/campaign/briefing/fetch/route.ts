import { NextRequest, NextResponse } from 'next/server';
import { parseBriefingRawToRows, parseCsv, parseGSheetUrl } from '@/lib/campaign/briefing';

const CHANNEL_SETS: Record<string, Set<string>> = {
  google: new Set(['YT']),
  facebook: new Set(['FBIG', 'FB', 'IG']),
};

export async function POST(req: NextRequest) {
  const { url, gid: gidOverride, channel } = await req.json();
  const channelCodes = CHANNEL_SETS[channel] ?? CHANNEL_SETS.facebook;

  const { sheetId, gid: urlGid } = parseGSheetUrl(url ?? '');
  if (!sheetId) {
    return NextResponse.json({ rows: [], error: 'Could not parse a Google Sheets URL from that input.', debug: '' });
  }
  const gid = gidOverride || urlGid;
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  let text: string;
  try {
    const res = await fetch(exportUrl, { redirect: 'follow' });
    if (!res.ok) {
      return NextResponse.json({ rows: [], error: `HTTP ${res.status} when fetching the sheet.`, debug: '' });
    }
    text = await res.text();
  } catch (e) {
    return NextResponse.json({ rows: [], error: `Request failed: ${e}`, debug: '' });
  }

  const rawRows = parseCsv(text);
  const { rows, debug, headers, dicts, columnMap } = parseBriefingRawToRows(rawRows, channelCodes);
  return NextResponse.json({ rows, error: null, debug, headers, dicts, columnMap });
}
