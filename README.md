# AI Trading Research Assistant

An internship prototype demonstrating how an AI system can take an ambiguous
natural-language market question, clarify it, convert it into a structured experiment,
run a deterministic backtest on a synthetic dataset, and explain the evidence.

**Primary demo question:** *"Does buying NIFTY after a sharp fall work?"*

> **Important:** This prototype uses a **synthetic demo dataset**, not real exchange
> data. All results are illustrative and are not evidence of actual NIFTY performance.

---

## Workflow

```
ASK → CLARIFY → DEFINE → TEST → LEARN
```

1. **ASK** — Enter a natural-language market research question.
2. **CLARIFY** — The AI extracts what you stated, what it inferred, and what is
   missing. Answer minimal clarification questions (e.g. "What counts as a sharp
   fall?"). All fields are labelled as `user_provided`, `inferred`, or `missing`.
3. **DEFINE** — The AI builds a structured `Experiment` object. Review and adjust
   the visible assumptions (test period, transaction cost, slippage) before running.
4. **TEST** — A deterministic TypeScript engine runs on the local CSV dataset and
   returns exact statistics. No AI is involved in this calculation.
5. **LEARN** — The AI interprets the numbers (without changing them), states
   limitations, and suggests follow-up research questions.

---

## Architecture

```
Frontend (React, Tailwind CSS)
    ↓ POST /api/analyze
Next.js API route → Gemini (gemini-3.6-flash)
    Returns: structured ResearchAnalysis (JSON, Zod-validated)
    ↓
Clarification UI → user answers
    ↓ POST /api/experiment
Next.js API route → Gemini
    Returns: structured Experiment (JSON, Zod-validated)
    ↓
Experiment review → user edits assumptions
    ↓ POST /api/backtest
Deterministic TypeScript engine (src/lib/backtest/engine.ts)
    Reads: src/data/nifty.csv (synthetic demo data)
    Returns: exact BacktestResult — no AI involved
    ↓ POST /api/explain
Next.js API route → Gemini
    Receives: exact numerical results (read-only)
    Returns: ResearchConclusion (JSON, Zod-validated)
    ↓
Results + Learn UI
```

All Gemini calls are server-side only. The API key never reaches the browser.

---

## Technology

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Validation | Zod v4 |
| AI provider | Google Gemini (`gemini-3.6-flash`) via `@google/genai` |
| Data | `src/data/nifty.csv` — synthetic demo dataset |
| State | React `useState` — no external state library |

---

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Create environment file**
```bash
cp .env.local.example .env.local
```
Edit `.env.local` and add your Gemini API key:
```
GEMINI_API_KEY=your_key_here
```
Get a free key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

**3. Start the development server**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Important design decisions

### User-provided vs inferred vs missing
Every field extracted by the AI is tagged with its source. A field is only
`user_provided` if the user explicitly stated it. `inferred` means logically implied.
`missing` means it must be clarified. The engine never silently invents a value.

### Visible assumptions — not silent defaults
Test period (2018–2025), transaction cost (0.10%), and slippage (0.05%) are
application-level defaults shown in amber "Assumption" badges. They are editable
before running and are never labelled as user-provided. They are described as
*"illustrative prototype assumptions — not calibrated estimates of actual
execution costs."*

### Deterministic backtesting — AI does not calculate results
`src/lib/backtest/engine.ts` is pure TypeScript with no external calls. Same inputs
always produce same outputs. Win rate, average return, and all statistics come from
the engine. Gemini only receives the final numbers to interpret.

### Non-overlapping trades
After entering a trade, the engine skips to the exit date before scanning for the
next signal. At most one position is open at any time. This makes the compounded
cumulative return calculation mathematically sound.

### No silent fallbacks
`parseFallThreshold` returns `null` — not a default — when the condition contains no
recognisable percentage. `parseEntryTiming` returns `null` for unsupported timings.
Both cause a clear user-facing error rather than silently running a wrong experiment.

### Synthetic demo dataset
`src/data/nifty.csv` is generated data (~2,088 trading days, 2018–2025). It is not
real exchange data. Every results screen displays a disclaimer.

### Daily timeframe only
The dataset and engine support daily data only. Weekly and intraday experiments are
rejected with a clear error message before reaching the engine.

### Unsupported filters rejected
This prototype does not implement conditional filters (volatility, trend, RSI, etc.).
If an experiment includes filters, it is rejected with a clear message. The experiment
shown to the user and the experiment actually tested are always the same.

### Index vs tradable instrument
NIFTY 50 is an index price series, not directly tradable. Results are a research
signal — not evidence of achievable returns. A production system would specify a
tradable proxy (futures contract, ETF) and account for basis risk and roll costs.

---

## About the data

`src/data/nifty.csv` — **synthetic demo data** generated to represent realistic
NIFTY-like price behaviour (~2,088 trading days, 2018–2025). It is **not** real
exchange data. Do not use these results as investment evidence.

---

## Limitations

This is an internship research prototype — not a production trading system:

- Uses synthetic demo data, not real validated market data
- Covers NIFTY 50 index prices, not a directly tradable instrument
- Daily timeframe only — no weekly or intraday support
- No benchmark comparison or statistical significance testing
- Transaction costs are illustrative assumptions only
- No tax, regulatory, or order execution modelling
- Makes no investment recommendations

---

## Future improvements

- Real validated NIFTY OHLC data from a reliable source
- Tradable instrument proxy (futures, ETF) with basis and roll modelling
- Statistical significance testing (t-test, bootstrap confidence intervals)
- Benchmark comparison (strategy vs buy-and-hold)
- Walk-forward / out-of-sample validation
- Richer filter support (volatility regime, trend filter, volume)
- Parameter sensitivity analysis (threshold vs holding period heatmap)
- Experiment history and side-by-side comparison
- Robustness testing across multiple instruments and markets
- Uncertainty quantification in AI interpretation
# AI-TRADING-RESEARCH
