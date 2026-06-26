// Ported 1:1 from shimano_campaign_builder/constants.py — Google Ads side

// -- Fixed values --------------------------------------------------------------
export const NETWORKS = 'Google search;Search Partners;Display Network;Video Partners';
export const EU_POL = "Doesn't have EU political ads";
export const BIZ = 'Shimano Fishing';
export const LOGO = '250447360237';
export const CAMP_TYPE = 'Demand Gen';
export const LANGUAGES = 'All';
export const BUDGET_TYPE = 'Campaign total';
export const CAMP_STATUS = 'Paused';

// ── Networks (Editor's fixed set for Demand Gen campaigns) ────────────────────
export const NETWORK_OPTIONS = ['Google search', 'Search Partners', 'Display Network', 'Video Partners'];

// ── Languages — broad list of Google Ads supported languages relevant to Europe ─
export const LANGUAGE_OPTIONS = [
  'All', 'English', 'French', 'German', 'Dutch', 'Italian', 'Spanish', 'Portuguese',
  'Polish', 'Swedish', 'Danish', 'Finnish', 'Norwegian', 'Czech', 'Slovak', 'Slovenian',
  'Hungarian', 'Romanian', 'Croatian', 'Lithuanian', 'Latvian', 'Estonian', 'Greek',
  'Bulgarian', 'Russian', 'Turkish', 'Ukrainian',
];

// ── Country → primary language(s), for quick "add languages for my selected countries" ─
export const COUNTRY_LANGUAGE_MAP: Record<string, string[]> = {
  UK: ['English'],
  NL: ['Dutch'],
  BE: ['Dutch', 'French'],
  DE: ['German'],
  FR: ['French'],
  SE: ['Swedish'],
  PL: ['Polish'],
  IT: ['Italian'],
  ES: ['Spanish'],
  PT: ['Portuguese'],
  HU: ['Hungarian'],
  CZ: ['Czech'],
  RO: ['Romanian'],
  LIT: ['Lithuanian'],
  SLOW: ['Slovak'],
  SLOV: ['Slovenian'],
  AUS: ['German'],
  CRO: ['Croatian'],
  NO: ['Norwegian'],
  FI: ['Finnish'],
  DK: ['Danish'],
};

// ── CSV headers (exact Editor column names) ───────────────────────────────────
export const CSV_HEADERS = [
  'Campaign', 'Campaign Type', 'Networks', 'Budget', 'Budget type',
  'EU political ads', 'Languages', 'Bid Strategy Type', 'Start Date', 'End Date',
  'Campaign Status', 'Labels',
  'Ad Group', 'Ad Group Status',
  'Max CPC', 'Max CPM', 'Target CPV', 'Target CPM',
  'Location',
  'Ad type', 'Ad Name', 'Video ID 1',
  'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5',
  'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10',
  'Headline 11', 'Headline 12', 'Headline 13', 'Headline 14', 'Headline 15',
  'Long headline 1', 'Long headline 2', 'Long headline 3', 'Long headline 4', 'Long headline 5',
  'Description 1', 'Description 2', 'Description 3', 'Description 4', 'Description 5',
  'Business name', 'Logo image', 'Call to action', 'Path 1', 'Path 2', 'Final URL', 'Status',
] as const;

// ── Dropdown options ───────────────────────────────────────────────────────────
export const CHANNELS = ['YouTube', 'Facebook & Instagram', 'Facebook', 'Instagram', 'Search'];

export const MAIN_GOALS = ['Awareness', 'Traffic', 'Conversions', 'Leads', 'Engagement'];

export const PERF_GOALS = ['Demand Gen', 'Video Views', 'Reach', 'Traffic', 'Subscribers', 'Impressions', 'Conversions'];

export const PRODUCT_CATEGORIES = ['Aero', 'Carp', 'Lifestyle', 'Lines', 'Predator', 'Saltwater', 'Tribal'];

