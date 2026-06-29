import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { kpis, byStage, client, dateRange, mode = 'insights' } = body;

  const kpiSummary = (block: Record<string, number | undefined>, label: string) => {
    const lines = [
      `**${label}**`,
      `  Spend: €${(block.spend ?? 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
      `  Impressions: ${(block.impressions ?? 0).toLocaleString('en-GB')}`,
      `  Clicks: ${(block.clicks ?? 0).toLocaleString('en-GB')}`,
      `  CTR: ${((block.ctr ?? 0) * 100).toFixed(2)}%`,
      `  CPM: €${(block.cpm ?? 0).toFixed(2)}`,
      `  CPC: €${(block.cpc ?? 0).toFixed(2)}`,
    ];
    if (block.conversions) lines.push(`  Conversions: ${block.conversions.toLocaleString('en-GB')}`);
    if (block.roas) lines.push(`  ROAS: ${block.roas.toFixed(2)}x`);
    if (block.vtr) lines.push(`  VTR: ${(block.vtr * 100).toFixed(1)}%`);
    return lines.join('\n');
  };

  const context = [
    `Client: ${client}`,
    `Date range: ${dateRange}`,
    '',
    kpiSummary(kpis, 'Overall Totals'),
    '',
    ...(byStage
      ? Object.entries(byStage).map(([stage, block]) =>
          kpiSummary(block as Record<string, number>, `Funnel Stage: ${stage}`)
        )
      : []),
  ].join('\n');

  const prompts: Record<string, string> = {
    insights: `You are a senior paid media strategist at NMQ Digital. Analyse the following performance data and provide 3-5 sharp, specific insights. Focus on what is working, what needs attention, and one clear opportunity the team should act on.

${context}

Format: bullet points, no preamble, no generic statements. Every point must reference a specific number.`,

    recommendations: `You are a senior paid media strategist at NMQ Digital. Based on this performance data, provide 3-4 concrete recommendations for the next campaign period. Be specific about what to change, why, and what outcome to expect.

${context}

Format: numbered list, action-first language ("Increase...", "Shift budget...", "Test..."). Reference actual numbers to justify each recommendation.`,
  };

  const prompt = prompts[mode] ?? prompts.insights;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return NextResponse.json({ text });
  } catch (err) {
    console.error('[dashboard/ai]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI error' },
      { status: 500 }
    );
  }
}
