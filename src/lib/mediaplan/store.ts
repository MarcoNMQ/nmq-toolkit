import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BENCH, BENCH_PRESET_FACTORS, BENCH_FIELDS, LI_FORMAT_BENCH_DEFAULTS, channelKeyFor, type PlanTemplate } from './constants';
import { pctFromMarketBudget } from './budgets';
import type { AiChatKind, Channel, ChannelConfig, ChatMessage, GoalConfig, LinkedInFormat, MarketConfig, PlanConfig, Scenario } from './types';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function newChannelConfig(market: string, channel: Channel, splitPct = 100): ChannelConfig {
  const liFormat: LinkedInFormat | undefined = channel === 'LinkedIn' ? 'Static' : undefined;
  return {
    id: uid(),
    channel,
    splitPct,
    benchmark: {
      ...(BENCH[market]?.[channel] ?? {}),
      ...(liFormat ? LI_FORMAT_BENCH_DEFAULTS[liFormat] : {}),
    },
    liFormat,
  };
}

function newGoalConfig(market: string, goal: GoalConfig['goal'], goalPct = 100): GoalConfig {
  return { goal, goalPct, channels: [] };
}

function newMarketConfig(market: string, pct = 0): MarketConfig {
  return { market, pct, expanded: true, goals: [] };
}

function newScenario(name: string): Scenario {
  return { id: uid(), name, totalBudget: 0, markets: [] };
}

function defaultPlanConfig(): PlanConfig {
  const today = new Date();
  const inThreeMonths = new Date(today.getTime() + 90 * 86400000);
  return {
    campaignName: '',
    audience: 'B2B',
    industry: '',
    startDate: today.toISOString().slice(0, 10),
    endDate: inThreeMonths.toISOString().slice(0, 10),
    breakdown: 'Weekly',
  };
}

// Re-split N items' percentages evenly — used whenever the count of
// goals/channels changes, so a fresh split always starts at 100/N instead
// of carrying over a stale split from a different count.
function evenSplit(n: number): number {
  return n > 0 ? Math.round((100 / n) * 10) / 10 : 0;
}

interface MediaPlanState {
  plan: PlanConfig;
  setPlan: (p: Partial<PlanConfig>) => void;

  scenarios: Scenario[];
  activeScenarioId: string;
  setActiveScenarioId: (id: string) => void;
  addScenario: () => string;
  duplicateScenario: (id: string) => string;
  removeScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  setScenarioBudget: (id: string, totalBudget: number) => void;

  addMarket: (scenarioId: string, market: string) => void;
  removeMarket: (scenarioId: string, market: string) => void;
  setMarketPct: (scenarioId: string, market: string, pct: number) => void;
  setMarketBudgetEuros: (scenarioId: string, market: string, euros: number) => void;
  toggleMarketExpanded: (scenarioId: string, market: string) => void;
  setPinnedMarket: (scenarioId: string, market: string | undefined) => void;

  setMarketGoals: (scenarioId: string, market: string, goals: GoalConfig['goal'][]) => void;
  setGoalPct: (scenarioId: string, market: string, goal: GoalConfig['goal'], pct: number) => void;

  setGoalChannels: (scenarioId: string, market: string, goal: GoalConfig['goal'], channels: Channel[]) => void;
  addChannelInstance: (scenarioId: string, market: string, goal: GoalConfig['goal'], channel: Channel) => void;
  removeChannelInstance: (scenarioId: string, market: string, goal: GoalConfig['goal'], channelId: string) => void;
  setChannelSplitPct: (scenarioId: string, market: string, goal: GoalConfig['goal'], channelId: string, pct: number) => void;
  setChannelSplitPctAndRebalance: (scenarioId: string, market: string, goal: GoalConfig['goal'], channelId: string, pct: number) => void;
  setChannelActiveRange: (scenarioId: string, market: string, goal: GoalConfig['goal'], channelId: string, activeFrom?: string, activeTo?: string) => void;
  setChannelBenchmarkField: (scenarioId: string, market: string, goal: GoalConfig['goal'], channelId: string, field: string, value: number) => void;
  setChannelLiFormat: (scenarioId: string, market: string, goal: GoalConfig['goal'], channelId: string, format: LinkedInFormat) => void;
  applyBenchPreset: (scenarioId: string, market: string, goal: GoalConfig['goal'], channelId: string, preset: 'Conservative' | 'Average' | 'Aggressive') => void;

