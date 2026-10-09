import { buildBacktestRequest, normalizeSymbols, EMPTY_SYMBOLS_MESSAGE } from './buildBacktestRequest';

describe('normalizeSymbols', () => {
  test('trims whitespace and drops blank entries', () => {
    expect(
      normalizeSymbols(['  000001.SZ  ', '', '   ', null, undefined, '600000.SH'])
    ).toEqual(['000001.SZ', '600000.SH']);
  });

  test('dedupes exact trimmed strings and keeps first-seen order', () => {
    expect(
      normalizeSymbols(['AAA', ' BBB ', 'AAA', 'BBB', 'CCC', ' AAA ', 'ccc'])
    ).toEqual(['AAA', 'BBB', 'CCC', 'ccc']);
  });

  test('returns an empty array when input is missing or not a list', () => {
    expect(normalizeSymbols(undefined)).toEqual([]);
    expect(normalizeSymbols(null)).toEqual([]);
    expect(normalizeSymbols([])).toEqual([]);
    expect(normalizeSymbols('000001.SZ')).toEqual([]);
  });
});

describe('buildBacktestRequest', () => {
  test('rejects empty symbols with a Chinese error', () => {
    expect(() =>
      buildBacktestRequest({ strategy: 's1', params: { fast: 5 }, symbols: [' ', ''] })
    ).toThrow(EMPTY_SYMBOLS_MESSAGE);

    expect(() => buildBacktestRequest({ strategy: 's1' })).toThrow(EMPTY_SYMBOLS_MESSAGE);
    expect(() => buildBacktestRequest({ strategy: 's1', symbols: [] })).toThrow(
      EMPTY_SYMBOLS_MESSAGE
    );
  });

  test('returns strategyId, params, and a non-empty symbols array at the root', () => {
    expect(
      buildBacktestRequest({
        strategy: 'strategy-1',
        params: { fast: 12, slow: 26 },
        symbols: [' 000001.SZ ', '000001.SZ', ' 600000.SH '],
      })
    ).toEqual({
      strategyId: 'strategy-1',
      params: { fast: 12, slow: 26 },
      symbols: ['000001.SZ', '600000.SH'],
    });
  });

  test('defaults missing params to an empty object', () => {
    expect(
      buildBacktestRequest({
        strategy: 'strategy-1',
        symbols: ['000001.SZ'],
      })
    ).toEqual({
      strategyId: 'strategy-1',
      params: {},
      symbols: ['000001.SZ'],
    });
  });
});
