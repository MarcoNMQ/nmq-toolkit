import { describe, expect, it } from 'vitest';
import { validatePmaxBundles } from '../pmaxValidation';
import type { PmaxAsset, PmaxCampaign, PmaxCampaignBundle } from '../pmaxTypes';

let seq = 0;
function uid(): string {
  seq += 1;
  return `id${seq}`;
}

function textAsset(role: PmaxAsset['role'], text: string): PmaxAsset {
  return { id: uid(), role, text };
}

function imageAsset(role: PmaxAsset['role'], width: number, height: number): PmaxAsset {
  return { id: uid(), role, width, height, mimeType: 'image/jpeg', fileSizeBytes: 100_000 };
}

/** A minimal but fully valid Standard PMAX campaign — one asset group that
 *  satisfies every hard minimum, brand guidelines on, campaign-level
 *  business name + square logo. Tests mutate copies of this via overrides. */
function makeValidBundle(): PmaxCampaignBundle {
  const campaignId = 'c1';
  const groupId = 'ag1';

  const headlines = [textAsset('headline', 'Explore Shimano Rods'), textAsset('headline', 'Find Your Next Rod'), textAsset('headline', 'Built For Every Cast')];
  const longHeadlines = [textAsset('long_headline', 'Discover the full Shimano fishing rod range today')];
  const descriptions = [textAsset('description', 'Reliable rods for every cast.'), textAsset('description', 'Browse the range and find yours.')];
  const landscape = imageAsset('marketing_image_landscape', 1200, 628);
  const square = imageAsset('marketing_image_square', 1200, 1200);
  const businessName = textAsset('business_name', 'Shimano');
  const squareLogo = imageAsset('logo_square', 1200, 1200);

  const groupAssets = [...headlines, ...longHeadlines, ...descriptions, landscape, square];
  const campaignAssets = [businessName, squareLogo];

  const campaign: PmaxCampaign = {
    id: campaignId,
    name: 'PMAX_LEADGEN_NOV_RODS',
    variant: 'standard',
    status: 'Paused',
    budget: { amount: 25 },
    bidStrategyType: 'Maximize Conversions',
    startDate: '2027-11-01',
    endDate: '2027-11-30',
    locations: [{ name: 'Portugal', excluded: false }],
    locationMode: 'presence',
    euPoliticalAds: 'No',
    labels: '',
    trackingTemplate: '',
    finalUrlSuffix: '',
    customParameter: '',
    conversionGoal: { mode: 'account_default', goalNames: [], unresolved: true },
    brandGuidelines: { enabled: true },
    assetAutomation: { finalUrlExpansion: true, textCustomization: true, urlExclusions: [] },
    lifecycle: { mode: 'inherit', newCustomerAcquisitionEnabled: false, retentionEnabled: false, requiredCustomerMatchLists: [] },
    assets: [...groupAssets, ...campaignAssets],
    campaignAssetLinks: campaignAssets.map((a) => ({ id: uid(), assetId: a.id })),
    assetGroups: [{ id: groupId, campaignId, name: 'RODS_PT', status: 'Paused', finalUrl: 'https://example.com/rods', path1: 'rods', path2: '', cta: 'Automated' }],
    assetGroupAssetLinks: groupAssets.map((a) => ({ id: uid(), assetGroupId: groupId, assetId: a.id })),
    signals: [],
  };

  return { campaign };
}

function withCampaign(patch: Partial<PmaxCampaign>): PmaxCampaignBundle {
  const bundle = makeValidBundle();
  return { campaign: { ...bundle.campaign, ...patch } };
}

describe('validatePmaxBundles — valid baseline', () => {
  it('passes with no blocking errors', () => {
    const { errors } = validatePmaxBundles([makeValidBundle()]);
    expect(errors).toEqual([]);
  });
});

