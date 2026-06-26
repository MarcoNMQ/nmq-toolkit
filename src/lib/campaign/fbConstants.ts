// Ported 1:1 from shimano_campaign_builder/fb_constants.py — Facebook side

export const FB_CAMPAIGN_OBJECTIVES = [
  'Video Views',
  'Reach',
  'Brand Awareness',
  'Traffic',
  'Post Engagement',
  'Outcome Awareness',
  'Outcome Engagement',
  'Outcome Leads',
  'Outcome Sales',
  'Lead Generation',
  'Website Conversions',
];

export const FB_BUYING_TYPES = ['AUCTION', 'RESERVED'];

export const FB_CAMPAIGN_BID_STRATEGIES = [
  'Highest volume or value',
  'Bid cap',
  'ROAS goal',
];

export const FB_ADSET_BID_STRATEGIES = [
  'Highest volume or value',
  'Bid cap',
  'Highest Value',
];

export const FB_OPTIMIZATION_GOALS = [
  'THRUPLAY',
  'VIDEO_VIEWS',
  'TWO_SECOND_CONTINUOUS_VIDEO_VIEWS',
  'REACH',
  'IMPRESSIONS',
  'LINK_CLICKS',
  'LANDING_PAGE_VIEWS',
  'POST_ENGAGEMENT',
  'PAGE_LIKES',
  'OFFSITE_CONVERSIONS',
  'LEAD_GENERATION',
];

export const FB_BILLING_EVENTS = [
  'IMPRESSIONS',
  'THRUPLAY',
  'VIDEO_VIEWS',
  'TWO_SECOND_CONTINUOUS_VIDEO_VIEWS',
  'LINK_CLICKS',
  'POST_ENGAGEMENT',
];

export const FB_PUBLISHER_PLATFORMS = ['facebook', 'instagram', 'audience_network', 'messenger'];

export const FB_DEVICE_PLATFORMS = ['mobile', 'desktop'];

export const FB_FACEBOOK_POSITIONS = ['feed', 'right_hand_column', 'instant_article', 'instream_video'];

export const FB_INSTAGRAM_POSITIONS = ['stream', 'story'];

export const FB_STATUSES = ['PAUSED', 'ACTIVE'];

export const FB_CREATIVE_TYPES = ['Page post ad', 'Standard'];

export const FB_CTAS = [
  'LEARN_MORE',
  'SHOP_NOW',
  'WATCH_MORE',
  'WATCH_VIDEO',
  'SEE_MORE',
  'SIGN_UP',
  'DOWNLOAD',
  'BOOK_NOW',
  'ORDER_NOW',
  'CONTACT_US',
  'GET_OFFER',
  'LIKE_PAGE',
  'NO_BUTTON',
];

// Map internal country codes → ISO 2-letter codes Facebook expects
export const FB_COUNTRY_ISO: Record<string, string> = {
  UK: 'GB',
  NL: 'NL',
  BE: 'BE',
  DE: 'DE',
  FR: 'FR',
  SE: 'SE',
  PL: 'PL',
  IT: 'IT',
  ES: 'ES',
  PT: 'PT',
  HU: 'HU',
  CZ: 'CZ',
  RO: 'RO',
  LIT: 'LT',
  SLOW: 'SK',
  SLOV: 'SI',
  AUS: 'AT',
  CRO: 'HR',
  NO: 'NO',
  FI: 'FI',
  DK: 'DK',
};

// Full column list matching the Ads Manager template exactly
export const FB_HEADERS = [
  'Campaign ID', 'Campaign Name', 'Campaign Status', 'Special Ad Categories',
  'Special Ad Category Country', 'Campaign Objective', 'Buying Type',
  'Campaign Spend Limit', 'Campaign Daily Budget', 'Campaign Lifetime Budget',
  'Campaign Bid Strategy', 'Tags', 'Campaign Is Using L3 Schedule',
  'Campaign Start Time', 'Campaign Stop Time',
  'Ad Set ID', 'Ad Set Run Status', 'Ad Set Name', 'Ad Set Time Start', 'Ad Set Time Stop',
  'Ad Set Daily Budget', 'Ad Set Lifetime Budget',
  'Link Object ID', 'Link', 'Application ID',
  'Countries', 'Global Regions', 'Excluded Global Regions',
  'Cities', 'Regions', 'Zip',
  'Gender', 'Age Min', 'Age Max',
  'Education Status', 'College Start Year', 'College End Year',
  'Interested In', 'Relationship', 'Connections', 'Excluded Connections',
  'Friends of Connections', 'Locales', 'Broad Category Clusters',
  'Custom Audiences', 'Excluded Custom Audiences',
  'Location Cluster IDs', 'Excluded Location Cluster IDs',
  'Publisher Platforms', 'Device Platforms',
  'Facebook Positions', 'Instagram Positions', 'Messenger Positions',
  'Oculus Positions', 'Audience Network Positions',
  'Optimization Goal', 'Billing Event', 'Bid Amount', 'Ad Set Bid Strategy',
  'Beneficiary (financial ads in Taiwan)', 'Payer (financial ads in Taiwan)',
  'Advertiser (Taiwan)', 'Payer (Taiwan)',
  'Advertiser (financial ads in Australia)', 'Payer (financial ads in Australia)',
  'Advertiser (Singapore)', 'Payer (Singapore)',
  'Minimum ROAS bid', 'Ad Set Minimum Spend Limit', 'Ad Set Maximum Spend Limit',
  'Advertiser (securities ads in India)', 'Payer (securities ads in India)',
  'Beneficiary (selected locations)', 'Payer (selected locations)',
  'Large Geo Areas', 'Excluded Large Geo Areas',
  'Medium Geo Areas', 'Excluded Medium Geo Areas',
  'Small Geo Areas', 'Excluded Small Geo Areas',
  'Metro Areas', 'Excluded Metro Areas',
  'Subcities', 'Excluded Subcities',
  'Neighborhoods', 'Excluded Neighborhoods',
  'Subneighborhoods', 'Excluded Subneighborhoods',
  'Ad ID', 'Ad Status', 'Ad Name', 'Title', 'Body', 'Link Description',
  'Display Link', 'Image Hash', 'Creative Type', 'URL Tags', 'Image File Name',
  'Creative Optimization',
  'Product 1 - Link', 'Product 1 - Name', 'Product 1 - Description', 'Product 1 - Image Hash',
  'Product 2 - Link', 'Product 2 - Name', 'Product 2 - Description', 'Product 2 - Image Hash',
  'Product 3 - Link', 'Product 3 - Name', 'Product 3 - Description', 'Product 3 - Image Hash',
  'Call to Action', 'Story ID',
];