// Full product taxonomy: { Category: { ProductFamily: [products] } }
export const PRODUCT_TAXONOMY: Record<string, Record<string, string[]>> = {
  Aero: {
    'AERO Luggage': [
      'Aero Pro 2 Rod Sleeve', 'Aero Pro 4 Rod Sleeve', 'Aero Pro Bait Bag',
      'Aero Pro Compact Carryall', 'Aero Pro EVA Net Bag', 'Aero Pro Keepnet',
      'Aero Pro Landing Net', 'Aero Pro Large Roller Bag',
      'Aero Pro Rod Tip & Butt Protectors', 'Aero Pro Standard Roller Bag',
    ],
    'AERO Poles': [
      'Aero Poles', 'Aero Power Margin Pole', 'Aero Pro Margin Pole',
      'Aero Pro Pole', 'Aero X1 Pole', 'Aero X2 Pole', 'Aero X3 Pole',
      'Aero X5 Pole', 'Aero X7 Pole', 'Pole Aero Kit',
      'Pole Aero Pro Competition', 'Pole Aero X5 Competition',
      'Pole Aero X7 Competition', 'Power Carp Landing Net Handle',
      'Rod Aero Extreme Margin Pole', 'Rod Aero Power Carp Pole',
    ],
    'AERO Rods': [
      'Aero Tips', 'Aero X1 Feeder', 'Aero X2 Match', 'Aero X3 Feeder',
      'Aero X4 Match', 'Aero X5 Feeder', 'Aero X6 Match', 'Aero X7 Feeder',
      'Rod Aero Competition Landing Net Handle',
      'Rod Aero Power Carp Landing Net Handle', 'Rod Aero Pro Landing Net Handle',
      'Rod Aero Pro Precision Feeder', 'Rod Aero X1A Carp Feeder',
      'Rod Aero X1A Distance Feeder', 'Rod Aero X1A Feeder', 'Rod Aero X2 Match',
      'Rod Aero X3 Coarse', 'Rod Aero X5 Coarse', 'Rod Aero X5A Coarse',
      'Rod Aero X6 Match Float', 'Rod Aero X7A Distance Feeder',
      'Rod Aero X7A Finesse Feeder', 'Rod Aero X7A Precision Feeder',
      'X1', 'X5A Feeder', 'X7A Feeder',
    ],
    Reels: ['Reel Aero', 'Reel Aero BB', 'Reel Aero XR'],
  },
  Carp: {
    Reels: ['Aero Technium MGS'],
  },
  Lifestyle: {
    Lifestyle: ['Tribal Life'],
  },
  Lines: {
    'Shimano Lines': [
      'Kairiki', 'Line Aero Float', 'Line Aero Slick Shock Fluo ld',
      'Line Aero Slick Silk Rig', 'Line Technium Tribal',
      'Line Technium Tribal A Mono', 'Line Tribal Carp Fluoro',
      'Slik Shock', 'Technium', 'Technium Line',
    ],
  },
  Predator: {
    'JDM Rods': [
      'Poison Adrena', 'Poison Glorious', 'Rod Expride', 'Rod Poison Adrena',
      'Rod Poison Glorious', 'Rod Zodias', 'Rod Zodias Spinning', 'Zodias',
    ],
    Lures: [
      'Armajoint', 'Cover Crank', 'Lure BT Bait 77F', 'Lure BT World Diver 99SP FB',
      'Lure BT World Minnow Flash Boost', 'Lure BT World Pop Flash Boost',
      'Lure BT WorldCrank AR-C Flash Boost', 'Lure Bantam Armajoint',
      'Lure Bantam BT Spin', 'Lure Bantam Enber 60SP FB',
      'Lure Bantam Ligen 66F FB', 'Lure Bantam Swagy DW',
      'Lure Bantam Swagy MDW', 'Lure Bantam Swagy TW',
      'Lure Bantam Undulator 88F FB', 'Lure Bantam Zumverno 95SP FB',
      'Lure Bt World Rush 56F Flashboost', 'Lure Cardiff ARMAJOINT 60SS',
      'Lure Cardiff ML Bullet AR-C', 'Lure Cardiff Refrain 50HS',
      'Lure Cardiff Stream Flat 65S', 'Lure Yasei Chaos Crank',
      'Lure Yasei Chit Chat Chatter', 'Lure Yasei Cover Crank',
      'Lure Yasei Hyper Hybrid', 'Lure Yasei Javelin Jerk',
      'Lure Yasei Pure Pop', 'Lure Yasei Shock Stick',
      'Lure Yasei Soul Swim', 'Lure Yasei Trigger Twitch',
    ],
    Reels: [
      'Nasci', 'Nasci FD', 'Reel Aldebaran BFS', 'Reel Aldebaran DC',
      'Reel Aldebaran MGL', 'Reel Bantam', 'Reel Caius C',
      'Reel Calcutta Conquest A', 'Reel Calcutta Conquest MD',
      'Reel Cardiff A', 'Reel Curado BFS', 'Reel Curado DC',
      'Reel Curado K', 'Reel Curado K MGL', 'Reel Curado M',
      'Reel Metanium DC A', 'Reel Metanium MGL B', 'Reel SLX',
      'Reel SLX A', 'Reel SLX DC', 'Reel SLX DC A', 'Reel SLX XT A',
      'Reel SLX XT DC', 'Reel Tranx B', 'Sustain FK', 'Tranx B',
      'Twin Power FE', 'Vanquish',
    ],
    'Saltwater Rods': ['Rod Alivio HD TEGT Glued'],
    'Spinning Rods': [
      'Rod Catana Allround Tele GT', 'Rod Catana FX Spinning',
      'Rod Catana FX Spinning Tele', 'Rod Catana GX Spinning',
      'Rod Catana GX Spinning Tele', 'Rod Curado', 'Rod FX XT Spinning',
      'Rod Miravel Light Game', 'Rod Nexave Spinning', 'Rod SLX Spinning',
      'Rod Sahara Spinning', 'Rod Sienna AR TEGT', 'Rod Sienna HD TEGT Wrap',
      'Rod Sienna Spinning', 'Rod Sienna Spinning Sensitive',
      'Rod Speedmaster Salmon', 'Rod Stradic Spinning',
      'Rod Sustain CX Spinning EVA',
    ],
    'YASEI Rods': ['Rod Yasei AX', 'Rod Yasei BB Predator', 'Rod Yasei LTD'],
    'Yasei Luggage': [
      'Yasei Boat Bag Large', 'Yasei Boat Bag Medium', 'Yasei Rucksack',
      'Yasei Sling Bag', 'Yasei Street Bag', 'Yasei Sync Reel Case',
      'Yasei Sync Trace Dropshot Case',
    ],
  },
  Saltwater: {
    'JDM Rods': ['Lunamis', 'Rod Lunamis Spinning'],
    Lures: [
      'Lure Engetsu DoTERRA BakuBaku',
      'Lure Excense ARMAJOINT FLASH BOOST 190F/190S',
      'Lure Exsence Beam Popper 130F FB',
      'Lure Exsence DIVE Assassin 125S FB',
      'Lure Exsence Fortuna 75F', 'Lure Exsence Galaslide 95F',
      'Lure Exsence Responder 165F FB', 'Lure Exsence Shallow Assassin',
      'Lure Exsence Silent Assassin 129F', 'Lure Exsence Silent Assassin 140F',
      'Lure Exsence Silent Assassin 160F',
      'Lure Exsence Silent Assassin 80F/80S FLASH BOOST',
      'Lure Exsence Silent Assassin 99S SP',
      'Lure Exsence Silent Assassin Flash Boost',
      'Lure Exsence Strong Assassin AR-C 125F',
      'Lure Ocea Bettyu Hiramasa', 'Lure Ocea Metal Shot',
      'Lure Sephia Clinch FB Rattle', 'Lure Sephia Clinch Flash Boost',
      'Lure Sephia Clinch Long Appeal', 'Lure Sephia Fuwafuwa Sutte S',
      'Lure Sephia Sui Sui Stick 80 FLASH BOOST',
      'Lure Sephia Suisui Dropper', 'Lure Soare A-Jig',
      'Lure Stinger ButterFly Pebble', 'Lure Stinger Butterfly Flat Light',
      'Lure Wallet',
    ],
    Other: ['Back Pack & Tackle Box', 'Egi Case', 'Medium Back Pack & Tackle Box'],
    Reels: [
      'Plays 3000', 'Reel Aerlex XSC', 'Reel Aero Technium MgS XSD',
      'Reel Beastmaster 12000 MD', 'Reel Beastmaster B', 'Reel Fliegen',
      'Reel Forcemaster A', 'Reel Ocea Jigger', 'Reel Ocea Jigger F Custom',
      'Reel Power Aero XSC', 'Reel Speedmaster II', 'Reel Speedmaster XSD',
      'Reel TLD', 'Reel TLD II A', 'Reel TR G', 'Reel Talica II A',
      'Reel Tekota A', 'Reel Tiagra', 'Reel Torium A', 'Reel Tyrnos II Speed',
      'Reel Ultegra CI4+ XSC', 'Reel Ultegra XR XSD', 'Reel Ultegra XSD',
      'Reel Ultegra XSE', 'Stella SW-D',
    ],
    'Saltwater Luggage': [
      'Surf Carrybag', 'Surf Reel Case', 'Surf Rig Wallet', 'Surf Rucksack',
      'Surf Spool Case', 'Tackle Bag Large', 'Tackle Bag Medium',
      'Tackle Wallet', 'Talica Reel Cover', 'Travellers Wrap',
    ],
    'Saltwater Rods': [
      'Aero Technium Comp', 'Rod 19Grappler Type Jig',
      'Rod Aspire Spinning Sea Trout', 'Rod Bassterra A LRF',
      'Rod Bassterra A Power Game Spin', 'Rod Bassterra A Seabass Spinning',
      'Rod Bassterra XT LRF', 'Rod Bassterra XT Sea Bass',
      'Rod Bassterra XT Shore Jigging', 'Rod Bassterra XTP LRF',
      'Rod Bassterra XTP Sea Bass', 'Rod Beastmaster AX Pilk',
      'Rod Beastmaster Tataki', 'Rod Currentsniper BB',
      'Rod Currentsniper XR', 'Rod Dialuna Inshore',
      'Rod Exsence Genos Spinning 25', 'Rod Exsence Infinity',
      'Rod Game Type Jigging Cast', 'Rod Game Type LJ',
      'Rod Game Type Slow Jig Cast', 'Rod Grappler BB Type C',
      'Rod Grappler BB Type J', 'Rod Grappler BB Type Slow J',
      'Rod Grappler Type C Spinning', 'Rod Grappler Type J Cast',
      'Rod Grappler Type SLJ Cast', 'Rod Lesath Spinning Sea Trout',
      'Rod Moonshot', 'Rod Nexave Match Saltwater', 'Rod Ocea Plug Flexdrive',
      'Rod Salty Advance', 'Rod Sephia BB', 'Rod Sephia SS', 'Rod Sephia XR',
      'Rod Soare BB', 'Rod Soare XR', 'Rod Sonora Match Saltwater',
      'Rod Sonora Match Tele Saltwater', 'Rod Speedmaster Sea Trout Spinning',
      'Rod Stradic Sea bass', 'Rod Technium AX Tai Rubber',
      'Rod Technium Eging', 'Rod Vengeance AX Eging', 'Rod Vengeance AX Pilk',
      'Rod Vengeance DX Spin Sea Bass', 'Rod Vengeance Jigging',
      'Speedmaster Sea Trout', 'Stradic Seabass', 'Talica Stand Up',
      'Talica Standup Spiral',
    ],
    'Spinning Rods': ['Rod Engetsu BB'],
  },
  Tribal: {
    Baits: [
      'Bait Isolate Pellet HP', 'Bait TX1 Boillie Banana & Pineapple',
      'Bait TX1 Boillie Monster Crab', 'Bait TX1 Food Syrup Monst Crab',
      'Bait TX1 Hookbait Dip Banana & Pineapple',
      'Bait TX1 Hookbait Dip Squid & Octopus',
      'Bait TX1 Hookbait Monster Crab', 'Isolate Boillie LM94',
      'Isolate Boillie RN20', 'Isolate Boillie Scopex Liver',
      'Isolate Pop-Up Chilli Sausage', 'TX1 Boillie Scopex',
      'TX1 Boillie Squid & Octopus', 'TX1 Boillie Tiger Nut',
      'TX1 Food Syrup Attractant Banana & Pineapple',
      'TX1 Food Syrup Attractant Squid & Octopus',
      'TX1 Food Syrup Attractant Tiger Nut', 'TX1 Pop-Up Squid & Octopus',
      'TX1 Pop-Up Strawberry', 'TX1 Pop-Up Tiger Nut',
      'TX1 Pop-up Banana & Pineapple',
    ],
    Reels: [
      'Aerlex XTC/XSC', 'Reel Aerlex XTC', 'Reel Aerlex XTC Spod',
      'Reel Aero Technium MgS XTD', 'Reel Baitrunner CI4+ XTB',
      'Reel Baitrunner D', 'Reel Baitrunner DL-FB', 'Reel Baitrunner DL-RB',
      'Reel Baitrunner OC', 'Reel Baitrunner ST-FB', 'Reel Baitrunner ST-RB',
      'Reel Baitrunner X-Aero FB', 'Reel Baitrunner X-Aero RA',
      'Reel Baitrunner XT-RB', 'Reel Baitrunner XTB',
      'Reel Beastmaster XC', 'Reel Power Aero XTC', 'Reel Speedmaster XTD',
      'Reel Ultegra CI4+ XTC', 'Reel Ultegra XR XTD', 'Reel Ultegra XTD',
      'Reel Ultegra XTE',
    ],
    'TX Rods': [
      'Rod Specialist TX Boat', 'Rod Specialist TX Float',
      'Rod Specialist TX Lite', 'Rod Specialist TX Play',
      'Rod TX Intensity Spod & Marker', 'Rod TX-1B Carp', 'Rod TX-2A Carp',
      'Rod TX-2A Carp Cork', 'Rod TX-7A Carp', 'Rod TX-B Spod',
      'Rod Tribal TX-4A Carp', 'Rod Tribal TX-5A Carp',
      'Rod Tribal TX-Extreme Carp Spod & Marker',
      'Rod Tribal TX-Plus Carp Spod & Marker', 'Rod Tribal TX-Ultra A',
      'TX Lite', 'TX Specialist', 'TX-5', 'TX2', 'TX2-A', 'TX4',
    ],
    'Tribal Luggage': [
      'Tribal 3 Rod Holdall', 'Tribal Compact Carryall',
      'Tribal Large Accessory Bag', 'Tribal Large Carryall',
      'Tribal Large Cooler Bag', 'Tribal Medium Accessory Bag',
      'Tribal Padded Sleeve', 'Tribal Session Cooler Bag',
      'Tribal Small Accessory Bag', 'Tribal Spool Case',
    ],
  },
};

