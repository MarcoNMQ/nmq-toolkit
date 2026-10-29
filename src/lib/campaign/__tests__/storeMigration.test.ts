import { describe, expect, it } from 'vitest';
import { migrateBuilderState, newGoogleCampaign, useBuilderStore } from '../store';

describe('migrateBuilderState', () => {
  it('fills in pmaxCampaigns: [] for state persisted before it existed (no version field at all)', () => {
    const legacy = {
      platform: 'google',
      googleCampaigns: [{ id: 'g1', channel: 'Search' }],
      fbCampaigns: [],
      selected: { type: 'welcome' },
      expanded: { g1: true },
      // no pmaxCampaigns key — this is what every real user's browser has today
    };
    const migrated = migrateBuilderState(legacy);
    expect(migrated.pmaxCampaigns).toEqual([]);
  });

  it('preserves existing Search/YouTube/Demand Gen campaign data exactly', () => {
    const googleCampaigns = [newGoogleCampaign()];
    const legacy = { platform: 'google', googleCampaigns, fbCampaigns: [], selected: { type: 'welcome' }, expanded: {} };
    const migrated = migrateBuilderState(legacy);
    expect(migrated.googleCampaigns).toEqual(googleCampaigns);
  });

  it('preserves existing Facebook campaign data, backfilling client_profile and facebook_page_ref for pre-existing data', () => {
    const fbCampaigns = [{ id: 'fb1', campaign_name: 'Test' }];
    const legacy = { platform: 'facebook', googleCampaigns: [], fbCampaigns, selected: { type: 'welcome' }, expanded: {} };
    const migrated = migrateBuilderState(legacy);
    expect(migrated.fbCampaigns).toEqual([{ id: 'fb1', campaign_name: 'Test', client_profile: '', facebook_page_ref: '' }]);
  });

  it('backfills only facebook_page_ref when client_profile was already set from an earlier migration pass', () => {
    const fbCampaigns = [{ id: 'fb1', campaign_name: 'Test', client_profile: 'Shimano' }];
    const legacy = { platform: 'facebook', googleCampaigns: [], fbCampaigns, selected: { type: 'welcome' }, expanded: {} };
    const migrated = migrateBuilderState(legacy);
    expect(migrated.fbCampaigns).toEqual([{ id: 'fb1', campaign_name: 'Test', client_profile: 'Shimano', facebook_page_ref: '' }]);
  });

  it('leaves already-set client_profile and facebook_page_ref untouched', () => {
    const fbCampaigns = [{ id: 'fb1', campaign_name: 'Test', client_profile: 'Shimano', facebook_page_ref: 'page1' }];
    const legacy = { platform: 'facebook', googleCampaigns: [], fbCampaigns, selected: { type: 'welcome' }, expanded: {} };
    const migrated = migrateBuilderState(legacy);
    expect(migrated.fbCampaigns).toEqual(fbCampaigns);
  });

  it('handles completely empty/undefined persisted state without throwing', () => {
    const migrated = migrateBuilderState(undefined);
    expect(migrated.platform).toBe('google');
    expect(migrated.googleCampaigns).toEqual([]);
    expect(migrated.fbCampaigns).toEqual([]);
    expect(migrated.pmaxCampaigns).toEqual([]);
    expect(migrated.selected).toEqual({ type: 'welcome' });
  });

  it('handles a state object where arrays were somehow corrupted into non-arrays', () => {
    const migrated = migrateBuilderState({ googleCampaigns: 'not an array', pmaxCampaigns: null });
    expect(migrated.googleCampaigns).toEqual([]);
    expect(migrated.pmaxCampaigns).toEqual([]);
  });

  it('preserves pmaxCampaigns on a future re-migration (already-versioned state)', () => {
    const pmaxCampaigns = [{ id: 'p1', name: 'PMAX test' }];
    const migrated = migrateBuilderState({ googleCampaigns: [], fbCampaigns: [], pmaxCampaigns, selected: { type: 'welcome' }, expanded: {} });
    expect(migrated.pmaxCampaigns).toEqual(pmaxCampaigns);
  });
});

describe('duplicateGoogleCampaign — deep clone, not shared identity', () => {
  it('gives the copy its own keyword/sitelink/negative-keyword array identity and ids', () => {
    useBuilderStore.setState({ googleCampaigns: [], fbCampaigns: [], pmaxCampaigns: [] });
    const id = useBuilderStore.getState().addGoogleCampaign();
    useBuilderStore.getState().addGoogleKeyword(id);
    const original = useBuilderStore.getState().googleCampaigns.find((c) => c.id === id)!;
    expect(original.keywords.length).toBe(1);

    useBuilderStore.getState().duplicateGoogleCampaign(id);
    const campaigns = useBuilderStore.getState().googleCampaigns;
    const copy = campaigns.find((c) => c.id !== id)!;

    expect(copy.keywords).not.toBe(original.keywords); // different array identity
    expect(copy.keywords[0].id).not.toBe(original.keywords[0].id); // fresh id

    // Mutating the original's keywords must never affect the copy's.
    useBuilderStore.getState().addGoogleKeyword(id);
    const originalAfter = useBuilderStore.getState().googleCampaigns.find((c) => c.id === id)!;
    const copyAfter = useBuilderStore.getState().googleCampaigns.find((c) => c.id === copy.id)!;
    expect(originalAfter.keywords.length).toBe(2);
    expect(copyAfter.keywords.length).toBe(1);
  });
});

describe('duplicatePmaxCampaign — deep clone + re-parenting', () => {
  it('re-parents cloned asset groups, assets and signals to fresh ids', () => {
    useBuilderStore.setState({ googleCampaigns: [], fbCampaigns: [], pmaxCampaigns: [] });
    const campaignId = useBuilderStore.getState().addPmaxCampaign();
    const groupId = useBuilderStore.getState().addPmaxAssetGroup(campaignId);
    const assetId = useBuilderStore.getState().addPmaxAsset(campaignId, { role: 'headline', text: 'Hello' }, { assetGroupId: groupId });
    useBuilderStore.getState().addPmaxSignal(campaignId, groupId, { kind: 'search_theme', searchThemeText: 'rods' });

    useBuilderStore.getState().duplicatePmaxCampaign(campaignId);
    const all = useBuilderStore.getState().pmaxCampaigns;
    const copy = all.find((c) => c.id !== campaignId)!;

    expect(copy.assetGroups).toHaveLength(1);
    expect(copy.assetGroups[0].id).not.toBe(groupId);
    expect(copy.assetGroups[0].campaignId).toBe(copy.id);

    expect(copy.assets).toHaveLength(1);
    expect(copy.assets[0].id).not.toBe(assetId);
    expect(copy.assets[0].text).toBe('Hello');

    expect(copy.assetGroupAssetLinks[0].assetGroupId).toBe(copy.assetGroups[0].id);
    expect(copy.assetGroupAssetLinks[0].assetId).toBe(copy.assets[0].id);

    expect(copy.signals).toHaveLength(1);
    expect(copy.signals[0].assetGroupId).toBe(copy.assetGroups[0].id);
    expect(copy.signals[0].id).not.toBe(useBuilderStore.getState().pmaxCampaigns.find((c) => c.id === campaignId)!.signals[0].id);

    // Original is untouched.
    const original = useBuilderStore.getState().pmaxCampaigns.find((c) => c.id === campaignId)!;
    expect(original.assetGroups).toHaveLength(1);
    expect(original.assets).toHaveLength(1);
  });
});