  // AI chat — global to the plan, not per-scenario (mirrors media_plan.py:
  // insights_chat / recs_chat / bench_chat are flat session keys, not
  // scenario-scoped). Deliberately NOT persisted to localStorage — these
  // are ephemeral conversations, not plan data (mirrors _SKIP_KEYS in the
  // Python source excluding chat from save/load).
  insightsChat: ChatMessage[];
  recsChat: ChatMessage[];
  benchChat: ChatMessage[];
  insightsLast: string;
  recsLast: string;
  appendChat: (kind: AiChatKind, message: ChatMessage) => void;
  clearChat: (kind: AiChatKind) => void;
  setLastText: (kind: 'insights' | 'recs', text: string) => void;

  applyTemplate: (scenarioId: string, template: PlanTemplate) => void;
  loadPlan: (data: { plan: PlanConfig; scenarios: Scenario[] }) => void;
  clearAll: () => void;

  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

const CHAT_KEY: Record<AiChatKind, 'insightsChat' | 'recsChat' | 'benchChat'> = {
  insights: 'insightsChat', recs: 'recsChat', bench: 'benchChat',
};

// Shared tree-walking helper: rebuild a scenario by mapping over one of
// its markets. Keeps every mutator below to a single focused update
// instead of re-deriving the same nested-array-of-arrays traversal.
function updateScenario(scenarios: Scenario[], scenarioId: string, fn: (s: Scenario) => Scenario): Scenario[] {
  return scenarios.map((s) => (s.id === scenarioId ? fn(s) : s));
}
function updateMarket(scenario: Scenario, market: string, fn: (m: MarketConfig) => MarketConfig): Scenario {
  return { ...scenario, markets: scenario.markets.map((m) => (m.market === market ? fn(m) : m)) };
}
function updateGoal(marketCfg: MarketConfig, goal: GoalConfig['goal'], fn: (g: GoalConfig) => GoalConfig): MarketConfig {
  return { ...marketCfg, goals: marketCfg.goals.map((g) => (g.goal === goal ? fn(g) : g)) };
}

export const useMediaPlanStore = create<MediaPlanState>()(
  persist(
    (set, get) => ({
      plan: defaultPlanConfig(),
      setPlan: (p) => set((s) => ({ plan: { ...s.plan, ...p } })),

      scenarios: [],
      activeScenarioId: '',

      setActiveScenarioId: (id) => set({ activeScenarioId: id }),

      addScenario: () => {
        const s = newScenario(`Scenario ${get().scenarios.length + 1}`);
        set((state) => ({ scenarios: [...state.scenarios, s], activeScenarioId: s.id }));
        return s.id;
      },

      duplicateScenario: (id) => {
        const original = get().scenarios.find((s) => s.id === id);
        if (!original) return '';
        const copy: Scenario = { ...structuredClone(original), id: uid(), name: `${original.name} (copy)` };
        set((state) => ({ scenarios: [...state.scenarios, copy], activeScenarioId: copy.id }));
        return copy.id;
      },

      removeScenario: (id) => set((state) => {
        const scenarios = state.scenarios.filter((s) => s.id !== id);
        const activeScenarioId = state.activeScenarioId === id ? (scenarios[0]?.id ?? '') : state.activeScenarioId;
        return { scenarios, activeScenarioId };
      }),

      renameScenario: (id, name) => set((state) => ({
        scenarios: updateScenario(state.scenarios, id, (s) => ({ ...s, name })),
      })),

      setScenarioBudget: (id, totalBudget) => set((state) => ({
        scenarios: updateScenario(state.scenarios, id, (s) => ({ ...s, totalBudget })),
      })),

      addMarket: (scenarioId, market) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => {
          if (s.markets.some((m) => m.market === market)) return s;
          const markets = [...s.markets, newMarketConfig(market)];
          const pct = evenSplit(markets.length);
          return { ...s, markets: markets.map((m) => ({ ...m, pct })) };
        }),
      })),

