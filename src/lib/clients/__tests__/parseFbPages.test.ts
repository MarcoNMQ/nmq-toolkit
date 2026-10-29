import { describe, expect, it } from 'vitest';
import { mergeFbPages, parseFbPagesPaste } from '../parseFbPages';

const SHIMANO_PASTE = `Page name\tPage ID
Shimano Tribal Hungary\t100224755907718
Shimano Tribal Italy\t103416275115942
Shimano-Fishing (LT - Lithuanian)\t104611984520072
Shimano-Tribal (NL - Dutch, BE - French, Dutch, LU - Dutch, French, Luxembourgish)\t138446066574781
Shimano Aero\t649751238969965`;

describe('parseFbPagesPaste', () => {
  it('parses a tab-separated paste, skipping the header row', () => {
    const { rows, invalidLines } = parseFbPagesPaste(SHIMANO_PASTE);
    expect(invalidLines).toEqual([]);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toEqual({ name: 'Shimano Tribal Hungary', pageId: '100224755907718' });
  });

  it('keeps a name containing commas intact when the row is tab-separated', () => {
    const { rows } = parseFbPagesPaste(SHIMANO_PASTE);
    const dutch = rows.find((r) => r.pageId === '138446066574781');
    expect(dutch?.name).toBe('Shimano-Tribal (NL - Dutch, BE - French, Dutch, LU - Dutch, French, Luxembourgish)');
  });

  it('parses comma-separated rows when there is no tab', () => {
    const { rows, invalidLines } = parseFbPagesPaste('Shimano Aero, 649751238969965');
    expect(invalidLines).toEqual([]);
    expect(rows).toEqual([{ name: 'Shimano Aero', pageId: '649751238969965' }]);
  });

  it('falls back to splitting on trailing whitespace + digits when there is no separator at all', () => {
    const { rows } = parseFbPagesPaste('Shimano Aero 649751238969965');
    expect(rows).toEqual([{ name: 'Shimano Aero', pageId: '649751238969965' }]);
  });

  it('flags a line with no plausible numeric Page ID as invalid instead of silently dropping it', () => {
    const { rows, invalidLines } = parseFbPagesPaste('Some random line with no id');
    expect(rows).toEqual([]);
    expect(invalidLines).toEqual(['Some random line with no id']);
  });

  it('ignores blank lines', () => {
    const { rows } = parseFbPagesPaste('\n\nShimano Aero\t649751238969965\n\n');
    expect(rows).toHaveLength(1);
  });
});

describe('mergeFbPages', () => {
  it('appends new pages and keeps existing ones already in the list', () => {
    const existing = [{ id: 'e1', name: 'Shimano Aero', pageId: '649751238969965' }];
    const merged = mergeFbPages(existing, [{ name: 'Shimano Tribal Hungary', pageId: '100224755907718' }]);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.pageId === '649751238969965')).toEqual(existing[0]);
  });

  it('updates the name of an existing page (matched by pageId) without changing its stable id', () => {
    const existing = [{ id: 'e1', name: 'Old Name', pageId: '649751238969965' }];
    const merged = mergeFbPages(existing, [{ name: 'New Name', pageId: '649751238969965' }]);
    expect(merged).toEqual([{ id: 'e1', name: 'New Name', pageId: '649751238969965' }]);
  });

  it('a partial re-paste never deletes pages missing from the new paste', () => {
    const existing = [
      { id: 'e1', name: 'Page A', pageId: '111' },
      { id: 'e2', name: 'Page B', pageId: '222' },
    ];
    const merged = mergeFbPages(existing, [{ name: 'Page A updated', pageId: '111' }]);
    expect(merged).toHaveLength(2);
    expect(merged.find((p) => p.pageId === '222')).toEqual(existing[1]);
  });
});
