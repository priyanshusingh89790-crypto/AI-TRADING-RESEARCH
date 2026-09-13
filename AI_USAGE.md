# AI Usage

## Model and provider

- **Runtime AI:** Google Gemini (`gemini-3.6-flash`) via `@google/genai` SDK
- **Development assistant:** Kiro AI coding assistant

The model name above matches the constant `MODEL = "gemini-3.6-flash"` in
`src/lib/ai/gemini.ts`. Do not document a different model than the one in use.

---

## What AI is used for at runtime

| Step | Function | What AI does |
|------|----------|--------------|
| ASK | `analyzeResearchQuestion()` | Interprets the natural-language question, extracts fields, classifies each as `user_provided` / `inferred` / `missing`, generates clarification questions |
| CLARIFY | — | AI output from the previous step drives the clarification UI |
| DEFINE | `buildExperiment()` | Converts clarified answers into a structured `Experiment` JSON object |
| TEST | *(no AI)* | The deterministic TypeScript backtest engine calculates all numerical results — Gemini is not involved in this step |
| LEARN | `explainBacktest()` | Receives the exact backtest numbers and provides cautious interpretation only — it does not change or invent any numbers |

**Gemini does not calculate the backtest.** Win rate, average return, cumulative
return, and all other statistics are produced exclusively by
`src/lib/backtest/engine.ts`.

---

## What AI was used for during development

- Architecture brainstorming (ASK → CLARIFY → DEFINE → TEST → LEARN workflow)
- Prompt design — iterating on system instructions for structured JSON output
- Component scaffolding
- Backtest engine logic (look-ahead bias avoidance, non-overlapping trades)
- Debugging TypeScript and Zod v4 API differences
- Code review (silent fallback identification, filter validation)

---

## Key product decisions made by the developer

**1. Deterministic engine for all numerical results.**
The most important decision. AI-generated numbers cannot be audited. The TypeScript
engine produces identical results for identical inputs and every trade is
traceable in the `trades[]` array.

**2. Strict structured JSON + Zod validation.**
Gemini returns JSON constrained by `responseMimeType: "application/json"` and the
prompt schema. This output is then validated server-side with Zod before reaching
the frontend. Both layers are kept — Zod is the application's runtime boundary.

**3. No silent fallbacks.**
`parseFallThreshold` returns `null` when unparseable. `parseEntryTiming` returns
`null` for unrecognised timing strings. Both trigger clear user-facing errors rather
than silently defaulting to any value.

**4. Non-overlapping trades.**
After entering a trade the engine skips to the exit date before scanning for the
next signal. This makes the compounded cumulative return calculation defensible.

**5. Visible assumptions, not silent defaults.**
Test period (2018–2025), transaction cost (0.10%), and slippage (0.05%) are labelled
as illustrative prototype assumptions in amber UI badges. They are editable and never
presented as user-provided values.

**6. Daily timeframe only.**
The prototype explicitly rejects weekly/intraday experiments rather than silently
reinterpreting them as daily.

**7. Synthetic data with unambiguous disclosure.**
Every surface that shows results includes a clear disclaimer that the data is
synthetic and the results are illustrative — not real NIFTY market performance.

---

## AI suggestions rejected or modified

- **Streaming responses** — rejected; adds complexity without benefit for this scope.
- **Chart libraries (recharts, chart.js)** — replaced with a lightweight SVG sparkline.
- **Redux / Zustand** — rejected; `useState` is sufficient for a single-page prototype.
- **Multi-agent architecture** — rejected; one prompt per step is simpler and auditable.
- **Default 1% fallback in parseFallThreshold** — removed; replaced with strict null + error.
- **Default `next_open` for unrecognised timing** — removed; replaced with strict null + error.
