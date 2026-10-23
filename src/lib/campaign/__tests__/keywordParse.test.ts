import { describe, expect, it } from 'vitest';
import { dedupeKeywords, parseKeywordList, parseKeywordRows } from '../keywordParse';

describe('parseKeywordList (paste box — comma and/or newline separated)', () => {
  it('reads match type off [brackets] and "quotes", defaults to Broad otherwise', () => {
    const result = parseKeywordList('fishing rods, "predator lures", [carbon fiber rod]');
    expect(result).toEqual([
      { text: 'fishing rods', matchType: 'Broad' },
      { text: 'predator lures', matchType: 'Phrase' },
      { text: 'carbon fiber rod', matchType: 'Exact' },
    ]);
  });

  it('works with one keyword per line (Excel-paste style) instead of commas', () => {
    const result = parseKeywordList('fishing rods\n"predator lures"\n[carbon fiber rod]\n');
    expect(result).toEqual([
      { text: 'fishing rods', matchType: 'Broad' },
      { text: 'predator lures', matchType: 'Phrase' },
      { text: 'carbon fiber rod', matchType: 'Exact' },
    ]);
  });

  it('drops empty tokens and trims whitespace', () => {
    const result = parseKeywordList('  fishing rods  , , \n \n"lures"');
    expect(result).toEqual([
      { text: 'fishing rods', matchType: 'Broad' },
      { text: 'lures', matchType: 'Phrase' },
    ]);
  });

  it('treats an unclosed bracket/quote as literal broad text, not a guessed match type', () => {
    const result = parseKeywordList('[unclosed exact, "unclosed phrase');
    expect(result).toEqual([
      { text: '[unclosed exact', matchType: 'Broad' },
      { text: '"unclosed phrase', matchType: 'Broad' },
    ]);
  });
});

describe('parseKeywordRows (Excel upload)', () => {
  it('uses an explicit match-type column when present, ignoring any syntax in column A', () => {
    const rows = [
      ['fishing rods', 'Phrase'],
      ['carbon fiber rod', 'Exact'],
      ['lures', 'Broad'],
    ];
    expect(parseKeywordRows(rows)).toEqual([
      { text: 'fishing rods', matchType: 'Phrase' },
      { text: 'carbon fiber rod', matchType: 'Exact' },
      { text: 'lures', matchType: 'Broad' },
    ]);
  });

  it('accepts single-letter shorthand (P/E/B) in the match-type column', () => {
    const rows = [['fishing rods', 'p'], ['rods', 'E'], ['lures', 'b']];
    expect(parseKeywordRows(rows)).toEqual([
      { text: 'fishing rods', matchType: 'Phrase' },
      { text: 'rods', matchType: 'Exact' },
      { text: 'lures', matchType: 'Broad' },
    ]);
  });

  it('falls back to embedded [brackets]/"quotes" syntax for single-column rows', () => {
    const rows = [['fishing rods'], ['"predator lures"'], ['[carbon fiber rod]']];
    expect(parseKeywordRows(rows)).toEqual([
      { text: 'fishing rods', matchType: 'Broad' },
      { text: 'predator lures', matchType: 'Phrase' },
      { text: 'carbon fiber rod', matchType: 'Exact' },
    ]);
  });

  it('falls back to embedded syntax when column B is not a recognizable match type', () => {
    const rows = [['"predator lures"', 'some note']];
    expect(parseKeywordRows(rows)).toEqual([{ text: 'predator lures', matchType: 'Phrase' }]);
  });

  it('skips a header row like "Keyword" / "Match Type"', () => {
    const rows = [['Keyword', 'Match Type'], ['fishing rods', 'Phrase']];
    expect(parseKeywordRows(rows)).toEqual([{ text: 'fishing rods', matchType: 'Phrase' }]);
  });

  it('skips fully blank rows', () => {
    const rows = [['fishing rods', 'Phrase'], ['', ''], ['lures', 'Exact']];
    expect(parseKeywordRows(rows)).toEqual([
      { text: 'fishing rods', matchType: 'Phrase' },
      { text: 'lures', matchType: 'Exact' },
    ]);
  });
});

describe('dedupeKeywords', () => {
  it('drops case-insensitive duplicates against the existing list', () => {
    const existing = [{ text: 'Fishing Rods', matchType: 'Broad' as const }];
    const candidates = [{ text: 'fishing rods', matchType: 'Broad' as const }, { text: 'lures', matchType: 'Exact' as const }];
    const { toAdd, duplicateCount } = dedupeKeywords(candidates, existing);
    expect(toAdd).toEqual([{ text: 'lures', matchType: 'Exact' }]);
    expect(duplicateCount).toBe(1);
  });

  it('drops duplicates within the pasted batch itself', () => {
    const candidates = [{ text: 'lures', matchType: 'Exact' as const }, { text: 'Lures', matchType: 'Exact' as const }];
    const { toAdd, duplicateCount } = dedupeKeywords(candidates, []);
    expect(toAdd).toEqual([{ text: 'lures', matchType: 'Exact' }]);
    expect(duplicateCount).toBe(1);
  });

  it('keeps the same text with a different match type — that is a different keyword', () => {
    const existing = [{ text: 'lures', matchType: 'Broad' as const }];
    const candidates = [{ text: 'lures', matchType: 'Exact' as const }];
    const { toAdd, duplicateCount } = dedupeKeywords(candidates, existing);
    expect(toAdd).toEqual([{ text: 'lures', matchType: 'Exact' }]);
    expect(duplicateCount).toBe(0);
  });
});