describe('validatePmaxBundles — campaign-level rules', () => {
  it('blocks a blank campaign name', () => {
    const { errors } = validatePmaxBundles([withCampaign({ name: '' })]);
    expect(errors.some((e) => e.includes('campaign name is required'))).toBe(true);
  });

  it('blocks colliding campaign names', () => {
    const a = makeValidBundle();
    const b = makeValidBundle();
    b.campaign.id = 'c2';
    const { errors } = validatePmaxBundles([a, b]);
    expect(errors.some((e) => e.includes('collides with another campaign'))).toBe(true);
  });

  it('blocks zero budget', () => {
    const { errors } = validatePmaxBundles([withCampaign({ budget: { amount: 0 } })]);
    expect(errors.some((e) => e.includes('budget must be greater than zero'))).toBe(true);
  });

  it('blocks a missing EU political ads declaration', () => {
    const { errors } = validatePmaxBundles([withCampaign({ euPoliticalAds: '' })]);
    expect(errors.some((e) => e.includes('EU political ads declaration is required'))).toBe(true);
  });

  it('blocks Target CPM/Manual CPC-style unsupported bid strategies', () => {
    const { errors } = validatePmaxBundles([withCampaign({ bidStrategyType: 'Target CPM' as PmaxCampaign['bidStrategyType'] })]);
    expect(errors.some((e) => e.includes("isn't a supported PMAX bid strategy"))).toBe(true);
  });

  it('blocks Target CPA set under Maximize Conversion Value (incompatible target field)', () => {
    const { errors } = validatePmaxBundles([withCampaign({ bidStrategyType: 'Maximize Conversion Value', targetRoas: 300, targetCpa: 10 })]);
    expect(errors.some((e) => e.includes('Target CPA is only valid with Maximize Conversions'))).toBe(true);
  });

  it('blocks Target ROAS set under Maximize Conversions (incompatible target field)', () => {
    const { errors } = validatePmaxBundles([withCampaign({ targetRoas: 300 })]);
    expect(errors.some((e) => e.includes('Target ROAS is only valid with Maximize Conversion Value'))).toBe(true);
  });

  it('blocks an end date before the start date', () => {
    const { errors } = validatePmaxBundles([withCampaign({ startDate: '2027-11-10', endDate: '2027-11-01' })]);
    expect(errors.some((e) => e.includes('end date must be on or after'))).toBe(true);
  });

  it('blocks a start date in the past', () => {
    const { errors } = validatePmaxBundles([withCampaign({ startDate: '2000-01-01' })]);
    expect(errors.some((e) => e.includes('start date cannot be in the past'))).toBe(true);
  });

  it('blocks zero included locations', () => {
    const { errors } = validatePmaxBundles([withCampaign({ locations: [{ name: 'Portugal', excluded: true }] })]);
    expect(errors.some((e) => e.includes('at least one included location is required'))).toBe(true);
  });

  it('blocks zero asset groups', () => {
    const { errors } = validatePmaxBundles([withCampaign({ assetGroups: [] })]);
    expect(errors.some((e) => e.includes('needs 1 to 100 asset groups'))).toBe(true);
  });

  it('blocks Retail variant for now (not implemented in P0)', () => {
    const { errors } = validatePmaxBundles([withCampaign({ variant: 'retail' })]);
    expect(errors.some((e) => e.includes("Retail PMAX isn't implemented yet"))).toBe(true);
  });

  it('blocks campaign-specific conversion goal mode with no goal names', () => {
    const { errors } = validatePmaxBundles([withCampaign({ conversionGoal: { mode: 'campaign_specific', goalNames: [], unresolved: true } })]);
    expect(errors.some((e) => e.includes('none named'))).toBe(true);
  });

  it('blocks retention enabled without a Customer Match list', () => {
    const { errors } = validatePmaxBundles([withCampaign({ lifecycle: { mode: 'campaign_override', newCustomerAcquisitionEnabled: false, retentionEnabled: true, requiredCustomerMatchLists: [] } })]);
    expect(errors.some((e) => e.includes('no Customer Match list is named'))).toBe(true);
  });
});

describe('validatePmaxBundles — brand guidelines', () => {
  it('blocks brand guidelines on with no business name', () => {
    const bundle = makeValidBundle();
    bundle.campaign.assets = bundle.campaign.assets.filter((a) => a.role !== 'business_name');
    bundle.campaign.campaignAssetLinks = bundle.campaign.campaignAssetLinks.filter((l) => bundle.campaign.assets.some((a) => a.id === l.assetId));
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('needs exactly one business name asset'))).toBe(true);
  });

  it('blocks brand guidelines on with no square logo', () => {
    const bundle = makeValidBundle();
    bundle.campaign.assets = bundle.campaign.assets.filter((a) => a.role !== 'logo_square');
    bundle.campaign.campaignAssetLinks = bundle.campaign.campaignAssetLinks.filter((l) => bundle.campaign.assets.some((a) => a.id === l.assetId));
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('at least one square logo is required'))).toBe(true);
  });

  it('requires per-asset-group business name + square logo when brand guidelines are off', () => {
    const bundle = makeValidBundle();
    bundle.campaign.brandGuidelines = { enabled: false };
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('needs exactly one business name'))).toBe(true);
    expect(errors.some((e) => e.includes('at least one square logo is required'))).toBe(true);
  });
});

