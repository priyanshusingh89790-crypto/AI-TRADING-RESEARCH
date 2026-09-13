/**
 * Deterministic TypeScript backtesting engine.
 * This module does NOT call any AI/LLM. All calculations are pure math.
 *
 * Dataset note: src/data/nifty.csv is SYNTHETIC DEMO DATA generated to
 * represent realistic NIFTY-like price behaviour. It is NOT real historical
 * data from an exchange. Results are illustrative only.
 *
 * Supported strategy:
 *   - Instrument: NIFTY 50 (index price series, not a tradable instrument)
 *   - Timeframe: daily only
 *   - Entry trigger: daily close falls by ≥ X% from previous day's close
 *   - Entry timing: next trading day's open  OR  same day's close
 *   - Exit: close after N trading days (holding period)
 *
 * Trade overlap policy:
 *   Trades are NON-OVERLAPPING. After entering a trade, the engine does not
 *   look for the next signal until the current trade has fully exited. This
 *   makes the compounded cumulative return calculation defensible — at most
 *   one trade is open at any point in time.
 *
 * Cumulative return:
 *   Starts at capital = 1.0. Each completed trade compounds:
 *     capital *= (1 + netReturn)
 *   Reported as: capital - 1  (decimal; multiply by 100 for %)
 *   All internal return values are decimals (0.0064 = +0.64%).
 */

import * as fs from "fs";
import * as path from "path";
import type { Experiment, BacktestResult, Trade } from "@/src/types/experiment";

// ─── Supported instruments and timeframes ─────────────────────────────────────

/** Instruments whose data is available in this prototype. */
const SUPPORTED_INSTRUMENTS = ["nifty 50", "nifty50", "nifty"];

/** Only daily timeframe is supported by the supplied dataset. */
const SUPPORTED_TIMEFRAME = "daily";

/**
 * Filters that can be reliably applied by this engine.
 * An empty array means "no filters" — always supported.
 * Any non-empty filter list is rejected unless every filter is in this set.
 */
const SUPPORTED_FILTERS: string[] = [];
// Extend this array when the engine gains real filter support.

// ─── CSV parsing ──────────────────────────────────────────────────────────────

interface DayRecord {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
}

function loadNiftyData(): DayRecord[] {
  const csvPath = path.join(process.cwd(), "src", "data", "nifty.csv");

  if (!fs.existsSync(csvPath)) {
    throw new Error(
      `NIFTY demo data file not found at ${csvPath}. ` +
        "Please ensure src/data/nifty.csv exists."
    );
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("NIFTY CSV file is empty or has no data rows.");
  }

  const records: DayRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length < 5) continue;

    const [date, openStr, highStr, lowStr, closeStr] = parts;
    const open = parseFloat(openStr);
    const high = parseFloat(highStr);
    const low = parseFloat(lowStr);
    const close = parseFloat(closeStr);

    if (isNaN(open) || isNaN(close) || !date) continue;

    records.push({ date: date.trim(), open, high, low, close });
  }

  if (records.length === 0) {
    throw new Error("No valid records found in NIFTY demo CSV file.");
  }

  records.sort((a, b) => a.date.localeCompare(b.date));
  return records;
}

// ─── Parameter parsers (strict — no silent fallbacks) ────────────────────────

/**
 * Parse the percentage fall threshold from an entry condition string.
 * Returns null if no recognisable percentage can be extracted.
 * Does NOT default to any value — the caller must handle null explicitly.
 *
 * Recognises patterns like: "1%", "2.5%", "falls by 2%", "≥ 1%", ">= 3%"
 */
