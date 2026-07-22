import { ALL_GOALS, BENCH_IS_PCT } from './constants';
import { uid } from './store';
import type { Benchmark, BenchmarkField, Channel, ChannelConfig, Goal, GoalConfig, LinkedInFormat, MarketConfig, PlanConfig, Scenario } from './types';

// Converts a plan exported from the OLD Streamlit media plan tool (flat
// session-state keys like `pct_DE_0`, `cpm_DE_LinkedIn_Conversion_0`) into
// this app's normalized shape. The old tool selected goals/channels once
// per SCENARIO and applied them to every market uniformly (`sb_goal_X_sid`
// has no market component) — this importer mirrors that by giving every
// market in the scenario the same goal/channel selection, then layers in
// each market's own % split, goal split, channel split and benchmarks.

// Matches the literal channel-selection order in media_plan.py's
// "goals[goal] = chs" builder (the one that feeds export, not the
// differently-ordered checkbox-row builder used only for the live UI).
const LEGACY_CHANNEL_ORDER: Channel[] = ['YouTube', 'Search', 'LinkedIn', 'Display'];

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function readDate(v: unknown, fallback: string): string {
  if (v && typeof v === 'object' && '__date__' in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>).__date__);
  }
  return fallback;
}

export function isLegacyPlanFile(data: unknown): boolean {
  return !!data && typeof data === 'object' && 'scenario_names' in (data as Record<string, unknown>);
}

export function importLegacyPlan(raw: Record<string, unknown>): { plan: PlanConfig; scenarios: Scenario[] } {
  const plan: PlanConfig = {
    campaignName: String(raw.campaign_name ?? ''),
    audience: raw.audience_type === 'B2C' ? 'B2C' : 'B2B',
    industry: String(raw.industry ?? ''),
    startDate: readDate(raw.start_date, new Date().toISOString().slice(0, 10)),
    endDate: readDate(raw.end_date, new Date().toISOString().slice(0, 10)),
    breakdown: (['Daily', 'Weekly', 'Bi-Weekly', 'Monthly'].includes(String(raw.breakdown)) ? raw.breakdown : 'Weekly') as PlanConfig['breakdown'],
  };

  const scenarioNames = Array.isArray(raw.scenario_names) ? raw.scenario_names as string[] : [];
  const scenarios: Scenario[] = scenarioNames.map((defaultName, sid) => {
    const name = String(raw[`rename_${sid}`] ?? defaultName ?? `Scenario ${sid + 1}`);
    const totalBudget = num(raw[`total_budget_${sid}`]);
    const selectedMarkets = Array.isArray(raw[`selected_markets_${sid}`]) ? raw[`selected_markets_${sid}`] as string[] : [];

    // Goal/channel selection is scenario-wide in the old tool — compute it
    // once, then apply identically to every market below.
    const sharedGoals: { goal: Goal; channels: Channel[] }[] = [];
    ALL_GOALS.forEach((goal) => {
      if (!raw[`sb_goal_${goal}_${sid}`]) return;
      const channelFlags: Record<Channel, string> = { YouTube: 'yt', Search: 's', LinkedIn: 'li', Display: 'dis' };
      const channels = LEGACY_CHANNEL_ORDER.filter((ch) => raw[`sb_${channelFlags[ch]}_${goal}_${sid}`]);
      if (channels.length) sharedGoals.push({ goal, channels });
    });
    const goalPctDefault = sharedGoals.length > 0 ? Math.round((100 / sharedGoals.length) * 10) / 10 : 0;

    const markets: MarketConfig[] = selectedMarkets.map((market) => {
      const pct = num(raw[`pct_${market}_${sid}`], Math.round((100 / selectedMarkets.length) * 10) / 10);
      const expanded = raw[`mkt_exp_${market}_${sid}`] !== false;

      const goals: GoalConfig[] = sharedGoals.map(({ goal, channels }) => {
        const goalPct = num(raw[`goal_pct_${market}_${goal}_${sid}`], goalPctDefault || 100);

        let splitPcts: Record<string, number>;
        if (channels.length === 1) {
          splitPcts = { [channels[0]]: 100 };
        } else if (channels.length === 2) {
          const pctA = num(raw[`split_${market}_${goal}_${sid}`], 50);
          splitPcts = { [channels[0]]: pctA, [channels[1]]: 100 - pctA };
        } else {
          const defaultPct = Math.round((100 / channels.length) * 10) / 10;
          splitPcts = {};
          channels.forEach((ch) => { splitPcts[ch] = num(raw[`split_${market}_${goal}_${ch}_${sid}`], defaultPct); });
        }

        const channelConfigs: ChannelConfig[] = channels.map((channel) => {
          const liFormat = channel === 'LinkedIn'
            ? (raw[`li_fmt_${market}_${goal}_${sid}`] as LinkedInFormat | undefined)
            : undefined;
          const benchmark: Benchmark = {};
          (['cpm', 'cpc', 'ctr', 'view_rate', 'frequency', 'click_to_session', 'conv_rate', 'lead_to_mql', 'mql_to_sql', 'open_rate', 'form_completion_rate'] as BenchmarkField[]).forEach((field) => {
            const key = `${field}_${market}_${channel}_${goal}_${sid}`;
            if (key in raw) {
              const v = num(raw[key]);
              benchmark[field] = BENCH_IS_PCT.has(field) ? v / 100 : v;
            }
          });
          return { id: uid(), channel, splitPct: splitPcts[channel] ?? 0, benchmark, liFormat };
        });

        return { goal, goalPct, channels: channelConfigs };
      });

      return { market, pct, expanded, goals };
    });

    return { id: `legacy-${sid}-${Date.now()}`, name, totalBudget, markets };
  });

  return { plan, scenarios };
}