// Flat list of all product families (for fallback / display)
export const PRODUCT_SUBCATEGORIES = Array.from(
  new Set(Object.values(PRODUCT_TAXONOMY).flatMap((families) => Object.keys(families))),
).sort();

// ── Per-client product taxonomies ──────────────────────────────────────────────
// "Client" here means a brand with its own fixed product naming convention
// (so far just Shimano). Selecting a client in the campaign form swaps the
// free-text Product category/family/promoted fields for that client's
// dropdowns. Add a new entry here for any future client with the same need.
export interface ClientTaxonomy {
  categories: string[];
  taxonomy: Record<string, Record<string, string[]>>;
}

export const CLIENT_TAXONOMIES: Record<string, ClientTaxonomy> = {
  Shimano: { categories: PRODUCT_CATEGORIES, taxonomy: PRODUCT_TAXONOMY },
};

export const CLIENT_PROFILES = Object.keys(CLIENT_TAXONOMIES);

export const MARKETS = ['SEU', 'SGF', 'SSPF', 'SIF', 'SFFT', 'SBXF', 'SEFH', 'SFTK', 'SNF', 'SUK', 'SPOF'];

export const COUNTRY_GROUPS = [
  'Europe', 'Germany', 'Spain', 'Spain + Portugal', 'Italy',
  'United Kingdom', 'Netherlands', 'France', 'Poland', 'Belgium',
  'Sweden', 'Hungary', 'Lithuania', 'Czech Republic', 'Slovakia',
  'Slovenia', 'Romania', 'Croatia', 'Austria', 'Norway', 'Finland', 'Denmark',
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CTAS = ['Learn more', 'Watch now', 'Shop now', 'Sign up', 'Subscribe'];

export const BID_STRATEGIES = ['Maximize conversions', 'Maximize clicks', 'Target CPM', 'Target CPV'];

export const AD_FORMATS = ['Both', 'In-feed', 'In-stream', 'Pre Roll', 'Short'];

// ── Country group → country code presets (drives auto-fill) ───────────────────
const _EU_ALL = [
  'UK', 'NL', 'BE', 'DE', 'FR', 'SE', 'PL', 'IT', 'ES', 'PT',
  'HU', 'CZ', 'RO', 'LIT', 'SLOW', 'SLOV', 'AUS', 'CRO', 'NO', 'FI', 'DK',
];

// ── Market code → Country Group (drives cascade market → group → countries) ───
// Adjust any mapping here if a market covers different countries than listed.
export const MARKET_TO_GROUP: Record<string, string> = {
  SEU: 'Europe',
  SGF: 'Germany',
  SSPF: 'Spain + Portugal',
  SIF: 'Italy',
  SFFT: 'France',
  SBXF: 'Belgium',
  SEFH: 'Hungary',
  SFTK: 'Czech Republic',
  SNF: 'Netherlands',
  SUK: 'United Kingdom',
  SPOF: 'Poland',
};

export const COUNTRY_GROUP_PRESETS: Record<string, string[]> = {
  Europe: _EU_ALL,
  Germany: ['DE'],
  Spain: ['ES'],
  'Spain + Portugal': ['ES', 'PT'],
  Italy: ['IT'],
  'United Kingdom': ['UK'],
  Netherlands: ['NL'],
  France: ['FR'],
  Poland: ['PL'],
  Belgium: ['BE'],
  Sweden: ['SE'],
  Hungary: ['HU'],
  Lithuania: ['LIT'],
  'Czech Republic': ['CZ'],
  Slovakia: ['SLOW'],
  Slovenia: ['SLOV'],
  Romania: ['RO'],
  Croatia: ['CRO'],
  Austria: ['AUS'],
  Norway: ['NO'],
  Finland: ['FI'],
  Denmark: ['DK'],
};

// ── Country multi-select options (code shown to user, mapped to Editor name) ──
export const COUNTRY_OPTIONS = [
  'UK', 'NL', 'BE', 'DE', 'FR', 'SE', 'PL', 'IT', 'ES', 'PT',
  'HU', 'CZ', 'RO', 'LIT', 'SLOW', 'SLOV', 'AUS', 'CRO',
  'NO', 'FI', 'DK',
];

export const COUNTRY_MAP: Record<string, string> = {
  UK: 'United Kingdom',
  NL: 'Netherlands',
  BE: 'Belgium',
  DE: 'Germany',
  GER: 'Germany',
  FR: 'France',
  SE: 'Sweden',
  PL: 'Poland',
  IT: 'Italy',
  ES: 'Spain',
  PT: 'Portugal',
  HU: 'Hungary',
  CZ: 'Czechia',
  RO: 'Romania',
  ROM: 'Romania',
  LIT: 'Lithuania',
  SLOW: 'Slovakia',
  SLOV: 'Slovenia',
  AUS: 'Austria',
  CRO: 'Croatia',
  NO: 'Norway',
  FI: 'Finland',
  DK: 'Denmark',
};

// ── Code lookup (for name generation) ─────────────────────────────────────────
export const CHANNEL_CODES: Record<string, string> = {
  YouTube: 'YT',
  'Facebook & Instagram': 'FBIG',
  Facebook: 'FB',
  Instagram: 'IG',
  Search: 'SRC',
};

export const MAIN_GOAL_CODES: Record<string, string> = {
  Awareness: 'AWA',
  Traffic: 'CON',
  Conversions: 'CON',
  Leads: 'CONV',
  Engagement: 'CON',
};

export const PERF_GOAL_CODES: Record<string, string> = {
  'Demand Gen': 'DG',
  'Video Views': 'VV',
  Reach: 'RCH',
  Traffic: 'TRF',
  Subscribers: 'SUBS',
  Impressions: 'IMP',
  Conversions: 'CONV',
};

export const MONTH_CODES: Record<string, string> = {
  January: 'JAN', February: 'FEB', March: 'MAR',
  April: 'APR', May: 'MAY', June: 'JUN',
  July: 'JUL', August: 'AUG', September: 'SEP',
  October: 'OCT', November: 'NOV', December: 'DEC',
};
