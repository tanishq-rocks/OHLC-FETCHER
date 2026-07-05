#!/usr/bin/env node
import { fetchCandles, VALID_TIMEFRAMES, VALID_FORMATS } from './index.js';

function printUsage() {
  console.log(`
Usage:
  node cli.js --symbol=<TICKER> --range=<DURATION> --timeframe=<TF> [options]
  node cli.js --symbol=<TICKER> --start=<DATE> --end=<DATE> --timeframe=<TF> [options]

Required:
  --symbol=AAPL           Asset/ticker name (e.g. AAPL, BTC-USD, RELIANCE.NS)
  --timeframe=1d          Candle size: ${VALID_TIMEFRAMES.join(', ')}

  One of the following date-range options (not both):
  --range=1mo             How far back to fetch: e.g. 7d, 3w, 1mo, 1y, 12h
  --start=2026-01-01      Range start date (requires --end)
  --end=2026-01-31        Range end date, inclusive (requires --start)

Optional:
  --format=csv            Output format: ${VALID_FORMATS.join(', ')} (default: csv)
  --outdir=./output       Output directory (default: ./output)
  --filename=my_data      Custom output file name (without extension)

Examples:
  node cli.js --symbol=AAPL --range=7d --timeframe=5m
  node cli.js --symbol=BTC-USD --range=1y --timeframe=1d --format=json
  node cli.js --symbol=RELIANCE.NS --range=1mo --timeframe=1h --outdir=./data
  node cli.js --symbol=AAPL --start=2026-01-01 --end=2026-01-31 --timeframe=1d --format=tsv
`);
}

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const hasRange = args.range != null;
  const hasDates = args.start != null || args.end != null;

  if (!args.symbol || !args.timeframe || (!hasRange && !hasDates) || (hasRange && hasDates)) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  try {
    await fetchCandles({
      symbol: args.symbol,
      totalTime: args.range,
      startDate: args.start,
      endDate: args.end,
      timeframe: args.timeframe,
      outputFormat: args.format || 'csv',
      outputDir: args.outdir || './output',
      fileName: args.filename,
    });
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
