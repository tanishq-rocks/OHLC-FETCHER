import YahooFinance from 'yahoo-finance2';
import fs from 'fs';
import path from 'path';

const yahooFinance = new YahooFinance();

// Timeframes supported by Yahoo Finance's chart endpoint
export const VALID_TIMEFRAMES = [
  '1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h',
  '1d', '5d', '1wk', '1mo', '3mo',
];

// Supported output formats
export const VALID_FORMATS = ['csv', 'tsv', 'json', 'ndjson'];

// Yahoo silently caps how far back you can request data depending on
// granularity. If you ask for more, the request fails or gets truncated,
// so we pre-emptively clamp the start date and warn instead of erroring out.
const MAX_LOOKBACK_DAYS = {
  '1m': 7,
  '2m': 60,
  '5m': 60,
  '15m': 60,
  '30m': 60,
  '90m': 60,
  '60m': 730,
  '1h': 730,
  '1d': null,
  '5d': null,
  '1wk': null,
  '1mo': null,
  '3mo': null,
};

/**
 * Parses a human-friendly duration string into milliseconds.
 * Accepts: "7d", "3w", "1mo", "1y", "12h", or a plain number (interpreted as days).
 */
export function parseDuration(input) {
  if (typeof input === 'number') return input * 24 * 60 * 60 * 1000;

  const match = /^(\d+(?:\.\d+)?)\s*(y|mo|w|d|h)$/i.exec(String(input).trim());
  if (!match) {
    throw new Error(
      `Invalid totalTime "${input}". Use formats like "7d", "3w", "1mo", "1y", "12h", or a plain number of days.`
    );
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const DAY = 24 * 60 * 60 * 1000;

  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * DAY;
    case 'w': return value * 7 * DAY;
    case 'mo': return value * 30 * DAY;
    case 'y': return value * 365 * DAY;
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

/**
 * Parses a "YYYY-MM-DD" or full ISO date/time string into a Date.
 * Date-only strings are treated as UTC midnight.
 */
function parseDateInput(input, label) {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} "${input}". Use "YYYY-MM-DD" or a full ISO timestamp.`);
  }
  return date;
}

/**
 * Fetches OHLC candle data for a given asset and writes it to a file.
 *
 * @param {Object} opts
 * @param {string} opts.symbol      Ticker/asset name, e.g. "AAPL", "BTC-USD", "RELIANCE.NS"
 * @param {string|number} [opts.totalTime]  How far back to fetch, e.g. "7d", "1mo", "1y" (or a number of days).
 *   Mutually exclusive with startDate/endDate.
 * @param {string} [opts.startDate]  Range start, e.g. "2026-01-01". Requires endDate.
 * @param {string} [opts.endDate]    Range end, e.g. "2026-01-31" (inclusive). Requires startDate.
 * @param {string} opts.timeframe   Candle size: one of VALID_TIMEFRAMES (e.g. "1m","5m","15m","1h","1d")
 * @param {string} [opts.outputFormat="csv"]  One of VALID_FORMATS
 * @param {string} [opts.outputDir="./output"] Folder to write the file into
 * @param {string} [opts.fileName]  Optional custom file name (without extension)
 * @returns {Promise<string>} path to the written file
 */
export async function fetchCandles({
  symbol,
  totalTime,
  startDate,
  endDate,
  timeframe,
  outputFormat = 'csv',
  outputDir = './output',
  fileName,
}) {
  if (!symbol) throw new Error('symbol (asset name / ticker) is required');
  if (!VALID_TIMEFRAMES.includes(timeframe)) {
    throw new Error(`Invalid timeframe "${timeframe}". Valid options: ${VALID_TIMEFRAMES.join(', ')}`);
  }

  const hasRange = totalTime != null;
  const hasDates = startDate != null || endDate != null;
  if (hasRange && hasDates) {
    throw new Error('Provide either totalTime OR startDate+endDate, not both.');
  }
  if (!hasRange && !hasDates) {
    throw new Error('Provide either totalTime (e.g. "7d") or both startDate and endDate.');
  }
  if (hasDates && (startDate == null || endDate == null)) {
    throw new Error('Both startDate and endDate are required when fetching by date range.');
  }

  const now = new Date();
  let period1;
  let period2;

  if (hasDates) {
    period1 = parseDateInput(startDate, 'startDate');
    period2 = parseDateInput(endDate, 'endDate');
    // A bare "YYYY-MM-DD" end date should include the whole day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate).trim())) {
      period2 = new Date(period2.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
    if (period1.getTime() >= period2.getTime()) {
      throw new Error(`startDate (${startDate}) must be before endDate (${endDate}).`);
    }
  } else {
    const durationMs = parseDuration(totalTime);
    period1 = new Date(now.getTime() - durationMs);
    period2 = now;
  }

  const maxDays = MAX_LOOKBACK_DAYS[timeframe];
  if (maxDays !== null) {
    const maxMs = maxDays * 24 * 60 * 60 * 1000;
    if (now.getTime() - period1.getTime() > maxMs) {
      const clamped = new Date(now.getTime() - maxMs);
      console.warn(
        `[warn] Yahoo Finance limits "${timeframe}" candles to roughly the last ${maxDays} days. ` +
        `Clamping start date from ${period1.toISOString()} to ${clamped.toISOString()}.`
      );
      period1 = clamped;
    }
  }

  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: timeframe,
  });

  const quotes = (result.quotes || []).filter(q => q.open != null && q.close != null);

  if (quotes.length === 0) {
    throw new Error('No data returned. Double-check the symbol, timeframe, and date range (market may have been closed, or symbol is wrong).');
  }

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const safeSymbol = symbol.replace(/[^a-zA-Z0-9._-]/g, '_');
  const defaultName = `${safeSymbol}_${timeframe}_${period1.toISOString().slice(0, 10)}_to_${period2.toISOString().slice(0, 10)}`;
  const baseName = fileName || defaultName;

  if (!VALID_FORMATS.includes(outputFormat)) {
    throw new Error(`Invalid outputFormat "${outputFormat}". Valid options: ${VALID_FORMATS.join(', ')}.`);
  }

  const data = quotes.map(q => ({
    date: q.date.toISOString(),
    open: q.open,
    high: q.high,
    low: q.low,
    close: q.close,
    volume: q.volume ?? null,
  }));

  let outputPath;
  if (outputFormat === 'json') {
    outputPath = path.join(outputDir, `${baseName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  } else if (outputFormat === 'ndjson') {
    outputPath = path.join(outputDir, `${baseName}.ndjson`);
    fs.writeFileSync(outputPath, data.map(row => JSON.stringify(row)).join('\n'));
  } else if (outputFormat === 'csv' || outputFormat === 'tsv') {
    const delimiter = outputFormat === 'tsv' ? '\t' : ',';
    outputPath = path.join(outputDir, `${baseName}.${outputFormat}`);
    const columns = ['date', 'open', 'high', 'low', 'close', 'volume'];
    const header = columns.join(delimiter) + '\n';
    const rows = data.map(row => columns.map(c => row[c] ?? '').join(delimiter));
    fs.writeFileSync(outputPath, header + rows.join('\n'));
  }

  console.log(`Wrote ${quotes.length} candles to ${outputPath}`);
  return outputPath;
}

export default fetchCandles;