function parseFallThreshold(condition: string): number | null {
  const match = condition.match(/([\d.]+)\s*%/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  if (isNaN(val) || val <= 0 || val >= 50) return null;
  return val / 100; // decimal representation
}

/**
 * Parse entry timing from the timing string.
 * Returns null if the timing cannot be mapped to a supported option.
 * Does NOT default silently.
 *
 * Supported:
 *   "next_open"  — next trading day's open (default explicit choice)
 *   "same_close" — same day's close
 */
function parseEntryTiming(timing: string): "next_open" | "same_close" | null {
  const lower = timing.toLowerCase();

  if (
    lower.includes("next") ||
    lower.includes("open") ||
    lower.includes("following")
  ) {
    return "next_open";
  }

  if (lower.includes("same") && lower.includes("close")) {
    return "same_close";
  }

  if (lower.includes("close") && !lower.includes("same")) {
    // "same day's close" vs just "close" — treat bare "close" as same_close
    return "same_close";
  }

  return null;
}

// ─── Pre-run validation ───────────────────────────────────────────────────────

/**
 * Validate all experiment parameters before the engine runs.
 * Throws a descriptive error for any unsupported or invalid value.
 * This is a defence-in-depth check — the API route also validates via Zod.
 */
function validateExperiment(experiment: Experiment): void {
  // Instrument check
  const instrumentLower = experiment.instrument.toLowerCase();
  if (!SUPPORTED_INSTRUMENTS.some((s) => instrumentLower.includes(s))) {
    throw new Error(
      `Instrument "${experiment.instrument}" is not supported by this prototype. ` +
        "Currently supported: NIFTY 50."
    );
  }

  // Timeframe check
  if (experiment.timeframe !== SUPPORTED_TIMEFRAME) {
    throw new Error(
      `Timeframe "${experiment.timeframe}" is not supported. ` +
        "This prototype currently supports daily NIFTY experiments only. " +
        "Please choose a daily timeframe."
    );
  }

  // Entry condition — must parse to a usable threshold
  const threshold = parseFallThreshold(experiment.entry.condition);
  if (threshold === null) {
    throw new Error(
      "The entry condition could not be converted into a supported percentage threshold. " +
        "Please revise the experiment — the condition must include a percentage such as '1%' or '2.5%'."
    );
  }

  // Entry timing — must be a supported option
  const timing = parseEntryTiming(experiment.entry.timing);
  if (timing === null) {
    throw new Error(
      `Entry timing "${experiment.entry.timing}" is not supported. ` +
        "Supported options: 'Next trading day's open' or 'Same day's close'."
    );
  }

  // Filters — only empty filters are supported in this prototype
  const unsupported = experiment.filters.filter(
    (f) => !SUPPORTED_FILTERS.includes(f.toLowerCase())
  );
  if (unsupported.length > 0) {
    throw new Error(
      `The following filter(s) cannot be applied by this prototype's backtest engine: ` +
        `${unsupported.map((f) => `"${f}"`).join(", ")}. ` +
        "This prototype supports experiments without additional filters. " +
        "Please remove unsupported filters before running."
    );
  }

  // Holding period
  const holdingDays =
    experiment.holdingPeriod.unit === "weeks"
      ? experiment.holdingPeriod.value * 5
      : experiment.holdingPeriod.value;
  if (holdingDays < 1) {
    throw new Error("Holding period must be at least 1 trading day.");
  }

  // Dates
  if (!experiment.testPeriod.start || !experiment.testPeriod.end) {
    throw new Error("Test period start and end dates are required.");
  }
  if (experiment.testPeriod.start >= experiment.testPeriod.end) {
    throw new Error("Test period start date must be before end date.");
  }

  // Cost assumptions
  if (experiment.assumptions.transactionCost < 0) {
    throw new Error("Transaction cost cannot be negative.");
  }
  if (experiment.assumptions.slippage < 0) {
    throw new Error("Slippage cannot be negative.");
  }
}

// ─── Main backtest function ───────────────────────────────────────────────────

/**
 * Run the deterministic backtest for the given experiment.
 *
 * Trade overlap: NON-OVERLAPPING. The engine skips to the day after a trade
 * exits before looking for the next signal. This ensures the compounded
 * cumulative return reflects at most one open position at a time.
 *
 * Zero-trade result: If no qualifying signals are found (or none have a valid
 * exit within the dataset), returns a zero-trade result rather than throwing.
 * The caller/UI should display an appropriate message.
 */
export function runBacktest(experiment: Experiment): BacktestResult {
  // ── Validate inputs ──────────────────────────────────────────────────────
  validateExperiment(experiment);

  // ── Load data ────────────────────────────────────────────────────────────
  const data = loadNiftyData();
  if (data.length < 10) {
    throw new Error("Insufficient demo data to run backtest.");
  }

  const { testPeriod, holdingPeriod, assumptions, entry } = experiment;

  // Filter to test period for signal detection
  const filtered = data.filter(
    (d) => d.date >= testPeriod.start && d.date <= testPeriod.end
  );

  if (filtered.length < 10) {
    throw new Error(
      `No demo data found for the test period ${testPeriod.start} to ${testPeriod.end}. ` +
        "The synthetic dataset covers 2018–2025."
    );
  }

  // These are guaranteed non-null after validateExperiment
  const fallThreshold = parseFallThreshold(entry.condition)!;
  const entryTiming = parseEntryTiming(entry.timing)!;

  const holdingDays =
    holdingPeriod.unit === "weeks"
      ? holdingPeriod.value * 5
      : holdingPeriod.value;

  // Round-trip cost applied to each trade
  const costPerTrade = (assumptions.transactionCost + assumptions.slippage) * 2;

  // Index of dates in the full dataset for O(1) lookup
  const dateIndex = new Map<string, number>();
  data.forEach((d, i) => dateIndex.set(d.date, i));

  const trades: Trade[] = [];

  // Track the earliest date we can consider a new signal
  // (non-overlapping: after current trade exits)
  let minNextSignalDate = "";

  // ── Signal scan ──────────────────────────────────────────────────────────
  for (let i = 1; i < filtered.length; i++) {
    const today = filtered[i];
    const yesterday = filtered[i - 1];

    // Non-overlapping: skip until the previous trade has exited
    if (minNextSignalDate && today.date <= minNextSignalDate) continue;

    // Trigger: today's close fell >= threshold from yesterday's close
    const priceChange = (today.close - yesterday.close) / yesterday.close;
    if (priceChange > -fallThreshold) continue;

    // ── Determine entry ──────────────────────────────────────────────────
    let entryDate: string;
    let entryPrice: number;

    if (entryTiming === "same_close") {
      entryDate = today.date;
      entryPrice = today.close;
    } else {
      // next_open: enter at the next calendar trading day's open
      const todayIdx = dateIndex.get(today.date);
      if (todayIdx === undefined || todayIdx + 1 >= data.length) continue;

      const nextDay = data[todayIdx + 1];
      entryDate = nextDay.date;
      entryPrice = nextDay.open;
    }

    // Apply slippage on entry (adverse: price is worse by slippage)
    const adjustedEntryPrice = entryPrice * (1 + assumptions.slippage);

    // ── Determine exit ────────────────────────────────────────────────────
    const entryDataIdx = dateIndex.get(entryDate);
    if (entryDataIdx === undefined) continue;

    const exitDataIdx = entryDataIdx + holdingDays;
    if (exitDataIdx >= data.length) {
      // Not enough data for a full hold — skip this signal
      continue;
    }

    const exitDay = data[exitDataIdx];
    // Apply slippage on exit (adverse: price is worse by slippage)
    const adjustedExitPrice = exitDay.close * (1 - assumptions.slippage);

    // ── Net return ────────────────────────────────────────────────────────
    const grossReturn =
      (adjustedExitPrice - adjustedEntryPrice) / adjustedEntryPrice;
    const netReturn = grossReturn - costPerTrade; // decimal

    trades.push({
      entryDate,
      entryPrice: adjustedEntryPrice,
      exitDate: exitDay.date,
      exitPrice: adjustedExitPrice,
      returnPct: netReturn,
      triggerReturn: priceChange,
    });

    // Advance the non-overlapping cursor: next signal only after this exit
    minNextSignalDate = exitDay.date;
  }

  // ── Zero-trade result (no crash, no NaN) ─────────────────────────────────
  if (trades.length === 0) {
    return {
      tradeCount: 0,
      averageReturn: 0,
      medianReturn: 0,
      winRate: 0,
      bestTrade: 0,
      worstTrade: 0,
      cumulativeReturn: 0,
      trades: [],
    };
  }

  // ── Aggregate statistics ──────────────────────────────────────────────────
  const returns = trades.map((t) => t.returnPct);
  const n = returns.length;

  const averageReturn = returns.reduce((s, r) => s + r, 0) / n;

  const sorted = [...returns].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const medianReturn =
    n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

  const winRate = returns.filter((r) => r > 0).length / n;
  const bestTrade = Math.max(...returns);
  const worstTrade = Math.min(...returns);

  // Non-overlapping compounded cumulative return: capital starts at 1.0
  // Each trade compounds sequentially; result is (capital - 1) in decimal form.
  let capital = 1.0;
  for (const r of returns) {
    capital *= 1 + r;
  }
  const cumulativeReturn = capital - 1; // decimal; 0.064 = +6.4%

  return {
    tradeCount: n,
    averageReturn,
    medianReturn,
    winRate,
    bestTrade,
    worstTrade,
    cumulativeReturn,
    trades,
  };
}
