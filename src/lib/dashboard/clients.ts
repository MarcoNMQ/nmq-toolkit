import type { ClientConfig } from './types';

export const CLIENT_CONFIGS: Record<string, ClientConfig> = {
  shimano: {
    id: 'shimano',
    name: 'Shimano Fishing',
    accentColor: '#1D9E75',
    sheetId: '1ToVopeGgXL9IVd3QR5EnY_ZmyvXLRkG9jgd2hr8BEuc',
    phases: {
      awareness:     { color: '#7F77DD', label: 'Awareness' },
      consideration: { color: '#1D9E75', label: 'Consideration' },
      conversion:    { color: '#D85A30', label: 'Purchase' },
    },
    breakdownDimLabel: 'Category',
    defaultBreakdownDim: 'category',
    sheets: [
      {
        tabName: 'Year to date 2026',
        platform: 'meta',
        columnMap: {
          'Date':                       'date',
          'Campaign Name':              'campaign_name',
          'Ad Set Name':                'adset_name',
          'Ad Name':                    'ad_name',
          'Country':                    'country',
          'Market':                     'market',
          'Category':                   'category',
          'Channel':                    'channel',
          'Product Name':               'product',
          'Product Family':             'product_family',
          'Key Family':                 'key_family',
          'Optimization Goal':          'funnel_stage',
          'Amount Spent (EUR)':         'spend',
          'Impressions':                'impressions',
          'Clicks (all)':               'clicks',
          'Link Clicks':                'link_clicks',
          'Landing Page Views':         'landing_page_views',
          'Post Engagement':            'engagements',
          'Video Plays':                'video_plays',
          'Video Watches at 100%':      'video_100',
        },
        funnelStageColumn: 'funnel_stage',
        funnelStageMap: {
          'REACH':                                    'awareness',
          'IMPRESSIONS':                              'awareness',
          'POST_ENGAGEMENT':                          'consideration',
          'THRUPLAY':                                 'consideration',
          'TWO_SECOND_CONTINUOUS_VIDEO_VIEWS':        'consideration',
          'LINK_CLICKS':                              'consideration',
          'OFFSITE_CONVERSIONS':                      'conversion',
          'Awareness/Reach':                          'awareness',
          'Awareness':                                'awareness',
          'Reach':                                    'awareness',
          'Post Engagement':                          'consideration',
          'Link Clicks':                              'consideration',
          'Consideration':                            'consideration',
          'Traffic':                                  'consideration',
          'Engagement':                               'consideration',
          'Video Views':                              'consideration',
          'Conversion':                               'conversion',
          'Conversions':                              'conversion',
          'Sales':                                    'conversion',
          'Lead Generation':                          'conversion',
          'Goal Not Found':                           'unknown',
        },
      },
      {
        tabName: 'Google Ads_Year to date_2026',
        platform: 'google_ads',
        columnMap: {
          'Date':            'date',
          'Campaign':        'campaign_name',
          'Ad Group Name':   'adset_name',
          'Ad Name':         'ad_name',
          'Cost (*)':        'spend',
          'Impressions':     'impressions',
          'Clicks':          'clicks',
          'Conversions':     'conversions',
          'Engagements':     'engagements',
          'Video views':     'video_plays',
          'Views (100%)':    'video_100',
          'Country':         'country',
          'Market':          'market',
          'Channel':         'channel',
          'Product Name':    'product',
          'Category':        'category',
          'Product Family':  'product_family',
          'Key Family':      'key_family',
        },
        // Derive funnel stage from the Channel column for Google Ads
        channelToFunnelStage: {
          'YouTube':      'awareness',
          'Video':        'awareness',
          'Demand Gen':   'consideration',
          'Search':       'consideration',
          'Display':      'awareness',
          'Performance Max': 'conversion',
          'Shopping':     'conversion',
        },
      },
    ],
  },
};

export function getClient(id: string): ClientConfig {
  const cfg = CLIENT_CONFIGS[id];
  if (!cfg) throw new Error(`Unknown client: ${id}`);
  return cfg;
}

export const DEFAULT_CLIENT = 'shimano';
