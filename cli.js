#!/usr/bin/env node
import { fetchCandles, VALID_TIMEFRAMES } from './index.js';

function printUsage() {
  console.log(`
Usage:
  node cli.js --symbol=<TICKER> --range=<DURATION> --timeframe=<TF> [options]

Required:
  --symbol=AAPL           Asset/ticker name (e.g. AAPL, BTC-USD, RELIANCE.NS)
  --range=1mo             How far back to fetch: e.g. 7d, 3w, 1mo, 1y, 12h
  --timeframe=1d          Candle size: ${VALID_TIMEFRAMES.join(', ')}

Optional:
  --format=csv            Output format: csv (default) or json
  --outdir=./output       Output directory (default: ./output)
  --filename=my_data      Custom output file name (without extension)

Examples:
  node cli.js --symbol=AAPL --range=7d --timeframe=5m
  node cli.js --symbol=BTC-USD --range=1y --timeframe=1d --format=json
  node cli.js --symbol=RELIANCE.NS --range=1mo --timeframe=1h --outdir=./data
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

  if (!args.symbol || !args.range || !args.timeframe) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  try {
    await fetchCandles({
      symbol: args.symbol,
      totalTime: args.range,
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
