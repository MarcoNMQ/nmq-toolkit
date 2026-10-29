import { describe, expect, it } from 'vitest';
import { migrateClientsState } from '../store';
import { SHIMANO_FB_PAGES } from '../shimanoPages';

describe('migrateClientsState', () => {
  it('back-fills Shimano Facebook Pages onto a pre-existing Shimano client with none', () => {
    const legacy = { clients: [{ id: 'shimano', name: 'Shimano' }] };
    const migrated = migrateClientsState(legacy);
    expect(migrated?.clients).toEqual([{ id: 'shimano', name: 'Shimano', facebookPages: SHIMANO_FB_PAGES }]);
  });

  it('never overwrites a Shimano entry that already has its own Pages', () => {
    const custom = [{ id: 'p1', name: 'My Own Page', pageId: '111111111111111' }];
    const legacy = { clients: [{ id: 'shimano', name: 'Shimano', facebookPages: custom }] };
    const migrated = migrateClientsState(legacy);
    expect(migrated?.clients).toEqual([{ id: 'shimano', name: 'Shimano', facebookPages: custom }]);
  });

  it('leaves other clients untouched', () => {
    const legacy = { clients: [{ id: 'lineage', name: 'Lineage' }] };
    const migrated = migrateClientsState(legacy);
    expect(migrated?.clients).toEqual([{ id: 'lineage', name: 'Lineage' }]);
  });

  it('handles completely empty/undefined persisted state without throwing', () => {
    expect(migrateClientsState(undefined)).toBeUndefined();
    expect(migrateClientsState({})).toEqual({});
  });
});
