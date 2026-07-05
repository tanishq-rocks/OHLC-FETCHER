# OHLC Fetcher — Historical OHLCV / Candlestick Data Downloader (Stocks, Crypto, Forex, ETFs, Futures)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)

A free, open-source **command-line tool and Node.js library** to download historical
**OHLC / OHLCV (Open, High, Low, Close, Volume) candlestick data** for any
**stock, cryptocurrency, ETF, index, or futures contract** listed on
[Yahoo Finance](https://finance.yahoo.com), via
[`yahoo-finance2`](https://www.npmjs.com/package/yahoo-finance2), and export it to
**CSV, TSV, JSON, or NDJSON** — ready for Excel, pandas, Python/R backtesting,
trading bots, or quantitative research.

**Use it to:**
- Download historical stock market data (`AAPL`, `TSLA`, `RELIANCE.NS`, ...)
- Fetch cryptocurrency price history (`BTC-USD`, `ETH-USD`, ...)
- Pull intraday or daily candlestick/OHLCV data for backtesting trading strategies
- Export market data to CSV/JSON for Excel, Google Sheets, pandas, or a database
- Get historical price data for a custom date range or a rolling lookback window

## Setup

```bash
cd ohlc-fetcher
npm install
```

## Use as a CLI

```bash
node cli.js --symbol=AAPL --range=7d --timeframe=5m
# or fetch an explicit date range instead of --range
node cli.js --symbol=AAPL --start=2026-01-01 --end=2026-01-31 --timeframe=1d
```

Options:

| Flag          | Required | Description                                                    | Example        |
|---------------|----------|------------------------------------------------------------------|-----------------|
| `--symbol`    | yes      | Ticker/asset name                                                | `AAPL`, `BTC-USD`, `RELIANCE.NS` |
| `--range`     | one of `--range` or `--start`+`--end` | How far back to fetch                    | `7d`, `3w`, `1mo`, `1y`, `12h` |
| `--start`     | one of `--range` or `--start`+`--end` | Range start date (needs `--end`)         | `2026-01-01` |
| `--end`       | one of `--range` or `--start`+`--end` | Range end date, inclusive (needs `--start`) | `2026-01-31` |
| `--timeframe` | yes      | Candle size                                                       | `1m`, `5m`, `15m`, `30m`, `1h`, `1d`, `1wk`, `1mo` |
| `--format`    | no       | `csv` (default), `tsv`, `json`, or `ndjson`                       | `ndjson` |
| `--outdir`    | no       | Output folder (default `./output`)                                | `./data` |
| `--filename`  | no       | Custom file name, no extension (default auto-generated)          | `apple_5min` |

`--range` and `--start`/`--end` are mutually exclusive — use one or the other.

More examples:

```bash
node cli.js --symbol=BTC-USD --range=1y --timeframe=1d --format=json
node cli.js --symbol=RELIANCE.NS --range=1mo --timeframe=1h --outdir=./data
node cli.js --symbol=TSLA --range=1d --timeframe=1m
node cli.js --symbol=AAPL --start=2026-01-01 --end=2026-01-31 --timeframe=1d --format=tsv
```

## Use as a module in your own code

```js
import { fetchCandles } from './index.js';

const filePath = await fetchCandles({
  symbol: 'AAPL',
  totalTime: '7d',       // or a plain number of days, e.g. 7 (mutually exclusive with startDate/endDate)
  // startDate: '2026-01-01', endDate: '2026-01-31', // alternative to totalTime
  timeframe: '5m',       // 1m, 2m, 5m, 15m, 30m, 60m/1h, 1d, 5d, 1wk, 1mo, 3mo
  outputFormat: 'csv',   // 'csv', 'tsv', 'json', or 'ndjson'
  outputDir: './output',
});

console.log('Saved to', filePath);
```

## Output format

**CSV**
```
date,open,high,low,close,volume
2026-06-28T09:15:00.000Z,193.12,193.55,192.90,193.40,152300
...
```

**TSV**

Same columns as CSV, tab-delimited.

**JSON**
```json
[
  { "date": "2026-06-28T09:15:00.000Z", "open": 193.12, "high": 193.55, "low": 192.90, "close": 193.40, "volume": 152300 },
  ...
]
```

**NDJSON** (newline-delimited JSON — one object per line, handy for streaming/piping)
```
{"date":"2026-06-28T09:15:00.000Z","open":193.12,"high":193.55,"low":192.90,"close":193.40,"volume":152300}
{"date":"2026-06-28T09:20:00.000Z", ...}
```

## Important notes on Yahoo Finance's limits

Yahoo restricts how far back you can pull data depending on candle size.
The script automatically clamps your requested range and prints a warning
if you ask for more than is available:

| Timeframe        | Max lookback     |
|-------------------|-----------------|
| 1m                 | ~7 days          |
| 2m/5m/15m/30m/90m  | ~60 days         |
| 60m / 1h           | ~730 days (2 yrs)|
| 1d / 1wk / 1mo / 3mo | effectively unlimited |

Other notes:
- Symbols must match Yahoo Finance's ticker format (e.g. Indian stocks need
  a `.NS`/`.BO` suffix, crypto uses `-USD` like `BTC-USD`).
- Intraday timestamps are in the exchange's local time as returned by Yahoo
  (converted to ISO 8601/UTC in the output file).
- `yahoo-finance2` uses an unofficial API, so heavy/rapid querying may get
  rate-limited — space out large batch requests.
- If you get a "No data found" error or aren't sure of the exact ticker,
  look it up on [Yahoo Finance](https://finance.yahoo.com) by searching for
  the asset name in the search bar — the symbol shown there is the one to
  pass to `--symbol`. Not every asset has a Yahoo ticker (e.g. spot forex
  pairs like `XAUUSD` usually don't); a related future or ETF (e.g. `GC=F`
  for gold) may be listed instead.
