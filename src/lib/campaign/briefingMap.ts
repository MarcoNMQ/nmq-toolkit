import {
  BID_STRATEGIES, CTAS, MARKET_TO_GROUP, MONTHS,
} from './constants';
import {
  GOAL_CODE_TO_FB_OBJ, GOAL_CODE_TO_GOOGLE_MAIN, MARKET_CODE_TO_COUNTRIES,
  MONTH_CODE_TO_MONTH, PERF_CODE_TO_GOOGLE_PERF, PERF_CODE_TO_OPT,
  CREATIVE_CODE_TO_TYPE, buildYtNames, parseBriefingBudget, parseBriefingDate,
  parseCountriesFromW, type BriefingRow,
} from './briefing';
import type { FbCampaign, GoogleCampaign } from './types';

export function mapBriefingRowToGoogleCampaign(r: BriefingRow): Partial<GoogleCampaign> {
  const month = MONTH_CODE_TO_MONTH[r.month] ?? (MONTHS.includes(r.month) ? r.month : '');
  const mainGoal = GOAL_CODE_TO_GOOGLE_MAIN[r.goal_code] ?? '';
  const perfGoal = PERF_CODE_TO_GOOGLE_PERF[r.perf_code] ?? '';
  const market = r.market_code;
  const countryGroup = MARKET_TO_GROUP[market] ?? '';
  let countries: string[];
  if (market === 'SEU') {
    const fromComments = parseCountriesFromW(r.shimano_comments);
    countries = fromComments.length ? fromComments : (MARKET_CODE_TO_COUNTRIES[market] ?? []);
  } else {
    countries = MARKET_CODE_TO_COUNTRIES[market] ?? [];
  }
  const { campaignName, adsetName } = buildYtNames(r);

  return {
    channel: 'YouTube',
    main_goal: mainGoal,
    perf_goal: perfGoal,
    client_profile: 'Shimano',
    product_category: r.category,
    product_subcategory: r.subcategory,
    product_promoted: r.product,
    key_category: r.key_product === 'KC' ? 'YES' : 'NO',
    market,
    country_group: countryGroup,
    countries,
    location_level: 'campaign',
    month,
    budget: parseBriefingBudget(r.budget),
    start_date: parseBriefingDate(r.start_date),
    end_date: parseBriefingDate(r.end_date),
    cta: CTAS[0] ?? '',
    bid_strategy: BID_STRATEGIES[0] ?? '',
    campaign_name: campaignName,
    adset_name: adsetName,
  };
}

export function mapBriefingRowToFbCampaign(r: BriefingRow): Partial<FbCampaign> {
  const objective = GOAL_CODE_TO_FB_OBJ[r.goal_code] ?? '';
  const [optGoal, billingEvent] = PERF_CODE_TO_OPT[r.perf_code] ?? ['', ''];
  const countries = MARKET_CODE_TO_COUNTRIES[r.market_code] ?? [];
  const start = parseBriefingDate(r.start_date);
  const end = parseBriefingDate(r.end_date);

  return {
    campaign_name: r.campaign_name,
    campaign_status: 'PAUSED',
    campaign_objective: objective,
    buying_type: 'AUCTION',
    budget_type: 'Lifetime',
    budget: parseBriefingBudget(r.budget),
    campaign_start_time: start,
    campaign_stop_time: end,
    adset_name: r.adset_name,
    adset_status: 'PAUSED',
    adset_start_time: start,
    adset_stop_time: end,
    adset_budget_type: 'Lifetime',
    adset_budget: 0,
    countries,
    gender: '',
    age_min: 18,
    age_max: 65,
    publisher_platforms: ['facebook', 'instagram'],
    device_platforms: ['mobile', 'desktop'],
    facebook_positions: ['feed'],
    instagram_positions: ['stream'],
    optimization_goal: optGoal,
    billing_event: billingEvent,
  };
}

export function creativeCodeToFbType(code: string): string {
  return CREATIVE_CODE_TO_TYPE[code] ?? 'Page post ad';
}
