import { describe, expect, it } from 'vitest';
import {
  autoDetectColumnMap, buildActualsRows, missingRequiredFields, parseActualsDate, parseCsv, rowsToDicts,
} from '../actualsImport';

describe('parseCsv', () => {
  it('parses a simple CSV with quoted fields', () => {
    const text = 'Date,Market,Spend\n2027-01-01,UK,"1,000"\n2027-01-02,DE,500\n';
    const rows = parseCsv(text);
    expect(rows).toEqual([
      ['Date', 'Market', 'Spend'],
      ['2027-01-01', 'UK', '1,000'],
      ['2027-01-02', 'DE', '500'],
    ]);
  });
});

describe('parseActualsDate', () => {
  it('accepts ISO, dd/mm/yyyy, and dd-mm-yyyy', () => {
    expect(parseActualsDate('2027-03-05')).toBe('2027-03-05');
    expect(parseActualsDate('05/03/2027')).toBe('2027-03-05');
    expect(parseActualsDate('05-03-2027')).toBe('2027-03-05');
  });

  it('returns null for unparseable input', () => {
    expect(parseActualsDate('not a date')).toBeNull();
    expect(parseActualsDate('')).toBeNull();
  });
});

describe('autoDetectColumnMap + missingRequiredFields', () => {
  it('detects common header names and reports nothing missing when all required fields are present', () => {
    const headers = ['Date', 'Market', 'Channel', 'Spend', 'Impressions', 'Clicks'];
    const map = autoDetectColumnMap(headers);
    expect(map.startDate).toBe('Date');
    expect(map.market).toBe('Market');
    expect(map.channel).toBe('Channel');
    expect(map.spend).toBe('Spend');
    expect(missingRequiredFields(map)).toEqual([]);
  });

  it('reports missing required fields when columns are absent', () => {
    const map = autoDetectColumnMap(['Date', 'Impressions']);
    const missing = missingRequiredFields(map).map((f) => f.key);
    expect(missing).toContain('market');
    expect(missing).toContain('channel');
    expect(missing).toContain('spend');
  });
});

describe('buildActualsRows', () => {
  const map = { startDate: 'Date', market: 'Market', channel: 'Channel', spend: 'Spend', impressions: 'Impressions', clicks: 'Clicks' };

  it('builds valid rows and leaves unreported metrics absent, never zero', () => {
    const dicts = [{ Date: '2027-01-01', Market: 'UK', Channel: 'Search', Spend: '100', Impressions: '1000', Clicks: '' }];
    const { rows, skipped } = buildActualsRows(dicts, map);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].spend).toBe(100);
    expect(rows[0].metrics.impressions).toBe(1000);
    expect(rows[0].metrics.clicks).toBeUndefined();
    expect('clicks' in rows[0].metrics).toBe(false);
  });

  it('excludes a row with an unparseable date and reports why', () => {
    const dicts = [{ Date: 'garbage', Market: 'UK', Channel: 'Search', Spend: '100' }];
    const { rows, skipped } = buildActualsRows(dicts, map);
    expect(rows).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/date/i);
  });

  it('excludes a row with an unrecognized channel', () => {
    const dicts = [{ Date: '2027-01-01', Market: 'UK', Channel: 'Carrier Pigeon', Spend: '100' }];
    const { rows, skipped } = buildActualsRows(dicts, map);
    expect(rows).toHaveLength(0);
    expect(skipped[0].reason).toMatch(/channel/i);
  });

  it('excludes a row with unparseable spend', () => {
    const dicts = [{ Date: '2027-01-01', Market: 'UK', Channel: 'Search', Spend: 'n/a' }];
    const { rows, skipped } = buildActualsRows(dicts, map);
    expect(rows).toHaveLength(0);
    expect(skipped[0].reason).toMatch(/spend/i);
  });

  it('keeps an unrecognized market as free text and flags it via a notice, without failing the row', () => {
    const dicts = [{ Date: '2027-01-01', Market: 'Narnia', Channel: 'Search', Spend: '100' }];
    const { rows, skipped, notices } = buildActualsRows(dicts, map);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].market).toBeUndefined();
    expect(rows[0].marketRaw).toBe('Narnia');
    expect(notices.some((n) => /market/i.test(n))).toBe(true);
  });
});

describe('rowsToDicts', () => {
  it('turns raw rows into header-keyed dicts and skips blank rows', () => {
    const raw = [['Date', 'Market'], ['2027-01-01', 'UK'], ['', ''], ['2027-01-02', 'DE']];
    const { headers, dicts } = rowsToDicts(raw);
    expect(headers).toEqual(['Date', 'Market']);
    expect(dicts).toEqual([{ Date: '2027-01-01', Market: 'UK' }, { Date: '2027-01-02', Market: 'DE' }]);
  });
});