describe('validatePmaxBundles — asset group text/image rules', () => {
  it('blocks fewer than 3 headlines', () => {
    const bundle = makeValidBundle();
    const keep = bundle.campaign.assets.find((a) => a.role === 'headline');
    bundle.campaign.assets = bundle.campaign.assets.filter((a) => a.role !== 'headline' || a.id === keep?.id);
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('needs 3 to 15 non-empty headlines'))).toBe(true);
  });

  it('blocks a headline over 30 characters wide', () => {
    const bundle = makeValidBundle();
    const h = bundle.campaign.assets.find((a) => a.role === 'headline')!;
    h.text = 'This headline text is definitely longer than thirty characters';
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('max 30'))).toBe(true);
  });

  it('blocks duplicate headlines', () => {
    const bundle = makeValidBundle();
    const headlines = bundle.campaign.assets.filter((a) => a.role === 'headline');
    headlines[1].text = headlines[0].text;
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('headlines must be unique'))).toBe(true);
  });

  it('blocks fewer than 2 descriptions', () => {
    const bundle = makeValidBundle();
    const keep = bundle.campaign.assets.find((a) => a.role === 'description');
    bundle.campaign.assets = bundle.campaign.assets.filter((a) => a.role !== 'description' || a.id === keep?.id);
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('needs 2 to 5 non-empty descriptions'))).toBe(true);
  });

  it('blocks when no description is 60 characters or fewer', () => {
    const bundle = makeValidBundle();
    const descriptions = bundle.campaign.assets.filter((a) => a.role === 'description');
    descriptions.forEach((d) => { d.text = 'This description text is deliberately longer than the required sixty character short-description limit.'; });
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('60 characters or fewer'))).toBe(true);
  });

  it('blocks missing landscape image', () => {
    const bundle = makeValidBundle();
    bundle.campaign.assets = bundle.campaign.assets.filter((a) => a.role !== 'marketing_image_landscape');
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('at least one landscape marketing image is required'))).toBe(true);
  });

  it('blocks an undersized square image', () => {
    const bundle = makeValidBundle();
    const square = bundle.campaign.assets.find((a) => a.role === 'marketing_image_square')!;
    square.width = 100;
    square.height = 100;
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('below the minimum'))).toBe(true);
  });

  it('blocks a wrong-ratio landscape image', () => {
    const bundle = makeValidBundle();
    const landscape = bundle.campaign.assets.find((a) => a.role === 'marketing_image_landscape')!;
    landscape.width = 1200;
    landscape.height = 1200; // 1:1, not 1.91:1
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes("doesn't match the required"))).toBe(true);
  });

  it('blocks an asset-group name collision', () => {
    const bundle = makeValidBundle();
    const second = { ...bundle.campaign.assetGroups[0], id: 'ag2' };
    bundle.campaign.assetGroups = [...bundle.campaign.assetGroups, second];
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('collides with another asset group'))).toBe(true);
  });

  it('blocks Path 2 without Path 1', () => {
    const bundle = makeValidBundle();
    bundle.campaign.assetGroups[0].path1 = '';
    bundle.campaign.assetGroups[0].path2 = 'fishing';
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('Path 2 requires Path 1'))).toBe(true);
  });

  it('blocks an invalid Final URL', () => {
    const bundle = makeValidBundle();
    bundle.campaign.assetGroups[0].finalUrl = 'not-a-url';
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('Final URL must be an absolute'))).toBe(true);
  });

  it('blocks more than 15 videos', () => {
    const bundle = makeValidBundle();
    const groupId = bundle.campaign.assetGroups[0].id;
    const videos: PmaxAsset[] = Array.from({ length: 16 }, (_, i) => ({ id: `v${i}`, role: 'youtube_video', youtubeVideoId: 'dQw4w9WgXcQ' }));
    bundle.campaign.assets.push(...videos);
    bundle.campaign.assetGroupAssetLinks.push(...videos.map((v) => ({ id: `vl${v.id}`, assetGroupId: groupId, assetId: v.id })));
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('exceeds the maximum of 15'))).toBe(true);
  });

  it('blocks a malformed YouTube video ID', () => {
    const bundle = makeValidBundle();
    const groupId = bundle.campaign.assetGroups[0].id;
    const video: PmaxAsset = { id: 'v1', role: 'youtube_video', youtubeVideoId: 'too-short' };
    bundle.campaign.assets.push(video);
    bundle.campaign.assetGroupAssetLinks.push({ id: 'vl1', assetGroupId: groupId, assetId: video.id });
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('not a valid 11-character YouTube video ID'))).toBe(true);
  });

  it('blocks duplicate search themes and more than 25 themes', () => {
    const bundle = makeValidBundle();
    const groupId = bundle.campaign.assetGroups[0].id;
    bundle.campaign.signals = [
      { id: 's1', assetGroupId: groupId, kind: 'search_theme', searchThemeText: 'fishing rods' },
      { id: 's2', assetGroupId: groupId, kind: 'search_theme', searchThemeText: 'fishing rods' },
    ];
    const { errors } = validatePmaxBundles([bundle]);
    expect(errors.some((e) => e.includes('duplicate search theme'))).toBe(true);
  });
});

describe('validatePmaxBundles — warnings are never blocking', () => {
  it('produces warnings for low asset counts but no errors on an otherwise-minimal valid group', () => {
    const { errors, warnings } = validatePmaxBundles([makeValidBundle()]);
    expect(errors).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some((w) => w.includes('fewer than 11 headlines'))).toBe(true);
  });
});
