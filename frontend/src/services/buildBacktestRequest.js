export const EMPTY_SYMBOLS_MESSAGE = '请至少输入一个标的代码';

/**
 * Trim entries, drop blanks, and dedupe exact trimmed strings.
 * First-seen order is preserved. Non-arrays are treated as empty.
 */
export function normalizeSymbols(symbols) {
  if (!Array.isArray(symbols)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const raw of symbols) {
    if (raw == null) {
      continue;
    }
    const trimmed = String(raw).trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

/**
 * Build the POST /backtest/run body.
 * `symbols` is a non-empty string array at the request root.
 */
export function buildBacktestRequest(values) {
  const symbols = normalizeSymbols(values?.symbols);
  if (symbols.length === 0) {
    throw new Error(EMPTY_SYMBOLS_MESSAGE);
  }

  return {
    strategyId: values.strategy,
    params: values.params || {},
    symbols,
  };
}