      removeMarket: (scenarioId, market) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => {
          const markets = s.markets.filter((m) => m.market !== market);
          return { ...s, markets };
        }),
      })),

      setMarketPct: (scenarioId, market, pct) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => ({ ...m, pct }))),
      })),

      setMarketBudgetEuros: (scenarioId, market, euros) => set((state) => {
        const scenario = state.scenarios.find((s) => s.id === scenarioId);
        if (!scenario) return state;
        const pct = pctFromMarketBudget(scenario, euros);
        return {
          scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => ({ ...m, pct }))),
        };
      }),

      toggleMarketExpanded: (scenarioId, market) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => ({ ...m, expanded: !m.expanded }))),
      })),

      setPinnedMarket: (scenarioId, market) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => ({ ...s, pinnedMarket: market })),
      })),

      setMarketGoals: (scenarioId, market, goals) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => {
          const kept = m.goals.filter((g) => goals.includes(g.goal));
          const added = goals.filter((g) => !m.goals.some((existing) => existing.goal === g)).map((g) => newGoalConfig(market, g));
          const next = [...kept, ...added];
          const pct = evenSplit(next.length);
          return { ...m, goals: next.map((g) => ({ ...g, goalPct: pct })) };
        })),
      })),

      setGoalPct: (scenarioId, market, goal, pct) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => ({ ...g, goalPct: pct })))),
      })),

      setGoalChannels: (scenarioId, market, goal, channels) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => {
          // Toggling a channel type off removes ALL instances of that type;
          // toggling one on adds a single fresh instance. Existing instances
          // (including extra ones added via addChannelInstance) are kept as
          // long as their type is still present in `channels`.
          const kept = g.channels.filter((c) => channels.includes(c.channel));
          const added = channels.filter((c) => !g.channels.some((existing) => existing.channel === c)).map((c) => newChannelConfig(market, c));
          const next = [...kept, ...added];
          const pct = evenSplit(next.length);
          return { ...g, channels: next.map((c) => ({ ...c, splitPct: pct })) };
        }))),
      })),

      addChannelInstance: (scenarioId, market, goal, channel) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => {
          const next = [...g.channels, newChannelConfig(market, channel)];
          const pct = evenSplit(next.length);
          return { ...g, channels: next.map((c) => ({ ...c, splitPct: pct })) };
        }))),
      })),

      removeChannelInstance: (scenarioId, market, goal, channelId) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => {
          const next = g.channels.filter((c) => c.id !== channelId);
          const pct = evenSplit(next.length);
          return { ...g, channels: next.map((c) => ({ ...c, splitPct: pct })) };
        }))),
      })),

      // Sets exactly this channel's splitPct, untouched otherwise — used by
      // SplitBar, which already computes both dragged neighbors' new values
      // itself and calls this once per neighbor. Rebalancing here too would
      // double-apply on top of SplitBar's own two-party math.
      setChannelSplitPct: (scenarioId, market, goal, channelId, pct) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => ({
          ...g,
          channels: g.channels.map((c) => (c.id === channelId ? { ...c, splitPct: pct } : c)),
        })))),
      })),

      // Sets this channel's splitPct AND proportionally redistributes the
      // remainder across every OTHER channel in the goal, so the displayed
      // percentages always sum to 100 and match what channelBudget() actually
      // computes — used by the plain "Split %" number input (ChannelSection),
      // which (unlike SplitBar's two-handle drag) only ever touches one field
      // at a time and previously left siblings' displayed % stale/unreconciled.
      setChannelSplitPctAndRebalance: (scenarioId, market, goal, channelId, pct) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => {
          const target = g.channels.find((c) => c.id === channelId);
          if (!target) return g;
          const clamped = Math.min(100, Math.max(0, pct));
          const others = g.channels.filter((c) => c.id !== channelId);
          const remaining = 100 - clamped;
          const othersSum = others.reduce((n, c) => n + c.splitPct, 0);
          return {
            ...g,
            channels: g.channels.map((c) => {
              if (c.id === channelId) return { ...c, splitPct: clamped };
              if (others.length === 0) return c;
              const share = othersSum > 0 ? c.splitPct / othersSum : 1 / others.length;
              return { ...c, splitPct: Math.round(remaining * share * 10) / 10 };
            }),
          };
        }))),
      })),

      setChannelActiveRange: (scenarioId, market, goal, channelId, activeFrom, activeTo) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => ({
          ...g,
          channels: g.channels.map((c) => (c.id === channelId ? { ...c, activeFrom, activeTo } : c)),
        })))),
      })),

      setChannelBenchmarkField: (scenarioId, market, goal, channelId, field, value) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => ({
          ...g,
          channels: g.channels.map((c) => (c.id === channelId ? { ...c, benchmark: { ...c.benchmark, [field]: value } } : c)),
        })))),
      })),

      setChannelLiFormat: (scenarioId, market, goal, channelId, format) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => ({
          ...g,
          // Changing format clears the old benchmark — different formats
          // use overlapping field NAMES for different meanings (e.g. `cpm`
          // means "cost per send" for Sponsored Message), so stale values
          // would silently misrepresent the new format's assumptions.
          // Mirrors _clear_li_bench_keys() in media_plan.py. Layers in
          // LI_FORMAT_BENCH_DEFAULTS on top of the base market benchmark —
          // without it, message/form formats got the plain Sponsored-Content
          // benchmark verbatim (no open_rate/form_completion_rate at all, and
          // a `ctr` meaning something different), producing a near-0-lead
          // funnel until "AI suggest" was clicked.
          channels: g.channels.map((c) => (c.id === channelId ? {
            ...c,
            liFormat: format,
            benchmark: { ...(BENCH[market]?.LinkedIn ?? {}), ...LI_FORMAT_BENCH_DEFAULTS[format] },
          } : c)),
        })))),
      })),

      applyBenchPreset: (scenarioId, market, goal, channelId, preset) => set((state) => {
        const factors = BENCH_PRESET_FACTORS[preset];
        return {
          scenarios: updateScenario(state.scenarios, scenarioId, (s) => updateMarket(s, market, (m) => updateGoal(m, goal, (g) => ({
            ...g,
            channels: g.channels.map((c) => {
              if (c.id !== channelId) return c;
              const liKey = channelKeyFor(c.channel, c.liFormat);
              const fields = BENCH_FIELDS[`${liKey}|${goal}`] ?? [];
              const base = BENCH[market]?.[c.channel] ?? {};
              const benchmark = { ...c.benchmark };
              fields.forEach((f) => {
                const baseValue = base[f];
                const factor = factors[f];
                if (baseValue !== undefined && factor !== undefined) benchmark[f] = baseValue * factor;
              });
              return { ...c, benchmark };
            }),
          })))),
        };
      }),

      insightsChat: [],
      recsChat: [],
      benchChat: [],
      insightsLast: '',
      recsLast: '',
      appendChat: (kind, message) => set((s) => ({ [CHAT_KEY[kind]]: [...s[CHAT_KEY[kind]], message] })),
      clearChat: (kind) => set({ [CHAT_KEY[kind]]: [] }),
      setLastText: (kind, text) => set(kind === 'insights' ? { insightsLast: text } : { recsLast: text }),

      applyTemplate: (scenarioId, template) => set((state) => ({
        scenarios: updateScenario(state.scenarios, scenarioId, (s) => {
          const pct = evenSplit(template.markets.length);
          const goalEntries = Object.entries(template.goals) as [GoalConfig['goal'], Channel[]][];
          const goalPct = evenSplit(goalEntries.length);
          const markets: MarketConfig[] = template.markets.map((market) => ({
            market, pct, expanded: true,
            goals: goalEntries.map(([goal, channels]) => ({
              goal, goalPct,
              channels: channels.map((c) => newChannelConfig(market, c, evenSplit(channels.length))),
            })),
          }));
          return { ...s, totalBudget: template.budget, markets };
        }),
      })),

      loadPlan: (data) => set({
        plan: data.plan,
        // Backfill channel ids for plan files saved before this field existed
        // (the persist `migrate` above only runs on localStorage rehydration,
        // not on an explicit file import).
        scenarios: data.scenarios.map((s) => ({
          ...s,
          markets: s.markets.map((m) => ({
            ...m,
            goals: m.goals.map((g) => ({
              ...g,
              channels: g.channels.map((c) => ({ ...c, id: c.id ?? uid() })),
            })),
          })),
        })),
        activeScenarioId: data.scenarios[0]?.id ?? '',
      }),

      clearAll: () => set({ scenarios: [], activeScenarioId: '', plan: defaultPlanConfig() }),

      mobileSidebarOpen: false,
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
    }),
    {
      name: 'nmq-media-plan-builder-store',
      version: 1,
      // v0 → v1: ChannelConfig gained a stable `id` (needed so a goal can hold
      // multiple instances of the same channel, e.g. two LinkedIn line items).
      // Plans saved before this change have channels with no `id` at all —
      // backfill one so every per-channel store action (which now targets by
      // id, not by channel name) can still find them.
      migrate: (persistedState) => {
        const state = persistedState as { plan: PlanConfig; scenarios: Scenario[]; activeScenarioId: string };
        if (!state?.scenarios) return state;
        return {
          ...state,
          scenarios: state.scenarios.map((s) => ({
            ...s,
            markets: s.markets.map((m) => ({
              ...m,
              goals: m.goals.map((g) => ({
                ...g,
                channels: g.channels.map((c) => ({ ...c, id: c.id ?? uid() })),
              })),
            })),
          })),
        };
      },
      partialize: (state) => ({
        plan: state.plan, scenarios: state.scenarios, activeScenarioId: state.activeScenarioId,
      }),
    },
  ),
);
