import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetTabs, parseGSheetUrl } from '@/lib/campaign/briefing';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') ?? '';
  const { sheetId } = parseGSheetUrl(url);
  if (!sheetId) return NextResponse.json({ tabs: [] });
  const tabs = await fetchSheetTabs(sheetId);
  return NextResponse.json({ tabs });
}
