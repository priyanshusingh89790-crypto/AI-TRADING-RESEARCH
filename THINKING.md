# Thinking Notes — AI Trading Research Assistant

## How the question is interpreted

When a user submits "Does buying NIFTY after a sharp fall work?", the AI performs
structured extraction. It distinguishes what is actually stated, what can be logically
inferred, and what is genuinely missing.

From this specific question:

| Field | Value | Source | Why |
|-------|-------|--------|-----|
| Instrument | NIFTY 50 | **user_provided** | Explicitly named |
| Entry condition | after a sharp fall | **user_provided** | Stated, but ambiguous |
| Timeframe | daily | **inferred** | Implied by NIFTY context |
| Success metric | positive return | **inferred** | Implied by "work" |
| Entry timing | — | **missing** | Not stated |
| Exit condition | — | **missing** | Not stated |
| Holding period | — | **missing** | Not stated |
| Test period | — | **missing** | Not stated |
| Filters | — | **missing** | Not stated |

The application assumes **visible defaults** for test period, transaction cost, and
slippage — these are labelled clearly in the UI and are not represented as user input.

---

## Why "sharp fall" must be clarified

"Sharp fall" is materially ambiguous. A 1% threshold produces ~300 signals over 7
years; a 3% threshold produces ~40. This changes:
- Statistical power and sample size
- Practical tradability (how often the strategy would actually trigger)
- The magnitude of average returns

The AI cannot silently pick a threshold. `parseFallThreshold` returns `null` when
the entry condition contains no recognisable percentage. The engine then raises a
clear error rather than defaulting to any value.

## Why "works" must be clarified

"Works" is equally ambiguous — it could mean average positive return, win rate > 50%,
Sharpe ratio, or beating buy-and-hold. This prototype uses **average return per trade**
as the default success metric, but labels it explicitly. The AI marks successMetric as
`inferred` when the user has not defined it.

## Why entry timing matters

Entering at the same day's close vs the next day's open is a structural difference.
Same-day close entry may use information available only after the trigger candle is
complete. Next-day open entry is the conservative choice. The engine supports both
and requires explicit confirmation — it does not default silently.

---

## Visible defaults vs user-provided values

| Parameter | Source | UI treatment |
|-----------|--------|--------------|
| Test period 2018–2025 | Application default | Amber "assumption" badge, editable |
| Transaction cost 0.10% | Application default | Amber "assumption" badge, editable |
| Slippage 0.05% | Application default | Amber "assumption" badge, editable |
| Instrument (NIFTY) | User provided | Green "user provided" badge |
| Fall threshold | User provided (via clarification) | Green "user provided" badge |
| Holding period | User provided (via clarification) | Green "user provided" badge |

Cost assumptions are labelled *"illustrative prototype assumptions — not calibrated
estimates of actual execution costs."*

---

## Why the LLM must not calculate the backtest

LLMs hallucinate numbers. A model-generated win rate cannot be audited or reproduced.
The deterministic TypeScript engine (`src/lib/backtest/engine.ts`) produces identical
results for identical inputs. Every trade is traceable in the `trades[]` array.

The explanation endpoint (`/api/explain`) receives the exact engine numbers and the
prompt explicitly says *"do not change these numbers."* The AI only interprets — it
does not recalculate.

---

## Non-overlapping trades and cumulative return

The engine enforces non-overlapping trades: after entering a position, no new signal
is accepted until the current holding period has ended. This means at most one
trade is open at any point in time, making the compounded cumulative return
mathematically defensible:

```
capital = 1.0
for each trade in chronological order:
    capital *= (1 + netReturn)
cumulativeReturn = capital - 1   // decimal; 0.064 = +6.4%
```

An overlapping approach would require portfolio-level accounting that is outside
this prototype's scope.

---

## Risks that could produce misleading results

**Look-ahead bias:** The trigger condition uses only the prior day's close. Entry
is strictly at the *next* open (or same day's close — the user's explicit choice).
Exit is the close *after* N full trading days. No future data is used to decide
whether a signal occurred.

**Overfitting / parameter sensitivity:** The fall threshold and holding period were
chosen by the user after seeing the question — any "best" combination found through
parameter exploration is likely optimised to the dataset.

**Synthetic data:** The CSV is generated data, not real exchange prices. It has
broadly realistic distributional properties but will not reproduce the exact
statistics of real NIFTY data. All results are illustrative only.

**Index vs tradable instrument:** NIFTY 50 is an index, not directly tradable. A
real implementation would require specifying a futures contract, ETF, or other
executable proxy and accounting for basis risk, roll costs, and market impact.

**Sample size:** With a 2% threshold over 7 years the dataset might produce 50–100
non-overlapping trades. This is too small for statistical significance at conventional
confidence levels. The result is directional evidence, not proof of an edge.

**Transaction cost simplification:** 0.10% + 0.05% slippage are prototype
assumptions. Real costs depend on instrument, account size, execution venue, and
Indian tax treatment (STT, GST, brokerage).
