# OHLC Fetcher

Fetches historical OHLC (Open/High/Low/Close) candle data for any asset using
[`yahoo-finance2`](https://www.npmjs.com/package/yahoo-finance2), and writes it
to a CSV or JSON file.

## Setup

```bash
cd ohlc-fetcher
npm install
```

## Use as a CLI

```bash
node cli.js --symbol=AAPL --range=7d --timeframe=5m
```

Options:

| Flag          | Required | Description                                                    | Example        |
|---------------|----------|------------------------------------------------------------------|-----------------|
| `--symbol`    | yes      | Ticker/asset name                                                | `AAPL`, `BTC-USD`, `RELIANCE.NS` |
| `--range`     | yes      | How far back to fetch                                            | `7d`, `3w`, `1mo`, `1y`, `12h` |
| `--timeframe` | yes      | Candle size                                                       | `1m`, `5m`, `15m`, `30m`, `1h`, `1d`, `1wk`, `1mo` |
| `--format`    | no       | `csv` (default) or `json`                                        | `json` |
| `--outdir`    | no       | Output folder (default `./output`)                                | `./data` |
| `--filename`  | no       | Custom file name, no extension (default auto-generated)          | `apple_5min` |

More examples:

```bash
node cli.js --symbol=BTC-USD --range=1y --timeframe=1d --format=json
node cli.js --symbol=RELIANCE.NS --range=1mo --timeframe=1h --outdir=./data
node cli.js --symbol=TSLA --range=1d --timeframe=1m
```

## Use as a module in your own code

```js
import { fetchCandles } from './index.js';

const filePath = await fetchCandles({
  symbol: 'AAPL',
  totalTime: '7d',      // or a plain number of days, e.g. 7
  timeframe: '5m',      // 1m, 2m, 5m, 15m, 30m, 60m/1h, 1d, 5d, 1wk, 1mo, 3mo
  outputFormat: 'csv',  // or 'json'
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

**JSON**
```json
[
  { "date": "2026-06-28T09:15:00.000Z", "open": 193.12, "high": 193.55, "low": 192.90, "close": 193.40, "volume": 152300 },
  ...
]
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
